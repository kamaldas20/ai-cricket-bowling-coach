# AI Cricket Bowling Coach — BowlCoach AI

A production-grade **Next.js** web application with real **ML-powered video analysis** for cricket bowling coaching.

## Features

- 🤖 **3 AI Agents**: Coach Agent, Performance Analyst, ML Video Analysis Agent
- 📹 **Real ML Video Analysis**: MediaPipe PoseLandmarker processes bowling videos in-browser
- 📊 **Performance Dashboard**: Chart.js charts tracking speed, accuracy, and swing trends
- 🏋️ **Training Plans**: Personalized warmup, skill, fitness, and match simulation plans
- 🩹 **Injury Prevention**: Alerts for high workload and jerk bowling risks
- 🎯 **Pro Benchmarks**: Compare against 130+ km/h speed, 85% accuracy, 70% swing

## Tech Stack

- **Next.js 14** (App Router)
- **MediaPipe Vision** (PoseLandmarker for real pose detection)
- **Chart.js** + react-chartjs-2 (dashboard charts)
- **Vanilla CSS** (premium dark theme with glassmorphism)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Landing page with feature overview |
| Analysis | `/analysis` | Upload video / enter stats for AI coaching |
| Dashboard | `/dashboard` | Performance trends and pro benchmarks |
| Training | `/training` | Generate personalized training plans |

## API

- `POST /api/analyze` — Multi-agent analysis endpoint
- `GET /api/sessions` — Historical session data

## Deploy to Vercel

```bash
npx vercel
```