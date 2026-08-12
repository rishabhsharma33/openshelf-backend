# OpenShelf Backend

OpenShelf is a community-driven platform that enables users to list, discover, lend, and borrow physical books with people nearby, with book trading planned for later. This repository contains the backend API, built with NestJS, Prisma, and PostgreSQL.

## Features

- User authentication (JWT-based register/login)
- User profiles (view/update, with password never exposed)
- Book listings — create/read/update/delete, owner-only mutations
- Book search, filtering (genre/language/condition/status), and sorting
- Location-based discovery (filter by city/state, or `nearMe` using your own profile location)
- Book cover images via Cloudinary (upload/replace/remove)
- Lending workflow — request to borrow, accept/reject/cancel, return, with automatic handling of competing requests on the same book
- Production hardening — centralized Prisma error handling, env var validation at boot, rate limiting, security headers, health check, graceful shutdown
- Wishlist, ratings & reviews, and book trading _(planned)_

## Tech Stack

- [NestJS](https://nestjs.com/) — Node.js framework
- [PostgreSQL](https://www.postgresql.org/) (hosted on [Neon](https://neon.tech/), pooled connection)
- [Prisma](https://www.prisma.io/) — ORM
- Passport + JWT — authentication
- bcrypt — password hashing
- [Cloudinary](https://cloudinary.com/) — book cover image storage
- class-validator / class-transformer — request validation
- helmet — security headers
- @nestjs/throttler — rate limiting
- Jest — unit tests
- [Bruno](https://www.usebruno.com/) — API testing (collection checked into `bruno/`)

## Project Structure

```
src/
├── app.module.ts
├── main.ts
├── auth/               # Registration, login, JWT strategy, guard, @CurrentUser() decorator
├── users/               # Profile view/update
├── books/                # Book CRUD, search/filter/location, cover images
├── lending-requests/      # Borrow request lifecycle
├── cloudinary/            # Cloudinary upload/delete wrapper
├── prisma/                 # PrismaService / PrismaModule
├── common/filters/          # Global Prisma exception filter
├── config/                   # Env var validation schema
└── health/                    # GET /health
prisma/
├── schema.prisma
└── migrations/
bruno/                          # Bruno API collection, mirrors the modules above
```

## Getting Started

### Prerequisites

- Node.js (LTS)
- npm
- A PostgreSQL database (e.g. a free [Neon](https://neon.tech/) instance)
- A [Cloudinary](https://cloudinary.com/) account (free tier is fine) for book cover images

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root (see `.env.example`):

| Variable                | Required | Description                                                                                                                      |
| ----------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | Yes      | Pooled Postgres connection string (Neon: the `-pooler` host, with `?pgbouncer=true` appended)                                    |
| `DIRECT_URL`            | Yes      | Direct (non-pooled) Postgres connection string, used only by Prisma Migrate                                                      |
| `PORT`                  | No       | Port the server listens on (defaults to `3000`)                                                                                  |
| `JWT_SECRET`            | Yes      | Secret used to sign JWT access tokens                                                                                            |
| `JWT_EXPIRES_IN`        | Yes      | JWT expiry (e.g. `1d`, `15m`)                                                                                                    |
| `BCRYPT_SALT_ROUNDS`    | Yes      | Salt rounds used when hashing passwords with bcrypt                                                                              |
| `CLOUDINARY_CLOUD_NAME` | Yes      | Cloudinary account cloud name                                                                                                    |
| `CLOUDINARY_API_KEY`    | Yes      | Cloudinary API key                                                                                                               |
| `CLOUDINARY_API_SECRET` | Yes      | Cloudinary API secret                                                                                                            |
| `CORS_ORIGIN`           | No       | Comma-separated list of allowed origins. Defaults to allowing any origin (no frontend exists yet) — lock this down once one does |

Missing or malformed required variables cause the app to fail immediately at startup with a clear error, rather than failing wherever they're first used.

> **Note on Neon connection pooling:** `DATABASE_URL` should be the pooled endpoint (hostname contains `-pooler`) with `pgbouncer=true` appended, since transaction-mode pooling doesn't support Prisma's prepared statements well. `DIRECT_URL` should be the plain (non-pooler) endpoint — Prisma Migrate needs a direct connection for advisory locks, which the pooler doesn't support.

### Database Setup

Apply Prisma migrations and generate the client:

```bash
npx prisma migrate dev
npx prisma generate
```

### Running the App

```bash
# development (watch mode)
npm run start:dev

# production build
npm run build
npm run start:prod
```

Once running, `GET /health` reports `{ "status": "ok", "database": "connected" }` if the app and database are both reachable.

### Testing

**Unit tests** (Jest, mocked Prisma — no real database needed):

```bash
npm run test        # unit tests
npm run test:watch  # watch mode
npm run test:cov    # coverage
```

**API tests** (Bruno, against a running server and real database):

```bash
npx -y @usebruno/cli run bruno --env Local -r
# or run a single module's folder, e.g.:
npx -y @usebruno/cli run bruno/books --env Local -r
```

Open the `bruno/` folder in the [Bruno app](https://www.usebruno.com/) to run requests interactively instead. Select the **Local** environment first — it holds `baseUrl` and the tokens/ids that get filled in automatically as you run requests (e.g. logging in sets `accessToken`, creating a book sets `bookId`).

## API Endpoints

### Auth (`/auth`)

| Method | Endpoint         | Auth | Description                           |
| ------ | ---------------- | ---- | ------------------------------------- |
| POST   | `/auth/register` | —    | Register a new user                   |
| POST   | `/auth/login`    | —    | Log in and receive a JWT access token |

`/auth/login` and `/auth/register` are rate-limited (5 requests/minute per IP) separately from the global default (100/minute).

### Users (`/users`)

| Method | Endpoint    | Auth | Description                                               |
| ------ | ----------- | ---- | --------------------------------------------------------- |
| GET    | `/users/me` | JWT  | Get your own profile (password never returned)            |
| PATCH  | `/users/me` | JWT  | Update `name`/`phone`/`city`/`state`/`bio`/`profileImage` |

### Books (`/books`)

| Method | Endpoint           | Auth | Description                                                                                                                  |
| ------ | ------------------ | ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/books`           | JWT  | Create a book (you become the owner)                                                                                         |
| GET    | `/books`           | JWT  | List books — supports `search`, `genre`, `language`, `condition`, `status`, `city`, `state`, `nearMe`, `sortBy` query params |
| GET    | `/books/:id`       | JWT  | Get a single book                                                                                                            |
| PATCH  | `/books/:id`       | JWT  | Update a book (owner only)                                                                                                   |
| DELETE | `/books/:id`       | JWT  | Delete a book (owner only; blocked with a 409 if it has lending history)                                                     |
| POST   | `/books/:id/image` | JWT  | Upload/replace the cover image (owner only, multipart, jpeg/png/webp, max 5MB)                                               |
| DELETE | `/books/:id/image` | JWT  | Remove the cover image (owner only)                                                                                          |

### Lending Requests (`/lending-requests`)

| Method | Endpoint                       | Auth | Description                                                                                                                   |
| ------ | ------------------------------ | ---- | ----------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/lending-requests`            | JWT  | Request to borrow a book                                                                                                      |
| GET    | `/lending-requests/sent`       | JWT  | Requests you've made                                                                                                          |
| GET    | `/lending-requests/received`   | JWT  | Requests on books you own                                                                                                     |
| GET    | `/lending-requests/:id`        | JWT  | Get a single request (requester or owner only)                                                                                |
| PATCH  | `/lending-requests/:id/accept` | JWT  | Accept a pending request (owner only) — also auto-rejects other pending requests on the same book and marks the book borrowed |
| PATCH  | `/lending-requests/:id/reject` | JWT  | Reject a pending request (owner only)                                                                                         |
| PATCH  | `/lending-requests/:id/cancel` | JWT  | Cancel your own pending request (requester only)                                                                              |
| PATCH  | `/lending-requests/:id/return` | JWT  | Mark an accepted request as returned (owner only) — marks the book available again                                            |

### Health

| Method | Endpoint  | Auth | Description                        |
| ------ | --------- | ---- | ---------------------------------- |
| GET    | `/health` | —    | Liveness check; pings the database |

## CI

`.github/workflows/ci.yml` runs on every push/PR to `dev` and `main`: type check, lint, unit tests, and build. It needs no secrets — `prisma generate` only reads `schema.prisma` and doesn't touch the database, so nothing in CI talks to Neon or Cloudinary. The Bruno collection (real API + real database + real Cloudinary) stays a manual/local step, not part of CI.

## Deployment

Deployed on [Render](https://render.com/) as a plain Node web service — no Docker. `render.yaml` in the repo root is a Render Blueprint describing the service; either use it directly (Render dashboard → **New** → **Blueprint** → point at this repo) or configure a Web Service manually with the same settings:

- **Branch:** `dev` (per this project's workflow — `dev` is the branch that gets deployed, `main` is not)
- **Build command:** `npm ci && npx prisma generate && npx prisma migrate deploy && npm run build`
- **Start command:** `npm run start:prod`
- **Health check path:** `/health`

`prisma migrate deploy` (not `migrate dev`) runs on every deploy, before the new build starts serving traffic — it applies any pending migrations non-interactively against `DIRECT_URL` and never prompts or resets data.

Whichever way you set it up, add all the variables listed in [Environment Variables](#environment-variables) in Render's dashboard (**Environment** tab) — `render.yaml` lists the required keys but deliberately doesn't store their values (`sync: false`), since those are secrets. Don't set `PORT` — Render injects its own and the app already respects `process.env.PORT`.

Render auto-deploys on every push to `dev` once connected, so merging a feature branch into `dev` and pushing (the existing workflow) is the entire deploy step going forward.

## Status

🚧 Actively under development.
