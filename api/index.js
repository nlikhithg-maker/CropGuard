import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const LANGUAGES = { English: 'English', Tamil: 'Tamil', Hindi: 'Hindi', Telugu: 'Telugu' };
const apiKey = () => process.env.GEMINI_API_KEY;
function textModel() {
  const configured = (process.env.GEMINI_MODEL || '').replace(/^models\//, '').trim();
  return !configured || /^gemini-2\.5-flash(?:$|-)/i.test(configured) ? 'gemini-3.8-flash' : configured;
}
function ttsModel() {
  const configured = (process.env.GEMINI_TTS_MODEL || '').replace(/^models\//, '').trim();
  return !configured || /^gemini-2\.5-flash-preview-tts$/i.test(configured) ? 'gemini-3.1-flash-tts-preview' : configured;
}
async function geminiInteraction(model, input, options = {}) {
  const key = apiKey();
  if (!key) { const err = new Error('AI features need a GEMINI_API_KEY. Add it to .env and restart the server.'); err.status = 503; throw err; }
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key, 'Api-Revision': '2026-05-20' }, body: JSON.stringify({ model, input, store: false, ...options }) });
  const data = await response.json();
  if (!response.ok) { const err = new Error(data?.error?.message || 'AI service request failed.'); err.status = response.status; throw err; }
  const interaction = data.interaction || data;
  const outputSteps = [...(interaction.steps || []), ...(interaction.output || [])];
  const outputText = interaction.output_text || outputSteps
    .filter(step => step.type === 'model_output' || step.type === 'text')
    .flatMap(step => Array.isArray(step.content) ? step.content : [])
    .filter(part => part.type === 'text' || typeof part.text === 'string')
    .map(part => part.text || '')
    .join('');
  return { ...interaction, output_text: outputText };
}
async function geminiGenerateContent(model, body) {
  const key = apiKey();
  if (!key) { const err = new Error('AI features need a GEMINI_API_KEY. Add it to .env and restart the server.'); err.status = 503; throw err; }
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) { const err = new Error(data?.error?.message || 'AI service request failed.'); err.status = response.status; throw err; }
  return data;
}

app.get('/api/health', (_req, res) => res.json({ ok: true, aiConfigured: Boolean(apiKey()) }));

app.get('/api/climate-risk', async (req, res, next) => {
  try {
    const fallbackLat = Number(process.env.DEFAULT_LATITUDE || 11.0168);
    const fallbackLon = Number(process.env.DEFAULT_LONGITUDE || 76.9558);
    const lat = Number(req.query.lat ?? fallbackLat), lon = Number(req.query.lon ?? fallbackLon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return res.status(400).json({ error: 'Provide valid latitude and longitude.' });
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({ latitude: String(lat), longitude: String(lon), current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m', daily: 'precipitation_probability_max,precipitation_sum,temperature_2m_max,temperature_2m_min,uv_index_max', timezone: 'auto', forecast_days: '3' });
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather service is temporarily unavailable.');
    const weather = await response.json();
    const current = weather.current;
    const humidityRisk = current.relative_humidity_2m >= 80;
    const wetRisk = (weather.daily?.precipitation_probability_max?.[0] || 0) >= 60;
    const heatRisk = current.temperature_2m >= 35;
    const riskScore = Number(humidityRisk) + Number(wetRisk) + Number(heatRisk);
    res.json({ location: { latitude: lat, longitude: lon, timezone: weather.timezone }, current, daily: weather.daily, risk: riskScore >= 2 ? 'elevated' : riskScore === 1 ? 'watch' : 'low', riskFactors: [humidityRisk && 'high humidity', wetRisk && 'rain likely', heatRisk && 'heat stress'].filter(Boolean), sprayAdvice: current.wind_speed_10m > 15 || (weather.daily?.precipitation_probability_max?.[0] || 0) > 60 ? 'Avoid spraying today; wind or rain may reduce effectiveness.' : 'Conditions look reasonable. Follow the product label and avoid spraying in strong sun or wind.', source: 'Open-Meteo', updatedAt: current.time });
  } catch (error) { next(error); }
});

app.post('/api/diagnose', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Upload a clear crop photo to diagnose.' });
    const language = LANGUAGES[req.body.language] || 'English';
    const imageBase64 = req.file.buffer.toString('base64');
    const result = await geminiInteraction(textModel(), [
      { type: 'text', text: `You are a cautious agricultural assistant. Analyze the attached plant photo. Respond in ${language}. Do not invent pesticide doses or pre-harvest intervals. If uncertain, say so and direct the grower to the local agricultural extension service. State that labels and local regulations take precedence. For a healthy crop, say that clearly and do not recommend pesticide.` },
      { type: 'image', mime_type: req.file.mimetype, data: imageBase64 }
    ], { response_format: { type: 'text', mime_type: 'application/json', schema: { type: 'object', properties: { crop: { type: 'string' }, issue: { type: 'string' }, category: { type: 'string', enum: ['disease', 'pest', 'nutrient', 'healthy', 'uncertain'] }, severity: { type: 'string', enum: ['low', 'moderate', 'high', 'uncertain'] }, confidence: { type: 'number' }, summary: { type: 'string' }, actions: { type: 'array', items: { type: 'string' } }, chemical: { type: 'object', properties: { activeIngredient: { type: 'string' }, dose: { type: 'string' }, application: { type: 'string' }, preHarvestInterval: { type: 'string' } }, required: ['activeIngredient', 'dose', 'application', 'preHarvestInterval'] }, organicAlternatives: { type: 'array', items: { type: 'string' } }, vectorControl: { type: 'array', items: { type: 'string' } }, caveat: { type: 'string' } }, required: ['crop', 'issue', 'category', 'severity', 'confidence', 'summary', 'actions', 'chemical', 'organicAlternatives', 'vectorControl', 'caveat'] } } });
    if (!result.output_text) return res.status(502).json({ error: 'The plant assessment returned no result. Please try another clear photo.' });
    res.json(JSON.parse(result.output_text));
  } catch (error) { next(error); }
});

app.post('/api/voice-chat', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Record a question before sending.' });
    const language = LANGUAGES[req.body.language] || 'English';
    // First understand the recorded question, then synthesize its answer. The text stays server-side.
    const understood = await geminiInteraction(textModel(), [
      { type: 'text', text: `Listen to this farmer's audio question. Answer the question concisely and practically in ${language}. Be cautious with pesticide safety and never guess doses; advise checking product labels or a local agricultural expert. If the recording is unclear, say briefly in ${language} that the farmer should repeat the question. Return only the spoken answer, without headings.` },
      { type: 'audio', mime_type: req.file.mimetype, data: req.file.buffer.toString('base64') }
    ], { generation_config: { temperature: 0.3 } });
    const answerText = understood.output_text?.trim();
    if (!answerText) return res.status(502).json({ error: 'The voice service could not understand the recording. Please try again.' });
    const response = await geminiGenerateContent(ttsModel(), { contents: [{ parts: [{ text: answerText }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } } });
    const audio = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData)?.inlineData;
    if (!audio?.data) return res.status(502).json({ error: 'The voice service returned no audio. Please try again.' });
    res.json({ audio: audio.data, mimeType: audio.mimeType || 'audio/L16;codec=pcm;rate=24000' });
  } catch (error) { next(error); }
});

app.use((err, _req, res, _next) => { console.error(err); res.status(err.status || 500).json({ error: err.message || 'Something went wrong. Please try again.' }); });

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  const port = Number(process.env.PORT || 5000);
  app.listen(port, () => console.log(`CropGuard API listening on http://localhost:${port}`));
}
export default app;
