# Sentinel — News Intelligence

Standalone React + Express news intelligence dashboard. No proprietary platform login, OAuth, hosting, storage, or API integration is required.

## Requirements
- Node.js 22+
- pnpm 10.18+ (or use the included Dockerfile)

## Run locally
```bash
corepack enable
corepack prepare pnpm@10.18.0 --activate
pnpm install
pnpm dev
```
Open http://localhost:3000.

## Production
```bash
pnpm build
pnpm start
```
The server serves the frontend and API from one process. It exposes `GET /api/health`, `GET /api/news`, and `POST /api/brief`.

## Deploy on Render
1. Push this project to a GitHub repository (never commit `.env` or API keys).
2. In Render choose **New > Web Service**, connect the repository, and select **Docker**.
3. Deploy. Render supplies `PORT`; the app listens on `0.0.0.0`. Set health check path to `/api/health`.
4. News browsing uses public Google News RSS and does not need an API key.
5. To enable AI briefings, set `AI_API_URL`, `AI_API_KEY`, and `AI_MODEL` in Render's Environment settings. These must correspond to an OpenAI-compatible chat-completions provider. Keep the key server-side. Without these variables, news browsing still works and AI briefing endpoints return a clear configuration error.

## Notes
- Saved reports and searches are stored in browser localStorage, per browser/device.
- News results are public reporting, not verified or classified intelligence. Verify important claims against the linked source.
- AI-generated briefs depend on the selected external provider and should be checked against source reports.
