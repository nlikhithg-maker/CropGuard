# CropGuard

CropGuard is a mobile-first crop health assistant. It combines an AI-assisted plant photo assessment, a local weather and spray conditions view, and voice-only agricultural Q&A in English, Tamil, Hindi, and Telugu.

## Run locally

Requirements: Node.js 20 or newer and npm.

1. Install dependencies from the repository root:

   ```sh
   npm install
   npm --prefix client install
   ```

2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` from Google AI Studio. Without a key, weather still works, while the diagnosis and voice features return a clear configuration message.

   Plant diagnosis and voice understanding use the Gemini Interactions API with `gemini-3.8-flash`. Older `GEMINI_MODEL` values for Gemini 2.5 Flash are automatically upgraded. Speech synthesis uses `gemini-3.1-flash-tts-preview` by default; these model settings can be overridden in `.env`.

3. For farmer accounts, create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL Editor. Add the project URL and publishable key to `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Use the publishable key, never the `service_role` secret. Supabase Auth stores login credentials; `farmer_profiles` stores each farmer's name, phone, village, main crop, farm size, and language. Row-level security limits profile reads and changes to that farmer's account.

4. Start both the API and frontend:

   ```sh
   npm run dev
   ```

   Open the Vite URL printed in the terminal (normally `http://localhost:5173`). The API listens on port 5000.

   After changing `.env`, restart Vite so it picks up the Supabase settings. If a Vite setup message appears, check that the schema was run and both Supabase values are present.

### Guided demo

Open `http://localhost:5173/?demo=1` to present the app without a Gemini key. The demo loads sample local weather, lets you select the included sample leaf, shows a clearly labeled simulated assessment, and speaks a short sample answer using your browser's speech support. No voice transcript appears. You can also deploy the project to Vercel and add `?demo=1` to its URL.

## Deploy to Vercel

Import the repository into Vercel and configure `GEMINI_API_KEY` as a server environment variable. `vercel.json` builds the Vite app and routes API requests to the Express function. The client makes same-origin `/api` requests, so no frontend API URL is needed.

Set `DEFAULT_LATITUDE` and `DEFAULT_LONGITUDE` to the fallback farm region used when browser location is unavailable. The included defaults point to Coimbatore, Tamil Nadu. On page load, CropGuard requests browser location and loads weather for that visitor's coordinates when permission is granted; the location button can request it again. Location access needs a secure context (HTTPS, or localhost during development).

## API routes

- `GET /api/health` — service status and whether the AI key is configured.
- `GET /api/climate-risk?lat=…&lon=…` — Open-Meteo current weather, three-day outlook, simple weather-signal risk level, and spray conditions.
- `POST /api/diagnose` — multipart form fields `image` and `language` (`English`, `Tamil`, `Hindi`, or `Telugu`).
- `POST /api/voice-chat` — multipart form fields `audio` (WAV) and `language`. The API understands the question and synthesizes a spoken answer; the answer text is never returned to the client.

## Responsible use

Photo results are AI-generated first-look guidance, not a definitive diagnosis. Crop disease can be difficult to distinguish from nutrient stress or environmental damage in a single photo. Verify uncertain issues with a local agricultural extension professional. Pesticide choices, dosage, protective equipment, application rules, and pre-harvest intervals must follow the product label and local regulations. Weather and risk indicators are estimates and do not guarantee safe spraying or crop outcomes.
