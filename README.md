# RoomWave

Современное Next.js приложение для совместного прослушивания музыки в real-time комнатах: серверы в стиле Discord, UI в духе Apple Music, синхронизация через Socket.IO, локальная загрузка треков, TTML lyrics и adapter для Apple Music metadata.

## Stack

- Next.js + React + TypeScript
- Tailwind CSS + Radix UI style primitives + Framer Motion
- Socket.IO custom server
- PostgreSQL + Prisma
- Storage adapter with local dev storage in `public/uploads` and S3-ready env placeholders
- HTMLAudioElement playback with server-time drift correction

## Local Setup

1. Создайте `.env` из `.env.example`.
2. Поднимите PostgreSQL:

```bash
docker compose up -d
```

3. Установите зависимости и примените миграции:

```bash
npm install
npm run prisma:migrate
```

4. Запустите приложение:

```bash
npm run dev
```

Приложение будет доступно на `http://localhost:3000`.

## Apple Music

Если `APPLE_MUSIC_DEVELOPER_TOKEN` не задан, search adapter работает в fallback mode и возвращает только mock metadata. Реализация не скачивает DRM-контент и импортирует только легальные metadata/preview URL, если Apple Music API их отдает.

## Production Notes

- Invite links use `/invite/[serverId]` and add authenticated users to the server.
- Server owners can rename/delete servers from the server overview.
- API routes for login, registration, Apple Music import/search, security settings and track upload have in-memory rate limiting for dev/single-node deployments.
- `lib/storage.ts` isolates file writes. Local storage is used by default; S3-compatible integration can be attached behind the same interface.
- `server.ts` includes Socket.IO signaling events for WebRTC voice (`voice:signal`) while audio playback remains synchronized through the room player.
- `proxy.ts` adds baseline security headers for production deployment.

## Key Files

- `server.ts` - Next + Socket.IO server and realtime playback events.
- `lib/storage.ts` and `lib/rate-limit.ts` - production adapters for files and abuse protection.
- `prisma/schema.prisma` - users, servers, rooms, queue, player state, tracks, lyrics.
- `lib/realtime/room-store.ts` - database operations for synchronized room state.
- `lib/ttml.ts` and `lib/ttml.server.ts` - TTML parsing and active line logic.
- `components/MusicRoom.tsx` and `components/SyncedPlayer.tsx` - room shell and synchronized audio player.
