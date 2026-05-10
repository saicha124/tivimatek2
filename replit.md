# IPTV Player (Stalker / M3U / Xtream)

A full-featured IPTV player app supporting Stalker Portal, M3U playlists, and Xtream Codes. Built as a pnpm monorepo with an Expo (React Native) frontend and an Express API server backend.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, external port 80)
- `pnpm --filter @workspace/iptv-player run dev` — run the Expo IPTV player (port 3000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: Expo 54 (React Native + Web), expo-router, expo-av, @tanstack/react-query

## Where things live

- `artifacts/api-server/` — Express backend
  - `src/routes/stalker.ts` — Stalker portal proxy (avoids CORS, forwards to portal with proper MAG headers)
  - `src/routes/health.ts` — health check
- `artifacts/iptv-player/` — Expo app
  - `context/IPTVContext.tsx` — all playlist state, Stalker fetch logic, stream URL resolution
  - `app/index.tsx` — main screen
  - `app/player.tsx` — video player
  - `app/settings.tsx` — settings
  - `components/` — all UI components
- `lib/db/` — Drizzle ORM schema + connection
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API)
- `lib/api-zod/` — generated Zod schemas
- `lib/api-client-react/` — generated React Query hooks

## Architecture decisions

- **Stalker proxy on server side**: Stalker portals don't set CORS headers, so the browser-based Expo web app can't call them directly. All Stalker API calls are proxied through the Express server at `/api/stalker/proxy`.
- **Stalker URL scheme**: Stalker channels/VOD/series store URLs as `stalker-cmd:`, `stalker-vod:`, `stalker-series:` prefixed strings. These are resolved to real stream URLs via `create_link` at play time (not upfront), to avoid 1900+ API calls on load.
- **Token management**: Stalker session token is obtained via `handshake` once at playlist-add time and stored in the Playlist object. It is refreshed automatically on next play if missing.
- **Parallel batch loading**: Channels/VOD/series are fetched in parallel batches of 15 pages to minimize load time.
- **Proxy URL**: `https://${EXPO_PUBLIC_DOMAIN}/api/stalker/proxy` — port 8080 maps to external port 80 (main domain), so `EXPO_PUBLIC_DOMAIN` (= `REPLIT_DEV_DOMAIN`) points to the API server.

## Product

- Add IPTV playlists via M3U URL, Xtream Codes, or Stalker Portal (MAC address auth)
- Browse 1900+ live TV channels organized by genre groups
- Browse 5000+ movies and 1500+ series
- EPG program guide grid view
- Favorites, hidden channels/groups, watch history
- Video playback with Picture-in-Picture
- Recordings scheduler and program reminders
- Search across channels, movies, series

## User preferences

_Populate as you build._

## Gotchas

- Stalker portals need the correct MAC address; token expires per session
- The `get_all_channels` ITV endpoint sometimes returns localhost cmd URLs — these must be resolved via `create_link`
- Expo AV is deprecated in SDK 54; should migrate to expo-video/expo-audio eventually
- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
