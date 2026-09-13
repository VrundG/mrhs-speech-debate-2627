# MRHS Speech & Debate Command Center

A private, login-gated operations dashboard for the Marvin Ridge High School Speech & Debate chapter. It tracks membership status, tournament payment receipts, late payments, tournament history, parent chaperone coverage, volunteer approval, and verified chaperone service.

## Privacy model

The repository contains application code only. Student names, payment records, receipt links, chaperone names, and tournament histories belong in a private Cloudflare D1 database and must never be committed to Git.

The dashboard requires server-side credentials. Configure these as encrypted Cloudflare secrets:

- `MRHS_DASHBOARD_PASSWORD`
- `MRHS_SESSION_SECRET`
- `MRHS_FORM_WEBHOOK_SECRET`
- `MRHS_PAYMENT_FORM_URL`
- `MRHS_PAYMENT_SHEET_URL`

Configure these non-secret build variables:

- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_D1_DATABASE_NAME`

## Development

Install dependencies with `pnpm install`, then run `pnpm dev`. Create a local `.env` file for credentials; `.env*` files are ignored by Git.

## Deployment

Cloudflare Workers Builds runs `pnpm deploy` after each push to `main`. Database migrations live in `drizzle/`. The initial roster is imported through the authenticated `/api/roster-sync` endpoint and is never stored in this repository.

## Google Forms

The Apps Script helpers in `scripts/` forward payment and chaperone submissions to the dashboard. Store the matching webhook secret and deployment-specific endpoints in Apps Script Properties as `MRHS_WEBHOOK_SECRET`, `MRHS_PAYMENT_ENDPOINT`, and `MRHS_CHAPERONE_ENDPOINT`; do not paste them into source code.
