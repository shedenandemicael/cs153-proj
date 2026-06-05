# Resale Agent — Autonomous eBay Listing Agent

End-to-end autonomous agent: upload photos → market research → pricing → listing copy → auto-approve → evaluation → optional publish. Built for **CS153 (Automation / Agent Systems)**.

## Autonomous pipeline

```mermaid
flowchart LR
  A[Photos + notes] --> B[Fetch comparables]
  B --> C[Price GPT-4o]
  C --> D[Listing GPT]
  D --> E{Policy}
  E -->|pass| F[Auto-approve]
  E -->|fail| G[FAILED]
  F --> H[Auto-evaluate]
  H --> I{Publish?}
  I -->|yes| J[PUBLISHED]
  I -->|no| K[READY]
```

| Step | Automated |
|------|-----------|
| eBay comparables (Browse + Insights) | Yes |
| Vision pricing | Yes |
| Title, description, specifics | Yes |
| Human review / approve | **No** (policy only) |
| Publish | Optional (`AGENT_AUTO_PUBLISH=true`) |

Human actions are optional: **re-run agent**, **delete**, **copy listing**, **connect eBay sandbox**, **publish to eBay**.

## Quick start

```bash
cp .env.example .env
# Add Neon DATABASE_URL + DATABASE_URL_UNPOOLED and auth secrets (see below)
npm install
npm run db:deploy
npm run dev
```

- **Landing page:** [http://localhost:3000](http://localhost:3000)
- **Dashboard:** [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- **Single item:** [http://localhost:3000/items/new](http://localhost:3000/items/new)
- **Batch (closet mode):** [http://localhost:3000/items/batch](http://localhost:3000/items/batch) — up to 10 items, processed sequentially in the background

## Authentication

Spot uses a simple private-beta login form for the product dashboard and item workflows. For now, the only authorized account is `shedenandemicael@gmail.com` with password `password`.

Sessions are stored in a signed HTTP-only cookie. The app has a built-in private-beta signing fallback, but production deployments can optionally set `AUTH_SECRET` to rotate the session-signing secret:

```bash
AUTH_SECRET=your-random-session-signing-secret
```

## Agent configuration (`.env`)

```bash
AGENT_AUTO_APPROVE=true
AGENT_CONFIDENCE_THRESHOLD=0.72
AGENT_AUTO_PUBLISH=false
AGENT_PUBLISH_CONFIDENCE_THRESHOLD=0.85
AGENT_BLOCKING_WARNINGS=authenticity,recall,counterfeit
```

- Below confidence threshold → item `FAILED`, draft rejected.
- Warnings matching blocking patterns → `FAILED` (safety).
- `AGENT_AUTO_PUBLISH=true` + sandbox creds + **connected seller OAuth** → publish when confidence ≥ publish threshold.

### Sandbox publish (Sell API)

1. Set `EBAY_ENV=sandbox` and sandbox keys in `EBAY_SANDBOX_CLIENT_ID` / `EBAY_SANDBOX_CLIENT_SECRET` (keep production keys in `EBAY_PRODUCTION_*` or `EBAY_CLIENT_ID` for comps).
2. In [eBay Developer Portal](https://developer.ebay.com/my/keys) → User Tokens, add a **RuName** whose auth accept URL is `https://YOUR-DOMAIN/api/ebay/callback`. Set `EBAY_REDIRECT_URI` to that **RuName** string (not the full URL).
3. On an item page, click **Connect eBay Sandbox** and sign in with a [sandbox test user](https://developer.ebay.com/tools/sandbox-user).
4. On an item page, click **Set up sandbox policies** (or publish — policies are auto-created via Account API). No Seller Hub needed.
5. Click **Publish to eBay** on an item with status `READY` and an approved draft.

```bash
curl -X POST http://localhost:3000/api/ebay/sell/setup-policies
```

```bash
curl http://localhost:3000/api/ebay/sell/status
```

## LLM & eBay

See `.env.example` for `OPENAI_*`, `EBAY_*`, and `PRICING_PROVIDER`.

eBay fetch-only research: `lib/ebay/fetch/`.

**Comps setup:** add `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` from [eBay Developer](https://developer.ebay.com/). Active listings use the **Browse API** on `EBAY_RESEARCH_ENV` (defaults to `production` because sandbox has almost no inventory). Sold comps use **Marketplace Insights** if your key has access (often 403 until approved).

```bash
# Verify config + live API connectivity
curl "http://localhost:3000/api/ebay/status?health=true"

# Test comparables search
curl "http://localhost:3000/api/ebay/comparables?q=nike+air+max+90&limit=8"
```

Response `meta` includes `activeCount`, `soldCount`, `researchEnv`, `searchAttempts`, and whether mock fallback was used.

### Production keyset compliance (subscribe, not opt out)

Production keys stay disabled until you **subscribe** to [Marketplace Account Deletion](https://developer.ebay.com/marketplace-account-deletion) notifications.

1. Deploy the app to an **HTTPS** URL (eBay rejects `localhost`). Use Vercel, ngrok, etc.
2. Set in `.env`:
   ```bash
   EBAY_NOTIFICATION_VERIFICATION_TOKEN=your-random-32-to-80-char-token
   EBAY_NOTIFICATION_ENDPOINT_URL=https://YOUR-DOMAIN/api/ebay/notifications/account-deletion
   ```
3. In [Application Keys](https://developer.ebay.com/my/keys) → your app → **Alerts and Notifications**:
   - Select **Marketplace Account Deletion**
   - Alert email: your email
   - Notification endpoint URL: same as `EBAY_NOTIFICATION_ENDPOINT_URL`
   - Verification token: same as `EBAY_NOTIFICATION_VERIFICATION_TOKEN`
   - Click **Save** (eBay sends a GET challenge; the app responds automatically)
4. Click **Send Test Notification** — should return 200 OK
5. Production keyset becomes **compliant/active**

The webhook purges `EbayAccountRecord` rows (OAuth tokens / user IDs) when eBay sends a deletion event.

## Deploy to Vercel (Neon Postgres)

1. Connect Neon in Vercel Storage with prefix **`DATABASE`** (creates `DATABASE_URL` + `DATABASE_URL_UNPOOLED`).
2. Add remaining secrets in Vercel → Settings → Environment Variables (Production + Preview):
   - `OPENAI_API_KEY`, `EBAY_*`, `NEXT_PUBLIC_APP_URL`, `EBAY_NOTIFICATION_*`, agent settings (see `.env.example`)
3. Push to GitHub — Vercel runs `vercel-build` → `prisma migrate deploy` then `next build`.
4. Set `NEXT_PUBLIC_APP_URL` and `EBAY_NOTIFICATION_ENDPOINT_URL` to your `https://….vercel.app` URL, then redeploy.

**Local dev with Neon:** copy `DATABASE_URL` and `DATABASE_URL_UNPOOLED` from Vercel (or Neon dashboard) into `.env`, then `npm run db:deploy`.

**Photo uploads on Vercel:** add a [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) store (Storage → Create → Blob → connect to this project). That sets `BLOB_STORE_ID` (OIDC) and/or `BLOB_READ_WRITE_TOKEN`. Without a linked store, uploads only work locally (`public/uploads`).

## API routes

| Route | Description |
|-------|-------------|
| `POST /api/items` | Create item + run full agent |
| `POST /api/items/batch` | Batch upload + background processing |
| `GET /api/items/batch/[id]` | Poll batch progress |
| `POST /api/items/[id]/run` | Re-run agent |
| `GET /api/ebay/status` | eBay config |
| `GET /api/ebay/comparables?q=` | Test market fetch |

Legacy `PATCH /api/items/[id]/draft` remains for optional manual overrides.

## Project structure

```
lib/agent/          Autonomous pipeline orchestrator
lib/ebay/fetch/     eBay read APIs (Browse, Insights, Taxonomy)
lib/ai/             Listing copy generation
lib/pricing/        Price determination (GPT-4o)
app/items/[id]/     Agent result + run timeline
```

## CS153 fit

Demonstrates a **fully agentic workflow** with explicit policy gates instead of human-in-the-loop UI. Evaluation metrics are recorded automatically (`fieldsEditedByUser` stays 0 unless overrides are added later).
