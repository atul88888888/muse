# Server infrastructure notes (45.81.7.143)

This server also runs another app, `obso`, at `/opt/obso`, behind the same shared
Caddy instance. These notes record the changes made there so a future redeploy
doesn't quietly undo them.

## What changed in `/opt/obso`

- `docker-compose.yml`: added `8080:8080` to the `caddy` service's `ports`, and
  attached `caddy` to an extra external network `sync_licensing_net` (aliased to
  `sync-licensing-platform_default`) so it can reach this app's `web` container
  by name. Backups of the pre-change files are at
  `/opt/obso/docker-compose.yml.bak.*` and `/opt/obso/Caddyfile.bak.*`.
- `Caddyfile`: appended a new, separate `:8080 { reverse_proxy web:80 }` block
  after obso's existing `:80` block. obso's own routing is untouched.

## Current state

- `obso` - unchanged behaviour, still on `:80` at `/obso/`.
- Sync Licensing Platform - reachable at `http://45.81.7.143:8080` (plain HTTP;
  bare IP means Caddy can't get a Let's Encrypt cert).

## When you get a domain

1. Point an A record at `45.81.7.143`.
2. Replace the `:8080 { ... }` block in `/opt/obso/Caddyfile` with:
   ```
   sync.yourdomain.com {
       reverse_proxy web:80
   }
   ```
   Caddy will then auto-provision HTTPS - no other change needed.
3. You can then drop the `8080:8080` port mapping from `/opt/obso/docker-compose.yml`
   and re-run `docker compose up -d caddy` there.
4. Update `PUBLIC_URL` in `/opt/sync-licensing-platform/.env` to the new
   `https://sync.yourdomain.com`, then `docker compose up -d` in that directory.

## If `obso`'s CI ever redeploys the whole stack (not just `app`)

The network attachment is now declared in `obso`'s compose file (not just an
imperative `docker network connect`), so it should survive a `docker compose up`
there. If the sync-licensing containers are ever torn down and recreated under a
different Docker Compose project name, re-check that the network name referenced
in `/opt/obso/docker-compose.yml` (`sync-licensing-platform_default`) still matches.
