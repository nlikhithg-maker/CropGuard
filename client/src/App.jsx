import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowDownRight, ArrowRight, Camera, ChevronDown, CloudSun, Droplets, Leaf, LogOut, MapPin, ShieldCheck, Sprout, Upload, UserRound, Wind, X } from 'lucide-react';
import VoiceOnlyChat from './VoiceOnlyChat.jsx';
import { FarmerProfileDialog, FarmerSignIn, SupabaseSetup } from './FarmerAccess.jsx';
import { supabase } from './supabase.js';

const languages = ['English', 'தமிழ்', 'हिन्दी', 'తెలుగు'];
const langCode = { English: 'English', 'தமிழ்': 'Tamil', 'हिन्दी': 'Hindi', 'తెలుగు': 'Telugu' };
const languageDisplay = { English: 'English', Tamil: 'தமிழ்', Hindi: 'हिन्दी', Telugu: 'తెలుగు' };
function fmt(value, suffix = '') { return value == null ? '—' : `${Math.round(value)}${suffix}`; }

function CropDashboard({ profile = null, onEditProfile, onSignOut, onSaveProfile }) {
  const [language, setLanguage] = useState(languageDisplay[profile?.preferred_language] || 'English');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [diagnosis, setDiagnosis] = useState(null);
  const [diagnoseBusy, setDiagnoseBusy] = useState(false);
  const [diagnoseError, setDiagnoseError] = useState('');
  const [climate, setClimate] = useState(null);
  const [climateError, setClimateError] = useState('');
  const [locationLabel, setLocationLabel] = useState('Coimbatore, Tamil Nadu');
  const [locating, setLocating] = useState(false);
  const fileRef = useRef(null);
  const demoMode = new URLSearchParams(window.location.search).get('demo') === '1';
  useEffect(() => { if (profile?.preferred_language) setLanguage(languageDisplay[profile.preferred_language] || 'English'); }, [profile?.preferred_language]);

  async function loadClimate(lat, lon, label) {
    setClimateError('');
    if (demoMode) {
      setClimate({ location: { latitude: 11.0168, longitude: 76.9558 }, current: { temperature_2m: 29, relative_humidity_2m: 82, wind_speed_10m: 9, time: new Date().toISOString() }, daily: { time: [new Date().toISOString().slice(0, 10), new Date(Date.now() + 86400000).toISOString().slice(0, 10), new Date(Date.now() + 172800000).toISOString().slice(0, 10)], precipitation_probability_max: [20, 70, 35], temperature_2m_max: [32, 30, 31], temperature_2m_min: [23, 22, 23] }, risk: 'watch', riskFactors: ['high humidity'], sprayAdvice: 'Conditions look reasonable this morning. Check the product label and avoid spraying in strong sun or wind.', source: 'Demo forecast', updatedAt: new Date().toISOString() });
      if (label) setLocationLabel(label);
      return;
    }
    try {
      const query = lat != null ? `?lat=${lat}&lon=${lon}` : '';
      const response = await fetch(`/api/climate-risk${query}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Weather could not be loaded.');
      setClimate(data);
      if (label) setLocationLabel(label);
    } catch (error) { setClimateError(error.message); }
  }
  useEffect(() => {
    if (demoMode || !navigator.geolocation) { loadClimate(); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(position => {
      const { latitude, longitude } = position.coords;
      const label = `Your field · ${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
      setLocationLabel(label);
      loadClimate(latitude, longitude, label).finally(() => setLocating(false));
    }, () => {
      loadClimate().finally(() => setLocating(false));
      setClimateError('Location permission was unavailable. Showing the default local forecast.');
    }, { timeout: 10000, maximumAge: 300000 });
  }, []);

  function useLocation() {
    if (!navigator.geolocation) { setClimateError('Location is not available in this browser.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(position => {
      const { latitude, longitude } = position.coords;
      const label = `Your field · ${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
      setLocationLabel(label);
      loadClimate(latitude, longitude, label).finally(() => setLocating(false));
    }, () => { setClimateError('Location permission was unavailable. Showing default local forecast.'); setLocating(false); }, { timeout: 10000 });
  }
  function selectFile(next) {
    if (!next) return;
    if (!next.type.startsWith('image/')) { setDiagnoseError('Choose an image file.'); return; }
    if (next.size > 8 * 1024 * 1024) { setDiagnoseError('Choose an image under 8 MB.'); return; }
    setFile(next); setPreview(URL.createObjectURL(next)); setDiagnosis(null); setDiagnoseError('');
  }
  async function diagnose() {
    if (!file) return;
    setDiagnoseBusy(true); setDiagnoseError(''); setDiagnosis(null);
    if (demoMode) {
      await new Promise(resolve => setTimeout(resolve, 1100));
      setDiagnosis({ crop: 'Tomato', issue: 'Possible early blight', category: 'disease', severity: 'moderate', confidence: 86, summary: 'Some lower leaves show spotting that may be consistent with early blight. Similar symptoms can also come from other leaf diseases or environmental stress.', actions: ['Check whether spots have dark concentric rings and are spreading from older leaves.', 'Remove badly affected leaves and avoid wetting foliage while watering.', 'Monitor new growth over the next few days and ask a local extension officer to confirm.'], chemical: { activeIngredient: 'Confirm diagnosis before choosing a product', dose: 'Use only the rate on the locally approved product label', application: 'Apply only when conditions and crop stage permit', preHarvestInterval: 'Follow the product label' }, organicAlternatives: ['Improve airflow around plants and remove crop debris.', 'Use clean mulch to reduce soil splash onto lower leaves.'], caveat: 'Demo assessment for presentation only. AI photo checks can be wrong; confirm with a local agricultural advisor and follow product labels and local regulations.' });
      setDiagnoseBusy(false);
      return;
    }
    try {
      const body = new FormData(); body.append('image', file); body.append('language', langCode[language]);
      const response = await fetch('/api/diagnose', { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Diagnosis failed.');
      setDiagnosis(data);
    } catch (error) { setDiagnoseError(error.message); }
    finally { setDiagnoseBusy(false); }
  }

  const current = climate?.current;
  const days = climate?.daily;
  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top"><span className="brand-mark"><Sprout size={22} strokeWidth={2.3}/></span><span>crop<span className="brand-strong">guard</span></span></a>
      <nav className="nav-links"><a href="#diagnose">Plant check</a><a href="#climate">Field weather</a><a href="#voice">Ask CropGuard</a></nav>
      <div className="top-actions"><button className="location-pill" onClick={useLocation} disabled={locating}><MapPin size={15}/>{locating ? 'Locating…' : locationLabel}<ChevronDown size={14}/></button><div className="language-wrap"><select aria-label="Language" value={language} onChange={e => { setLanguage(e.target.value); if (profile) onSaveProfile({ ...profile, preferred_language: langCode[e.target.value] }); }}>{languages.map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={14}/></div>{profile && <><button className="farmer-account" onClick={onEditProfile} title="Edit farmer profile"><span className="farmer-avatar"><UserRound size={14}/></span><span>{profile.full_name || 'Farmer'}</span></button><button className="signout-button" onClick={onSignOut} title="Sign out" aria-label="Sign out"><LogOut size={16}/></button></>}</div>
    </header>

    <main id="top">
      {demoMode && <div className="demo-banner"><span className="live-dot"/> DEMO MODE <span>Sample forecast and simulated diagnosis · no API key needed</span><a href={window.location.pathname}>Exit demo</a></div>}
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><span className="live-dot"/> YOUR FIELD, IN FOCUS</div><h1>Good growing<br/>starts with <em>knowing.</em></h1><p>Clear answers for healthier crops. Check a leaf, read the weather, and make your next move with confidence.</p><div className="hero-buttons"><a className="button button-dark" href="#diagnose">Check a plant <ArrowRight size={17}/></a><a className="text-link" href="#climate">See field conditions <ArrowDownRight size={16}/></a></div><div className="trust-line"><ShieldCheck size={16}/> Practical guidance, grounded in your field conditions</div></div>
        <div className="hero-art"><img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=85" alt="Sunlight falling over green agricultural fields"/><div className="art-caption"><span className="caption-icon"><Leaf size={17}/></span><div><strong>Small signals matter.</strong><small>Catch crop stress early.</small></div><ArrowRight className="caption-arrow" size={17}/></div><div className="floating-stamp"><Sprout size={23}/><span>GROW<br/>WITH CARE</span></div></div>
      </section>

      <section className="climate-section" id="climate">
        <div className="section-heading"><div><div className="eyebrow">FIELD CONDITIONS <span className="separator">/</span> TODAY</div><h2>A little weather wisdom.</h2></div><div className="updated">{current ? `Updated ${new Date(current.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Loading local forecast'}</div></div>
        {climateError && <div className="inline-note">{climateError}</div>}
        <div className="climate-grid">
          <article className="weather-card main-weather"><div className="weather-top"><div><span className="card-label">RIGHT NOW</span><div className="place"><MapPin size={14}/>{locationLabel}</div></div><CloudSun size={30} strokeWidth={1.5}/></div><div className="temperature">{fmt(current?.temperature_2m, '°')}<span>C</span></div><div className="weather-description">{current?.temperature_2m >= 34 ? 'Warm conditions' : 'Partly settled'} · {fmt(current?.relative_humidity_2m, '%')} humidity</div><div className="weather-stats"><div><Droplets size={16}/><span>{fmt(current?.relative_humidity_2m, '%')}<small>Humidity</small></span></div><div><Wind size={16}/><span>{fmt(current?.wind_speed_10m, ' km/h')}<small>Wind speed</small></span></div></div></article>
          <article className="weather-card risk-card"><div className="card-label">CROP HEALTH OUTLOOK</div><div className={`risk-indicator risk-${climate?.risk || 'watch'}`}><span>{climate?.risk === 'elevated' ? '!' : climate?.risk === 'low' ? '✓' : '·'}</span>{climate?.risk || 'Loading'}</div><p>{climate?.riskFactors?.length ? `Keep an eye out for ${climate.riskFactors.join(' and ')}.` : 'No strong weather signals for elevated crop stress today.'}</p><div className="card-foot"><Activity size={15}/> Based on local humidity, heat & rain</div></article>
          <article className="weather-card spray-card"><div className="card-label">SPRAYING WINDOW</div><div className="spray-icon"><Wind size={21}/></div><h3>{climate?.sprayAdvice?.startsWith('Avoid') ? 'Wait for calmer weather' : 'Check conditions first'}</h3><p>{climate?.sprayAdvice || 'Checking local wind and rain…'}</p><div className="card-foot"><ShieldCheck size={15}/> Always follow the product label</div></article>
          <article className="weather-card forecast-card"><div className="forecast-head"><span className="card-label">COMING UP</span><span className="tiny-muted">3-day outlook</span></div>{(days?.time || []).map((day, i) => <div className="forecast-row" key={day}><span>{i === 0 ? 'Today' : new Date(`${day}T12:00:00`).toLocaleDateString([], { weekday: 'short' })}</span><span className="forecast-rain"><Droplets size={13}/>{fmt(days.precipitation_probability_max?.[i], '%')}</span><span className="forecast-temp">{fmt(days.temperature_2m_max?.[i], '°')} <i>/ {fmt(days.temperature_2m_min?.[i], '°')}</i></span></div>)}{!days && <div className="loading-line">Forecast will appear shortly</div>}</article>
        </div>
        <div className="source-note">Weather from Open-Meteo · Forecasts are estimates, not guarantees.</div>
      </section>

      <section className="workbench" id="diagnose">
        <div className="workbench-intro"><div className="eyebrow">YOUR NEXT STEP</div><h2>Something on your<br/>plant not looking right?</h2><p>Share a clear photo of the leaf or plant. We’ll help you understand what you might be seeing and what to check next.</p><div className="step-note"><span>01</span><div><b>Start with a good photo</b><small>Choose a well-lit image of the affected area.</small></div></div><div className="step-note"><span>02</span><div><b>Get a careful first look</b><small>Use the results to guide your next conversation.</small></div></div><div className="step-note"><span>03</span><div><b>Confirm before treating</b><small>Ask a local expert if the issue is unclear.</small></div></div></div>
        <div className="diagnose-panel">
          <div className="panel-top"><div><span className="card-label">PHOTO CHECK</span><h3>Take a closer look</h3></div><span className="ai-chip"><span/> AI ASSISTED</span></div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => selectFile(e.target.files?.[0])}/>
          {!preview ? <div className="upload-wrap"><button className="upload-zone" onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); selectFile(e.dataTransfer.files?.[0]); }}><span className="upload-icon"><Camera size={23}/></span><strong>Drop a plant photo here</strong><span>or browse from your device</span><small><Upload size={13}/> JPG, PNG or WEBP · up to 8 MB</small></button>{demoMode && <button className="sample-photo" onClick={async () => { const response = await fetch('/sample-leaf.svg'); const blob = await response.blob(); selectFile(new File([blob], 'sample-tomato-leaf.svg', { type: 'image/svg+xml' })); }}>Use sample leaf photo</button>}</div> : <div className="image-preview"><img src={preview} alt="Selected plant for diagnosis"/><button aria-label="Remove image" className="remove-image" onClick={() => { setFile(null); setPreview(''); setDiagnosis(null); }}><X size={16}/></button>{!diagnosis && <button className="replace-photo" onClick={() => fileRef.current?.click()}>Change photo</button>}</div>}
          {diagnoseError && <div className="error-message">{diagnoseError}</div>}
          {file && !diagnosis && <button className="button button-green diagnose-button" onClick={diagnose} disabled={diagnoseBusy}>{diagnoseBusy ? <><span className="spinner"/> Looking closely…</> : <>Check this plant <ArrowRight size={17}/></>}</button>}
          {diagnosis && <div className="diagnosis-result"><div className="result-header"><div><span className="card-label">FIRST LOOK · {diagnosis.confidence ? `${diagnosis.confidence}% CONFIDENCE` : 'AI ASSISTED'}</span><h3>{diagnosis.crop || 'Plant'} <span>·</span> {diagnosis.issue || 'Assessment'}</h3></div><button className="reset-link" onClick={() => { setDiagnosis(null); }}>Check another</button></div><div className="result-tags"><span className={`severity severity-${diagnosis.severity}`}>{diagnosis.severity || 'uncertain'} severity</span><span>{diagnosis.category || 'assessment'}</span></div><p>{diagnosis.summary}</p>{diagnosis.actions?.length > 0 && <div className="result-block"><b>What to do next</b><ul>{diagnosis.actions.map((item, i) => <li key={i}>{item}</li>)}</ul></div>}{diagnosis.chemical && diagnosis.chemical.activeIngredient !== 'none' && diagnosis.chemical.activeIngredient !== 'N/A' && <div className="result-block treatment"><b>Treatment to discuss with a local expert</b><p>{diagnosis.chemical.activeIngredient} · {diagnosis.chemical.dose}</p><small>{diagnosis.chemical.application} · Pre-harvest interval: {diagnosis.chemical.preHarvestInterval}</small></div>}{diagnosis.organicAlternatives?.length > 0 && <div className="result-block"><b>Other options</b><ul>{diagnosis.organicAlternatives.map((item, i) => <li key={i}>{item}</li>)}</ul></div>}<div className="caveat"><ShieldCheck size={15}/>{diagnosis.caveat || 'AI can be wrong. Confirm the issue with a qualified local agricultural advisor before treatment. Follow product labels and local regulations.'}</div></div>}
          {!diagnosis && <div className="privacy-note"><ShieldCheck size={15}/> Photos are used to generate this assessment and aren’t stored by CropGuard.</div>}
        </div>
      </section>

      <section className="voice-section" id="voice"><div className="voice-copy"><div className="eyebrow">HANDS FREE HELP</div><h2>Ask it out loud.</h2><p>In the field, your hands are busy. Ask a question in your language and listen to a spoken reply.</p><div className="language-tags">{languages.map(item => <span key={item}>{item}</span>)}</div></div><VoiceOnlyChat language={langCode[language]} demoMode={demoMode}/></section>
      <section className="bottom-banner"><div className="banner-mark"><Sprout size={23}/></div><div><b>Grow with a little more confidence.</b><span>Good decisions start with good information.</span></div><a href="#top">Back to top <ArrowRight size={16}/></a></section>
    </main>
    <footer><a className="brand footer-brand" href="#top"><span className="brand-mark"><Sprout size={19}/></span><span>crop<span className="brand-strong">guard</span></span></a><span>Made for the people who grow our food.</span><span>Weather estimates and AI results may be inaccurate.</span></footer>
  </div>;
}

export default function App() {
  const demoMode = new URLSearchParams(window.location.search).get('demo') === '1';
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(!demoMode);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (demoMode || !supabase) { setAuthLoading(false); return; }
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) setProfileError(error.message);
      setSession(data?.session || null);
      setAuthLoading(false);
    }).catch(error => { if (alive) { setProfileError(error.message); setAuthLoading(false); } });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setProfile(null);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, [demoMode]);

  useEffect(() => {
    if (demoMode || !session?.user || !supabase) { setProfile(null); setProfileLoading(false); return; }
    let alive = true;
    async function loadProfile() {
      setProfileLoading(true); setProfileError('');
      try {
        const { data, error } = await supabase.from('farmer_profiles').select('*').eq('id', session.user.id).maybeSingle();
        if (error) throw error;
        if (data) { if (alive) setProfile(data); return; }
        const metadata = session.user.user_metadata || {};
        const newProfile = { id: session.user.id, full_name: metadata.full_name || '', phone: metadata.phone || null, village: metadata.village || null, primary_crop: metadata.primary_crop || null, farm_size_acres: metadata.farm_size_acres ? Number(metadata.farm_size_acres) : null, preferred_language: metadata.preferred_language || 'English' };
        const { data: inserted, error: insertError } = await supabase.from('farmer_profiles').upsert(newProfile).select().single();
        if (insertError) throw insertError;
        if (alive) setProfile(inserted);
      } catch (error) { if (alive) setProfileError(error.message || 'Could not load this farmer profile.'); }
      finally { if (alive) setProfileLoading(false); }
    }
    loadProfile();
    return () => { alive = false; };
  }, [demoMode, session?.user?.id]);

  async function saveProfile(changes) {
    const record = { id: session.user.id, full_name: changes.full_name, phone: changes.phone || null, village: changes.village || null, primary_crop: changes.primary_crop || null, farm_size_acres: changes.farm_size_acres === '' ? null : changes.farm_size_acres, preferred_language: changes.preferred_language || 'English', updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('farmer_profiles').upsert(record).select().single();
    if (error) throw error;
    setProfile(data);
    return data;
  }

  if (demoMode) return <CropDashboard/>;
  if (!supabase) return <SupabaseSetup/>;
  if (authLoading) return <main className="access-page"><div className="access-loading">Loading your farmer account…</div></main>;
  if (!session) return <FarmerSignIn onSignedIn={setSession}/>;
  if (profileLoading) return <main className="access-page"><div className="access-loading">Loading your farm profile…</div></main>;
  if (profileError || !profile) return <main className="access-page"><section className="access-card"><div className="eyebrow">PROFILE SETUP</div><h1>Couldn’t load your farmer profile.</h1><p>{profileError || 'No profile record was found.'}</p><p className="access-footnote">Check that the Supabase schema has been installed and the profile table has row level security enabled.</p><button className="button button-green access-submit" onClick={() => supabase.auth.signOut()}>Sign out</button></section></main>;
  return <><CropDashboard profile={profile} onEditProfile={() => setProfileOpen(true)} onSaveProfile={saveProfile} onSignOut={() => supabase.auth.signOut()} />{profileOpen && <FarmerProfileDialog profile={profile} onClose={() => setProfileOpen(false)} onSave={saveProfile}/>}</>;
}
