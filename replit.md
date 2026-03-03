# AniFun - Anime Streaming & Discovery Platform

## Overview

AniFun is a full-stack anime discovery and streaming platform. Users can browse, search, and watch anime with features like bookmarking, watch history tracking, and trending lists. The app pulls anime metadata from the Jikan API (MyAnimeList) and streams video content through multiple anime provider libraries (`@consumet/extensions` and `aniwatch`).

The project follows a monorepo structure with a React frontend (Vite), an Express backend, a PostgreSQL database with Drizzle ORM, and optional user authentication (bcryptjs for password hashing, session-based with fallback to anonymous session IDs).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Directory Structure
- `client/` — React frontend (Vite, TypeScript)
- `server/` — Express backend (TypeScript)
- `shared/` — Shared code between client and server (schema, types)
- `migrations/` — Drizzle database migration files
- `script/` — Build scripts

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Bundler**: Vite with HMR support via `server/vite.ts` in development
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state; no global client state library
- **UI Components**: shadcn/ui (new-york style) with Radix UI primitives, Tailwind CSS, and class-variance-authority
- **Styling**: Tailwind CSS with CSS variables for theming (dark mode only, monochrome palette)
- **Video Player**: Custom HLS.js-based video player component (`client/src/components/video-player.tsx`) with skip intro/outro buttons, auto-play next episode with countdown, custom subtitle renderer (proxied VTT), and mobile-optimized touch controls
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Key Pages
- `/` — Home with hero section, continue watching, and anime rows
- `/browse` — Search and filter anime with pagination
- `/anime/:id` — Anime detail with episodes, characters, seasons, recommendations, share button, user ratings
- `/watch/:animeId/:episodeNum` — Video player page with episode navigation and progress tracking
- `/trending` — Trending anime lists with skeleton loading
- `/bookmarks` — User's bookmarked anime
- `/history` — Watch history
- `/genres` — Genre/category browsing page with icon cards linking to browse filters
- `/login` — Login/Register page with anime avatar selection
- `/profile` — User profile management (edit username, email, avatar, password)
- `/support` — Contact support page (Telegram @FNxELECTRA, email electraop09@gmail.com)
- 404 page — Themed with search bar, quick links, and genre suggestions

### Backend Architecture
- **Framework**: Express.js with TypeScript, running on Node.js
- **Server Entry**: `server/index.ts` creates HTTP server, registers routes, serves static files in production or sets up Vite dev middleware in development
- **API Design**: RESTful endpoints under `/api/` prefix
- **Session Management**: `express-session` with `connect-pg-simple` for PostgreSQL-backed sessions
- **Caching**: In-memory cache (`Map`) with 5-minute TTL for Jikan API responses to handle rate limiting

### API Layer
- **Jikan API Proxy**: `/api/jikan/*` endpoints proxy requests to `https://api.jikan.moe/v4` with caching and automatic retry on 429 (rate limit) responses
- **Anime Streaming**: Uses `@consumet/extensions` (AnimeKai, AnimePahe providers) and `aniwatch` (HiAnime scraper) to search for and stream anime episodes
- **Auth API**: Register, login, logout, profile update (`/api/auth/*`) with bcryptjs password hashing
- **Bookmarks API**: CRUD operations for user/session-scoped bookmarks (`/api/bookmarks`)
- **Watch History API**: Track and retrieve watch history with progress (`/api/history`, `/api/continue-watching`, `/api/history/progress`)
- **Comments API**: Full comment system with replies, likes, edit/delete (`/api/comments`). Requires authentication. Supports nested replies (one level deep) and like toggling.

### Database
- **Database**: PostgreSQL (required, connection via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema validation
- **Schema** (in `shared/schema.ts`):
  - `users` — User accounts (id, username, email, passwordHash, avatarUrl, createdAt)
  - `bookmarks` — Stores anime bookmarks per user/session (id, animeId, title, imageUrl, score, episodes, status, synopsis, sessionId)
  - `watchHistory` — Stores episode watch history with progress (id, animeId, episodeNumber, title, imageUrl, sessionId, watchedAt, watchProgress, videoDuration)
  - `comments` — Episode comments with threading (id, animeId, episodeNumber, userId, parentId, content, likes, createdAt, updatedAt)
  - `commentLikes` — Tracks which users liked which comments (id, commentId, userId, createdAt)
  - `ratings` — User anime ratings (id, animeId, userId, score 1-10, createdAt; unique per user+anime)
- **Migrations**: Use `drizzle-kit push` (`npm run db:push`) to sync schema to database
- **Storage Pattern**: `IStorage` interface in `server/storage.ts` with `DatabaseStorage` implementation, exported as singleton `storage`

### Build System
- **Development**: `tsx server/index.ts` with Vite dev server middleware for HMR
- **Production Build**: Custom script (`script/build.ts`) that builds the client with Vite and bundles the server with esbuild. Server dependencies are selectively bundled (allowlisted) or externalized to optimize cold start times
- **Output**: `dist/public/` for client assets, `dist/index.cjs` for server bundle

### Data Flow
1. Client makes API requests to Express server
2. For anime metadata: Server proxies to Jikan API with caching
3. For streaming: Server uses consumet/aniwatch libraries to find and resolve stream URLs
4. For user data (bookmarks, history): Server reads/writes to PostgreSQL via Drizzle, scoped by session ID
5. For user data (bookmarks, history): Server reads/writes to PostgreSQL via Drizzle, scoped by session ID
6. Optional user authentication — logged-in users get `user:{id}` session keys; anonymous users use default session IDs

## Security & Scalability
- **Rate Limiting**: In-memory rate limiting on auth endpoints (login: 10/min, register: 5/min) and comments (10/min per user)
- **Input Sanitization**: All comment content is HTML-escaped server-side to prevent XSS
- **Cache Management**: In-memory Jikan cache capped at 500 entries with LRU-style pruning
- **Rate Limit Cleanup**: Background interval clears expired rate limit entries every 60s
- **Database Indexes**: Optimized indexes on comments (anime_id+episode_number, user_id, parent_id), comment_likes (comment_id), watch_history (session_id+watched_at), bookmarks (session_id)
- **Session Management**: `saveUninitialized: false` to prevent filling session table with anonymous sessions; sessions only created when users authenticate
- **Error Boundaries**: React ErrorBoundary wraps the entire app and router separately for graceful crash recovery
- **Comment Limits**: Max 2000 characters per comment, enforced both client and server side

## External Dependencies

### APIs & Services
- **Jikan API** (`https://api.jikan.moe/v4`) — Free MyAnimeList API for anime metadata, search, rankings, characters, recommendations. Rate-limited (handled with retry + caching).
- **@consumet/extensions** — Library providing anime streaming sources (AnimeKai, AnimePahe providers)
- **aniwatch (HiAnime)** — Anime scraper library for additional streaming sources

### Database
- **PostgreSQL** — Primary database, required. Connection string via `DATABASE_URL` environment variable. Used for sessions, bookmarks, and watch history.

### Key NPM Packages
- **Frontend**: React, Wouter, TanStack React Query, Radix UI, Tailwind CSS, shadcn/ui, hls.js, Lucide icons
- **Backend**: Express, express-session, connect-pg-simple, Drizzle ORM, drizzle-zod, zod, bcryptjs
- **Build**: Vite, esbuild, tsx
- **Fonts**: Google Fonts (DM Sans, Fira Code, Geist Mono, Architects Daughter, Space Grotesk, Cutive Mono, JetBrains Mono)