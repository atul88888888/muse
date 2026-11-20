# Sync Licensing Platform

A multi-tenant music sync-licensing CRM: catalogue, rights clearance, contacts/companies,
opportunities, AI-assisted matching, outreach drafting/sending, and deals & royalties.
Each tenant (an artist, label, or agency) signs up with their own isolated account and
plugs in their own OpenAI key and SMTP credentials - the platform never ships shared keys.

## What this replaces from the original brief, and what it deliberately does not do

- **Airtable -> Postgres**, with real multi-tenant isolation (every row is scoped to a
  `tenantId`, enforced in the API layer - see `server/src/middleware/auth.js`).
- **Make -> an in-app scheduler** (`server/src/services/scheduler.js`) plus explicit
  "run matching" / "generate draft" / "approve & send" actions in the UI.
- **Google Drive -> local file storage** on your own server (a Docker volume), served
  only via authenticated routes or short-lived signed preview links.
- **AI matching** uses a deterministic, explainable weighted scorer
  (`server/src/services/matching.service.js`) for the numeric score, and OpenAI only
  for descriptive text (track descriptions, brief interpretation, pitch drafts) - so
  scores stay reproducible and auditable, matching the brief's "don't let AI do ML
  magic with 20 tracks" guidance.
- **Rights clearance is human-gated by design.** AI can only write to
  `aiSuggestedStatus` on a track's rights record; only an authenticated OWNER/ADMIN
  calling `POST /api/rights/:trackId/approve` can set `finalStatus`, and that is the
  only thing that unlocks a track for pitching. See `server/src/routes/rights.routes.js`.
- **No automated scraping of LinkedIn, IMDbPro, Google, or company sites.** That would
  violate those sites' terms of service and risks running afoul of data-privacy rules
  around compiling personal information across sources. Contacts/companies are a real
  CRM (manual entry + CSV import) - you (or a compliant data provider) still do the
  prospecting; the app does the matching, drafting, and tracking.
- **No email is ever sent automatically.** Every outreach message is created as a
  `DRAFT`, reviewed/edited in the UI, and only transmitted when a human clicks
  "Approve & send" (`POST /api/outreach/:id/send`).

## Architecture

```
Browser (React SPA) --> nginx (serves SPA, proxies /api/*) --> Node/Express API --> Postgres
                                                                       |
                                                                 OpenAI API (tenant's own key)
                                                                 SMTP (tenant's own credentials)
```

Everything runs in three Docker containers (`db`, `server`, `web`) via `docker-compose.yml`.
The `web` container is the only one exposed to the host, and only on `127.0.0.1:${APP_PORT}`
(default `8090`) - **not** on 80/443 - so it cannot collide with anything else already
running on a shared server. Your existing reverse proxy adds one new vhost that forwards
your chosen subdomain to that local port.

## Deploying to a server that already hosts other sites

This is written for exactly your situation: one server, multiple existing sites, and you
don't want this app to disturb any of them.

### 1. Prerequisites on the server

```bash
docker --version
docker compose version   # or: docker-compose --version
```

If Docker isn't installed, install it with your distro's official method (e.g. Docker's
`get-docker.sh` convenience script, or your distro's package manager) - this is additive
and won't affect sites that aren't running in Docker.

### 2. Copy this project to the server

From your Mac, in this folder:

```bash
rsync -avz --exclude node_modules --exclude .env ./ youruser@45.81.7.143:/opt/sync-licensing-platform/
```

(Adjust the remote path to wherever you keep other apps on that box, e.g. `/srv/` or `/home/youruser/apps/`.)

### 3. Configure environment

On the server:

```bash
cd /opt/sync-licensing-platform
cp .env.example .env
openssl rand -hex 32   # run twice, paste results into APP_SECRET and JWT_SECRET in .env
nano .env              # fill in POSTGRES_PASSWORD, PUBLIC_URL, and confirm APP_PORT is free
```

Check `APP_PORT` (default 8090) isn't already used by another app on the box:

```bash
sudo ss -tlnp | grep 8090
```

If it's taken, pick another port in `.env` (e.g. 8091).

### 4. Build and start

```bash
docker compose up -d --build
docker compose logs -f server   # confirm "sync-licensing-server listening on :4000" and no errors
```

This creates its own Postgres container and Docker volumes - it does not touch any
database, nginx config, or container belonging to your other sites.

### 5. Wire up your reverse proxy (the only step that touches shared infrastructure)

Pick a subdomain (e.g. `sync.yourdomain.com`) and point its DNS A record at `45.81.7.143`
if you haven't already. Then add **one new vhost** to whatever already serves your other
sites, forwarding to the app's local port - don't edit any existing vhost file.

**If it's nginx**, create a new file (don't touch existing ones) at
`/etc/nginx/sites-available/sync-licensing`:

```nginx
server {
    listen 80;
    server_name sync.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sync-licensing /etc/nginx/sites-enabled/
sudo nginx -t                 # validate config before reloading
sudo systemctl reload nginx   # reload, not restart - avoids dropping connections to other sites
sudo certbot --nginx -d sync.yourdomain.com   # free HTTPS, only for this new vhost
```

**If it's Caddy**, append to `/etc/caddy/Caddyfile` (don't replace the file):

```
sync.yourdomain.com {
    reverse_proxy 127.0.0.1:8090
}
```

```bash
sudo systemctl reload caddy
```

### 6. Create your first tenant

Visit `https://sync.yourdomain.com/signup` and create your account. Each subsequent
artist/label/agency that signs up gets their own fully isolated tenant.

## Local development (on a machine with Node 20+ and Docker)

```bash
docker compose up -d db
cd server && cp ../.env.example .env && npm install && npx prisma generate && npx prisma db push && npm run dev
cd ../web && npm install && npm run dev   # http://localhost:5173, proxies /api to :4000
```

## Day-to-day usage

1. **Settings** - add your OpenAI API key and SMTP sending credentials (e.g. a Gmail
   app password, or any SMTP provider).
2. **Catalog** - add tracks, upload WAV/instrumental/stems, generate an AI description.
3. **Catalog -> track -> Rights clearance** - fill in ownership/sample details, optionally
   get an AI suggestion, then give **human final approval** - this is the only way a
   track becomes pitchable.
4. **Companies / Contacts** - add manually or import a CSV you've sourced yourself.
5. **Opportunities** - log a brief, then "Run matching" to score your whole catalogue
   against it.
6. **Matches** - review scores/reasons, approve the worthwhile ones (only rights-approved
   tracks are approvable).
7. **Outreach** - generate a draft pitch, review/edit it, then "Approve & send".
8. **Deals & Royalties** - log licensing deals and track payments/royalties received.
