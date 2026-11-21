import { useEffect, useRef, useState } from 'react';
import { Headphones, Mic, MicOff, Radio, Volume2 } from 'lucide-react';

function wavFromBuffer(buffer) {
  const channels = buffer.numberOfChannels, frames = buffer.length, bytes = 44 + frames * channels * 2;
  const out = new ArrayBuffer(bytes), view = new DataView(out);
  const write = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  write(0, 'RIFF'); view.setUint32(4, bytes - 8, true); write(8, 'WAVE'); write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true); view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * 2, true); view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, frames * channels * 2, true);
  let offset = 44;
  for (let i = 0; i < frames; i++) for (let channel = 0; channel < channels; channel++) { const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i])); view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true); offset += 2; }
  return new Blob([out], { type: 'audio/wav' });
}
function pcmToWav(base64, mimeType) {
  const match = mimeType.match(/rate=(\d+)/), rate = Number(match?.[1] || 24000);
  const binary = atob(base64), pcm = new Int16Array(binary.length / 2);
  for (let i = 0; i < pcm.length; i++) pcm[i] = (binary.charCodeAt(i * 2) & 255) | (binary.charCodeAt(i * 2 + 1) << 8);
  const out = new ArrayBuffer(44 + pcm.length * 2), view = new DataView(out), write = (off, str) => [...str].forEach((c, i) => view.setUint8(off + i, c.charCodeAt(0)));
  write(0, 'RIFF'); view.setUint32(4, out.byteLength - 8, true); write(8, 'WAVE'); write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, pcm.length * 2, true); new Uint8Array(out, 44).set(new Uint8Array(pcm.buffer));
  return new Blob([out], { type: 'audio/wav' });
}

export default function VoiceOnlyChat({ language, demoMode = false }) {
  const [recording, setRecording] = useState(false), [busy, setBusy] = useState(false), [status, setStatus] = useState('Ready when you are'), [error, setError] = useState('');
  const recorder = useRef(null), chunks = useRef([]), stream = useRef(null), audioRef = useRef(null), context = useRef(null), objectUrl = useRef(null);
  useEffect(() => () => { stream.current?.getTracks().forEach(track => track.stop()); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); context.current?.close(); }, []);
  async function start() {
    if (demoMode) {
      const replies = { English: 'For tomato leaf spots, remove badly affected leaves, keep foliage dry, and ask a local crop advisor to confirm the cause before applying any treatment.', Tamil: 'தக்காளி இலைகளில் புள்ளிகள் இருந்தால், பாதிக்கப்பட்ட இலைகளை அகற்றி, இலைகளை ஈரமாக்காமல் பார்த்துக் கொள்ளுங்கள். எந்த மருந்தையும் பயன்படுத்துவதற்கு முன் உள்ளூர் வேளாண் ஆலோசகரிடம் உறுதிப்படுத்துங்கள்.', Hindi: 'टमाटर की पत्तियों पर धब्बे हों तो प्रभावित पत्तियाँ हटाएँ और पत्तियों को गीला होने से बचाएँ। किसी भी उपचार से पहले स्थानीय कृषि विशेषज्ञ से पुष्टि करें।', Telugu: 'టమాటా ఆకులపై మచ్చలు ఉంటే, బాగా దెబ్బతిన్న ఆకులను తొలగించి ఆకులు తడవకుండా చూసుకోండి. ఏ చికిత్సకైనా ముందు స్థానిక వ్యవసాయ నిపుణుడిని సంప్రదించండి.' };
      const utterance = new SpeechSynthesisUtterance(replies[language] || replies.English);
      utterance.lang = ({ English: 'en-IN', Tamil: 'ta-IN', Hindi: 'hi-IN', Telugu: 'te-IN' })[language] || 'en-IN';
      utterance.onstart = () => { setStatus('Playing spoken demo answer'); setBusy(true); };
      utterance.onend = () => { setStatus('Ready when you are'); setBusy(false); };
      utterance.onerror = () => { setError('This browser could not play the spoken demo. Try a browser with speech support.'); setStatus('Ready when you are'); setBusy(false); };
      setError(''); setBusy(true); setStatus('Preparing spoken demo answer…');
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance);
      return;
    }
    setError(''); setStatus('Listening…');
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.current = media;
      const instance = new MediaRecorder(media); recorder.current = instance; chunks.current = [];
      instance.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
      instance.onstop = send; instance.start(); setRecording(true);
    } catch { setError('Microphone access is needed to ask a voice question.'); setStatus('Ready when you are'); }
  }
  function stop() { recorder.current?.stop(); stream.current?.getTracks().forEach(track => track.stop()); setRecording(false); setBusy(true); setStatus('Preparing your question…'); }
  async function send() {
    try {
      const sourceBlob = new Blob(chunks.current, { type: recorder.current?.mimeType || 'audio/webm' });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      context.current = new AudioContextClass();
      const decoded = await context.current.decodeAudioData(await sourceBlob.arrayBuffer());
      const wav = wavFromBuffer(decoded);
      const body = new FormData(); body.append('audio', wav, 'question.wav'); body.append('language', language);
      setStatus('Listening for an answer…');
      const response = await fetch('/api/voice-chat', { method: 'POST', body }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Voice reply could not be created.');
      const reply = pcmToWav(data.audio, data.mimeType);
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); objectUrl.current = URL.createObjectURL(reply); audioRef.current.src = objectUrl.current;
      await audioRef.current.play(); setStatus('Here’s your spoken answer');
    } catch (err) { setError(err.message || 'Could not process the recording. Try again.'); setStatus('Ready when you are'); }
    finally { setBusy(false); }
  }
  return <div className="voice-card"><div className="voice-card-top"><div className="voice-card-icon"><Headphones size={20}/></div><span className="voice-label"><span className="live-dot"/> VOICE ONLY</span></div><div className={`sound-wave ${recording || busy ? 'wave-active' : ''}`} aria-hidden="true">{Array.from({ length: 31 }, (_, i) => <i key={i} style={{ '--bar': `${8 + ((i * 17 + 31) % 29)}px`, '--delay': `${i * 23}ms` }}/>)}</div><div className="voice-status">{status}</div><button className={`record-button ${recording ? 'recording' : ''}`} disabled={busy} onClick={recording ? stop : start} aria-label={recording ? 'Stop recording' : 'Start voice question'}>{busy ? <span className="spinner"/> : recording ? <MicOff size={20}/> : <Mic size={20}/>}</button><div className="record-hint">{recording ? 'Tap to finish your question' : busy ? 'One moment…' : 'Tap to ask a question'}</div>{error && <div className="voice-error">{error}</div>}<div className="voice-foot"><Volume2 size={14}/> Replies are spoken aloud, with no transcript displayed.</div><audio ref={audioRef} className="audio-hidden" onEnded={() => setStatus('Ready when you are')}/></div>;
}
