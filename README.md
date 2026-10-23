# Sentinel — News Intelligence

Sentinel is a standalone, source-first news monitoring dashboard. It collects public reporting from selected publishers, lets you search and filter coverage, compare related reports, and save articles and investigations in your browser.

It is designed for open-source news research—not classified intelligence, threat scoring, or automated fact verification.

## Features

- Public news collection from the configured publisher set using Google News RSS.
- Search by keywords, topic, geography, date window, language, and selected sources.
- Recent-first or relevance-based result ordering.
- Related-story grouping and cross-publisher coverage comparison.
- Article detail view with the original publisher link and related reporting.
- Saved articles and investigations stored locally in the current browser.
- Automatic news refresh while the dashboard is open.
- No AI analyst, paid AI provider, or AI API key is required.

## Requirements

- Node.js 22 or later
- pnpm 10.18 or later (Corepack is recommended)

## Run locally

```bash
corepack enable
corepack prepare pnpm@10.18.0 --activate
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build and run

```bash
pnpm build
pnpm start
```

The production server serves the built frontend and API from one process.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Health check; returns the service status. |
| GET | `/api/news` | Collects public news using the requested search and source filters. |

There is no AI briefing endpoint.

## Deploy on Render

1. Push the repository to GitHub. Do not commit local environment files, credentials, or API keys.
2. In Render, choose **New → Web Service** and connect this repository.
3. Select **Docker** as the runtime/build method so Render uses the repository's Dockerfile.
4. Set the health check path to `/api/health`, then deploy.
5. News collection uses public Google News RSS feeds; no AI provider credentials are needed.

Render supplies the `PORT` environment variable. The server listens on `0.0.0.0`.

## Data, privacy, and limitations

- News items are retrieved from public RSS results and link back to their publishers. Availability, metadata, and freshness depend on those external sources.
- Saved articles and investigations use the browser's local storage. They are local to that browser/device and are not synced to an account or server.
- The dashboard is not a complete index of the internet. Results are limited to the configured publishers and the filters selected.
- News aggregation does not independently verify claims. Check important information against the original reporting and other reliable sources.
- Search results and source availability can change when upstream feeds change or become unavailable.

## License

This project is licensed under the [MIT License](LICENSE).

Copyright (c) 2026 Soumen Roy.
