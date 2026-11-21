# CropGuard — Complete Project Specification (`spec.md`)

**Project Name:** CropGuard  
**Version:** 2.0  
**Architecture:** Monorepo (`client/` React + Vite SPA, `api/` Express serverless routes, root `vercel.json`)  
**Deployment Stack:** GitHub (source control & CI/CD) + Vercel (static frontend + `/api` serverless backend)

---

## 1. Problem Statement & Solution Overview

### Problem Statement
Unpredictable climate patterns—including erratic rainfall, heat stress, and sudden humidity shifts—severely impact crop yields, accelerate pest and viral outbreaks, and trigger supply shortages and price volatility before food reaches markets. At the same time, farmers need fast, accessible ways to identify crop species, detect plant viruses or pests from a photo, and get safe, actionable pesticide and organic treatment guidance.

### Solution (`CropGuard`)
CropGuard is a mobile-first agricultural assistant that combines:
1. **Snap-to-Diagnose Vision (`POST /api/diagnose`):** Identifies the crop from a leaf/plant photo, detects viral, fungal, bacterial, pest, or nutrient issues, estimates severity and confidence, and provides chemical pesticide details (active ingredient, dosage per liter, application method, pre-harvest interval) alongside organic alternatives and vector-control tips.
2. **Climate & Yield Volatility Intelligence (`GET /api/climate-risk`):** Uses farmer GPS coordinates (with fallback defaults) and live weather data from Open-Meteo to assess pathogen outbreak risk, safe spraying windows, and potential yield/supply volatility.
3. **Voice-Only Mode (`POST /api/voice-chat`):** Selected as the primary voice architecture for GitHub + Vercel deployment. Farmers record a voice question and receive a **voice-only** spoken answer (`responseModalities: ["AUDIO"]`) with no text transcript rendered in the UI.
4. **Accessibility & Multilingual Support:** Supports regional language selection (`English`, `Tamil`, `Hindi`, `Telugu`) across diagnostics and voice-only replies.

---

## 2. Repository Structure

```text
cropguard/
├── api/
│   └── index.js                  # Express app exported for Vercel + local dev server
├── client/
│   ├── src/
│   │   ├── App.jsx               # Main CropGuard UI (climate banner, snap-to-diagnose, voice chat)
│   │   ├── VoiceOnlyChat.jsx     # Voice-only recorder & audio playback (no text replies)
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js            # Dev server proxy: /api -> http://localhost:5000
│   └── package.json
├── spec.md                       # Complete project specification & source of truth
├── vercel.json                   # Vercel build, output directory, and /api rewrites
├── .env.example                  # Template for environment variables
├── .gitignore
└── package.json                  # Root dependencies & build/dev scripts