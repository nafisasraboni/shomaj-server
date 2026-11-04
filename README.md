# Shomaj API

Express 5 and MongoDB API for the Shomaj community-event platform. It runs on Cloudflare Workers through the Workers Node.js HTTP server compatibility layer.

**Live API:** https://api.shomaj.sraboni.dev

## Capabilities

- Public upcoming-event listing, search, filtering, sorting, and details.
- JWKS-based validation of short-lived Better Auth JWTs.
- Owner-only event creation, updates, and deletion.
- Idempotent event joining with unique MongoDB indexes.
- Personal created-event and joined-event collections.
- Zod validation, restricted CORS, secure headers, and consistent JSON errors.

## Local development

1. Copy `.dev.vars.example` to `.dev.vars` and add the Atlas connection string.
2. Keep `CLIENT_ORIGIN` and `AUTH_BASE_URL` in `wrangler.jsonc` aligned with the frontend.
3. Install dependencies with `npm install`.
4. Start the Worker with `npm run dev`.

Run `MONGODB_URI="your-uri" npm run seed` once to create indexes and eight sample events.

## Checks

```bash
npm run typecheck
npm test
```

## Deployment

Store the database connection securely with `npx wrangler secret put MONGODB_URI`, update the production frontend/auth origins, and run `npm run deploy`. No GitHub integration is required.
