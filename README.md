# OpenShelf Backend

OpenShelf is a community-driven platform that enables users to lend, borrow, and eventually trade physical books with people nearby. This repository contains the backend API, built with NestJS, Prisma, and PostgreSQL.

## Features

- User Authentication (JWT-based register/login)
- Book Listings *(planned)*
- Book Lending Requests *(planned)*
- Wishlist *(planned)*
- Ratings & Reviews *(planned)*
- Local Discovery *(planned)*

## Tech Stack

- [NestJS](https://nestjs.com/) — Node.js framework
- [PostgreSQL](https://www.postgresql.org/) (hosted on [Neon](https://neon.tech/))
- [Prisma](https://www.prisma.io/) — ORM
- Passport + JWT — authentication
- bcrypt — password hashing
- Cloudinary — media storage
- class-validator / class-transformer — request validation

## Project Structure

```
src/
├── app.module.ts
├── main.ts
├── auth/            # Registration, login, JWT strategy
├── users/           # User resource (in progress)
└── prisma/          # PrismaService / PrismaModule
prisma/
├── schema.prisma
└── migrations/
```

## Getting Started

### Prerequisites

- Node.js (LTS)
- npm
- A PostgreSQL database (e.g. a free [Neon](https://neon.tech/) instance)

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root with the following variables:

| Variable             | Description                                              |
| -------------------- | ---------------------------------------------------------|
| `DATABASE_URL`       | PostgreSQL connection string                              |
| `PORT`               | Port the server listens on                                 |
| `JWT_SECRET`         | Secret used to sign JWT access tokens                      |
| `JWT_EXPIRES_IN`     | JWT expiry (e.g. `1d`, `15m`)                               |
| `BCRYPT_SALT_ROUNDS` | Salt rounds used when hashing passwords with bcrypt         |

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

### Testing

```bash
npm run test        # unit tests
npm run test:e2e    # e2e tests
npm run test:cov    # coverage
```

## API Endpoints

### Auth (`/auth`)

| Method | Endpoint         | Description                          |
| ------ | ---------------- | ------------------------------------- |
| POST   | `/auth/register` | Register a new user                   |
| POST   | `/auth/login`    | Log in and receive a JWT access token |

## Status

🚧 Currently under development.
