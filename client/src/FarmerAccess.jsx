import { useState } from 'react';
import { Sprout } from 'lucide-react';
import { supabase } from './supabase.js';

const crops = ['Rice', 'Wheat', 'Tomato', 'Cotton', 'Sugarcane', 'Maize', 'Other'];
const languages = ['English', 'Tamil', 'Hindi', 'Telugu'];

export function SupabaseSetup() {
  return <main className="access-page"><section className="access-card setup-card"><div className="access-brand"><span className="brand-mark"><Sprout size={22}/></span>crop<span>guard</span></div><div className="eyebrow">FARMER ACCOUNTS</div><h1>Connect your farmer database.</h1><p>Set up Supabase, then add these values to the root <code>.env</code> file:</p><pre>VITE_SUPABASE_URL=your-project-url<br/>VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key</pre><p className="access-footnote">Create a Supabase project, run <code>supabase/schema.sql</code> in its SQL Editor, then restart the app. The publishable key is safe for the browser when row level security is enabled.</p></section></main>;
}

export function FarmerSignIn({ onSignedIn }) {
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '', village: '', primary_crop: '', farm_size_acres: '', preferred_language: 'English' });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.full_name, phone: form.phone, village: form.village, primary_crop: form.primary_crop, farm_size_acres: form.farm_size_acres, preferred_language: form.preferred_language } } });
        if (authError) throw authError;
        if (data.session) onSignedIn(data.session);
        else setMessage('Check your email for the confirmation link, then sign in here.');
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (authError) throw authError;
        onSignedIn(data.session);
      }
    } catch (authError) { setError(authError.message || 'Could not complete sign in.'); }
    finally { setBusy(false); }
  }
  return <main className="access-page"><section className="access-card"><div className="access-brand"><span className="brand-mark"><Sprout size={22}/></span>crop<span>guard</span></div><div className="eyebrow">YOUR FARM, YOUR RECORD</div><h1>{mode === 'signup' ? 'Create your farmer account.' : 'Welcome back.'}</h1><p className="access-subtitle">Keep your farm details and language preferences available when you sign in.</p><form onSubmit={submit} className="access-form">
    {mode === 'signup' && <><label>Full name<input name="full_name" autoComplete="name" value={form.full_name} onChange={change} required maxLength={100}/></label><label>Phone number <span>(optional)</span><input name="phone" autoComplete="tel" value={form.phone} onChange={change} maxLength={30}/></label><div className="form-row"><label>Village / area<input name="village" autoComplete="address-level2" value={form.village} onChange={change} maxLength={120}/></label><label>Main crop<select name="primary_crop" value={form.primary_crop} onChange={change}><option value="">Choose crop</option>{crops.map(crop => <option key={crop}>{crop}</option>)}</select></label></div><div className="form-row"><label>Farm size <span>(acres)</span><input name="farm_size_acres" type="number" min="0" step="0.01" value={form.farm_size_acres} onChange={change}/></label><label>Preferred language<select name="preferred_language" value={form.preferred_language} onChange={change}>{languages.map(language => <option key={language}>{language}</option>)}</select></label></div></>}
    <label>Email address<input name="email" type="email" autoComplete="email" value={form.email} onChange={change} required/></label><label>Password<input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength="8" value={form.password} onChange={change} required/></label>
    {error && <div className="access-error" role="alert">{error}</div>}{message && <div className="access-success" role="status">{message}</div>}
    <button className="button button-green access-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
  </form><div className="access-switch">{mode === 'signup' ? 'Already have an account?' : 'New to CropGuard?'} <button onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setMessage(''); }}>{mode === 'signup' ? 'Sign in' : 'Create account'}</button></div><div className="access-footnote">Your profile is stored in your CropGuard account. Only you can access or update it.</div></section></main>;
}

export function FarmerProfileDialog({ profile, onClose, onSave }) {
  const [form, setForm] = useState({ full_name: profile.full_name || '', phone: profile.phone || '', village: profile.village || '', primary_crop: profile.primary_crop || '', farm_size_acres: profile.farm_size_acres ?? '', preferred_language: profile.preferred_language || 'English' });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  async function submit(event) { event.preventDefault(); setBusy(true); setError(''); try { await onSave({ ...form, farm_size_acres: form.farm_size_acres === '' ? null : Number(form.farm_size_acres) }); onClose(); } catch (saveError) { setError(saveError.message || 'Could not save your profile.'); } finally { setBusy(false); } }
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-heading"><button className="modal-close" onClick={onClose} aria-label="Close">×</button><div className="eyebrow">FARMER PROFILE</div><h2 id="profile-heading">Your farm details</h2><form className="access-form" onSubmit={submit}><label>Full name<input name="full_name" value={form.full_name} onChange={change} required maxLength={100}/></label><label>Phone number<input name="phone" value={form.phone} onChange={change} maxLength={30}/></label><label>Village / area<input name="village" value={form.village} onChange={change} maxLength={120}/></label><div className="form-row"><label>Main crop<select name="primary_crop" value={form.primary_crop} onChange={change}><option value="">Choose crop</option>{crops.map(crop => <option key={crop}>{crop}</option>)}</select></label><label>Farm size <span>(acres)</span><input name="farm_size_acres" type="number" min="0" step="0.01" value={form.farm_size_acres} onChange={change}/></label></div><label>Preferred language<select name="preferred_language" value={form.preferred_language} onChange={change}>{languages.map(language => <option key={language}>{language}</option>)}</select></label>{error && <div className="access-error" role="alert">{error}</div>}<button className="button button-green access-submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button></form></section></div>;
}
