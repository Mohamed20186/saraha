# Saraha API

A Node.js REST API for account authentication, email verification, and user profiles. Built with Express, MongoDB, and Redis.

> This repository currently implements auth and user features. Anonymous messaging is not implemented yet.

## Features

- Sign up and verify an email address with a six-digit OTP.
- Log in with Argon2-hashed passwords and receive JWT access and refresh tokens.
- Rotate refresh tokens with one-time-use revocation, and log out of all sessions.
- Read and update your profile, view public profiles, and access an admin-only profile route.
- Encrypt optional phone numbers with AES-256-GCM.
- Arabic and English validation/auth messages through the `Accept-Language` header. Some messages remain English-only.

### Email verification rules

- Codes expire after 10 minutes and are stored in Redis as SHA-256 hashes.
- Each code allows at most five incorrect attempts.
- Sending a code starts a 60-second per-email cooldown, including the initial signup email.
- Redis Lua scripts handle code storage, verification, and failure cleanup atomically.
- Login and all authenticated routes require a verified account. This also applies to existing accounts and previously issued tokens when running this version.

## Requirements

- Node.js and npm. The locked application dependencies require at least Node.js 20.19; the test command below was checked with Node.js 22.23.5.
- MongoDB and Redis instances reachable from the application.
- A Gmail account with SMTP access for verification emails. Mail uses `smtp.gmail.com`, port `465`, with TLS.

## Run locally

```bash
git clone https://github.com/Mohamed20186/saraha.git
cd saraha
npm ci
cp .env.example .env.development
```

Edit `.env.development` using the configuration below. Start MongoDB and Redis, then run:

```bash
npm run start:dev
```

The default address is `http://localhost:3000`. Check the root route:

```bash
curl http://localhost:3000/
```

```json
{
  "success": true,
  "message": "Welcome to Saraha API"
}
```

For production mode, create `.env.production` with the appropriate settings and run `npm run start:prod`. This starts the application; it does not deploy it or configure HTTPS.

## Configuration

The configuration loader reads `.env.<NODE_ENV>` from the project root. The npm scripts set `NODE_ENV` to `development` or `production`.

The checked-in `.env.example` is incomplete: add `REDIS_URI`, `EMAIL_USER`, and `EMAIL_PASS` to your local environment file.

| Variable | Purpose / example |
| --- | --- |
| `PORT` | HTTP port, defaults to `3000` |
| `DB_URL` | MongoDB connection string, e.g. `mongodb://127.0.0.1:27017/saraha` |
| `REDIS_URI` | Redis connection string, e.g. `redis://127.0.0.1:6379` |
| `ENC_KEY` | A private, Base64-encoded 32-byte encryption key |
| `ALGORITHM` | Set to `aes-256-gcm` |
| `TOKEN_ALGORITHM` | Set to `HS256` for symmetric JWT signing |
| `JWT_ACCESS_ADMIN_SECRET` | Private admin access-token signing secret |
| `JWT_REFRESH_ADMIN_SECRET` | Private admin refresh-token signing secret |
| `JWT_ACCESS_USER_SECRET` | Private user access-token signing secret |
| `JWT_REFRESH_USER_SECRET` | Private user refresh-token signing secret |
| `ACCESS_EXPIRES_IN` | Access-token lifetime in seconds, e.g. `900` |
| `REFRESH_EXPIRES_IN` | Refresh-token lifetime in seconds, e.g. `604800` |
| `EMAIL_USER` | Gmail SMTP sender address |
| `EMAIL_PASS` | SMTP credential for that Gmail account, such as an app password |

Use a separate, strong random value for each JWT secret. Never commit real credentials or environment files. Keep `ENC_KEY` safe: changing it prevents decrypting phone numbers stored with the old key.

Other entries in `.env.example` are not required for this setup: `ENC_IV_LENGTH` is not used by the encryption helper, which generates a fresh 12-byte IV per encryption; `BCRYPT_SALT_ROUNDS` is not used by signup, which uses Argon2; `GOOGLE_CLIENT_ID` does not enable a Google sign-in endpoint.

## API routes

All paths below are relative to the server address. Send request bodies as JSON with `Content-Type: application/json`.

| Method | Path | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET` | `/` | None | API welcome response |
| `POST` | `/auth/signup` | None | Create an unverified account and send a code |
| `POST` | `/auth/confirm-email` | None | Verify the account with its code |
| `POST` | `/auth/resend-otp` | None | Send a new code for an unverified account |
| `POST` | `/auth/forgot-password` | None | Email a 6-digit reset code (same response whether or not the email exists) |
| `POST` | `/auth/reset-password` | None | Set a new password with `email`, `otp`, `password`, `confirmPassword`; signs out all sessions |
| `POST` | `/auth/login` | None | Get access and refresh tokens |
| `POST` | `/auth/rotate-token` | Refresh token | Replace a refresh token; the old one is revoked |
| `POST` | `/auth/logout` | Refresh token, Bearer only | Log out of all sessions |
| `GET` | `/user/profile` | Access token | Get your own profile |
| `PATCH` | `/user/profile` | Access token | Update your name and/or phone |
| `GET` | `/user/admin-profile` | Admin access token | Get the authenticated admin's profile |
| `GET` | `/user/user-profile/:userId` | None | Get a public profile without password, email, or phone |

Use `Authorization: Bearer <accessToken>` for profile routes and `Authorization: Bearer <refreshToken>` for refresh/logout. The middleware also accepts Basic credentials on authenticated routes other than logout, but token rotation needs an actual refresh token, so use Bearer for that route.

### Signup, verification, and login

#### 1. Sign up

Send `POST /auth/signup` with:

```json
{
  "firstName": "Omar",
  "lastName": "Hassan",
  "email": "omar@example.com",
  "password": "S7!vQ2#kR9",
  "confirmPassword": "S7!vQ2#kR9"
}
```

This is an example password only. Choose your own. Names must be 3-50 characters. Passwords need at least eight characters, uppercase and lowercase letters, a digit, and a non-whitespace special character. A password must not contain either name.

Optional fields: `phone` in Egyptian local mobile format (`01` followed by `0`, `1`, `2`, or `5`, then eight digits), and numeric `gender` (`0` male, `1` female). Role is not accepted in signup input.

#### 2. Confirm your email

Read the code from your email and send `POST /auth/confirm-email`:

```json
{ "email": "omar@example.com", "otp": "123456" }
```

Replace `123456` with the actual code, kept as a string. If needed, send `POST /auth/resend-otp` with `{ "email": "omar@example.com" }` after the cooldown.

#### 3. Log in

Send `POST /auth/login`:

```json
{ "email": "omar@example.com", "password": "S7!vQ2#kR9" }
```

Successful login returns `data.accessToken` and `data.refreshToken`.

### Profile updates and logout

`PATCH /user/profile` accepts at least one of `firstName`, `lastName`, or `phone`. Other fields are rejected. Own-profile responses retain email and the stored encrypted phone value; the public profile excludes both.

For all-session logout, send `POST /auth/logout` with a Bearer refresh token and:

```json
{ "logoutType": 1 }
```

This increments the account's token version, invalidating existing access and refresh tokens on subsequent authenticated requests. Device-only logout (`logoutType: 0`) is not implemented and returns `400`.

Successful auth/profile responses use this shape:

```json
{
  "success": true,
  "message": "...",
  "data": null
}
```

`data` contains the result where applicable. Add `Accept-Language: ar` or `Accept-Language: en` to select supported translations.

## Tests

Run from the repository root after installing dependencies. The temporary encryption key below is test-only and must not be used for application data.

```bash
NODE_ENV=test ENC_KEY=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= ALGORITHM=aes-256-gcm \
  node --experimental-test-module-mocks --test src/tests/*.test.js
```

This command uses POSIX shell syntax. In PowerShell, set those environment variables separately before running the `node` command.

The suite covers encryption, token revocation, auth/profile behavior, and OTP handling. MongoDB and email are mocked. OTP concurrency tests launch a temporary local Redis server; install `redis-server` on your `PATH`, or set `REDIS_SERVER_BINARY` to its executable path. Those concurrency tests are skipped when the binary is unavailable. The suite does not verify live Gmail delivery or a live MongoDB flow.

## Project structure

```text
src/
  common/       Enums, middleware, security helpers, Redis/OTP/mail services
  config/       Environment loading and i18n configuration
  database/     MongoDB/Redis connections and Mongoose models
  locales/      Arabic and English translations
  module/auth/  Authentication routes, services, and validation
  module/user/  User routes, services, and validation
  repo/         Database access helpers
  tests/        Node.js tests
  app.js        Express application
  main.js       Startup and service connections
```

## Operational notes

- MongoDB and Redis are needed for normal startup. Startup also synchronizes Mongoose indexes.
- SMTP verification failure logs a warning and does not stop the server. Signup and resend still require successful email sending.
- OTP cooldowns and attempt limits are not a general API rate limiter. The app does not currently configure general request rate limiting or Helmet.
- There are no anonymous-message, password-reset, or Google sign-in API routes yet.
