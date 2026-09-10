# Outbox22 - Email Scheduler

A production-grade email scheduling service + dashboard.

---

## Architecture

`
Browser (React + TypeScript + Tailwind)
    |
    |  Google OAuth -> JWT
    v
Backend (Express + TypeScript)  :5000
    |
    |-- POST /api/emails/schedule  -> DB record + BullMQ delayed jobs
    |-- GET  /api/emails           -> List emails with status filter
    |-- GET  /api/emails/search    -> Elasticsearch full-text search
    +-- /admin/queues              -> Bull Board live queue dashboard
    |
    |-- PostgreSQL  (emails, users, recipients)
    |-- Redis       (BullMQ job queue + rate limiter)
    +-- Elasticsearch (email search index)
`

---

## Tech Stack

| Layer      | Technology                                  |
|------------|---------------------------------------------|
| Backend    | TypeScript, Express.js                      |
| Queue      | BullMQ + Redis                              |
| Database   | PostgreSQL + Prisma ORM                     |
| Search     | Elasticsearch 8.x                           |
| Email      | Nodemailer + Gmail SMTP                     |
| Auth       | Google OAuth 2.0 + JWT                      |
| Frontend   | React 18 + TypeScript + Tailwind CSS + Vite |
| Queue UI   | Bull Board                                  |

---

## Prerequisites

Install these before starting:

- Node.js 18+  ->  https://nodejs.org/
- Docker Desktop (for Postgres, Redis, Elasticsearch)  ->  https://www.docker.com/products/docker-desktop/
- A Gmail account with an App Password generated  ->  https://myaccount.google.com/apppasswords
- Google Cloud OAuth credentials (for login)

---

## Full Setup - Step by Step

### STEP 1 - Open the project folder

`powershell
cd C:\Users\hp\Desktop\outbox22
`

---

### STEP 2 - Start Infrastructure (Docker)

> Make sure Docker Desktop is running first!

`powershell
cd backend
docker-compose up -d
`

Wait ~30 seconds for all services to be healthy. Verify with:

`powershell
docker ps
`

Services started:

| Service       | Port |
|---------------|------|
| PostgreSQL    | 5434 |
| Redis         | 6379 |
| Elasticsearch | 9200 |

---

### STEP 3 - Configure Backend .env

The file is already at backend/.env. Fill in your Google OAuth credentials:

`powershell
notepad backend\.env
`

Required - set these values:

`env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
`

Optional (for Slack notifications):

`env
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
`

---

### STEP 4 - Install Backend Dependencies

`powershell
cd backend
npm install
`

---

### STEP 5 - Run Database Migrations (first time only)

`powershell
cd backend
npx prisma migrate dev --name init
`

---

### STEP 6 - Start Backend Server

`powershell
cd backend
npm run dev
`

Backend runs at:       http://localhost:5000
Bull Board dashboard:  http://localhost:5000/admin/queues  (login: admin / admin123)

---

### STEP 7 - Configure Frontend .env.local

`powershell
notepad frontend\.env.local
`

Set the same Google Client ID:

`env
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
`

---

### STEP 8 - Install and Start Frontend

Open a NEW terminal window, then:

`powershell
cd C:\Users\hp\Desktop\outbox22\frontend
npm install
npm run dev
`

Frontend runs at: http://localhost:3000

---

### STEP 9 - Send Emails from CSV (Gmail SMTP)

To immediately send real emails to all 3 addresses in msingh7763@gmail.csv:

`powershell
cd C:\Users\hp\Desktop\outbox22
node send-emails.js
`

Credentials are stored in .env at the project root. Edit that file to change the subject or Gmail account.

---

## Quick Reference - Commands Summary

`powershell
# 1. Start all Docker services (PostgreSQL, Redis, Elasticsearch)
cd C:\Users\hp\Desktop\outbox22\backend
docker-compose up -d

# 2. Install backend packages
cd C:\Users\hp\Desktop\outbox22\backend
npm install

# 3. Run DB migrations (first time only)
cd C:\Users\hp\Desktop\outbox22\backend
npx prisma migrate dev --name init

# 4. Start backend  [Terminal 1]
cd C:\Users\hp\Desktop\outbox22\backend
npm run dev

# 5. Install frontend packages
cd C:\Users\hp\Desktop\outbox22\frontend
npm install

# 6. Start frontend  [Terminal 2]
cd C:\Users\hp\Desktop\outbox22\frontend
npm run dev

# 7. Send CSV emails directly via Gmail (no backend needed)
cd C:\Users\hp\Desktop\outbox22
node send-emails.js

# 8. Stop all Docker services
cd C:\Users\hp\Desktop\outbox22\backend
docker-compose down
`

---

## Google OAuth Setup (One-Time)

1. Go to https://console.cloud.google.com/
2. Create a project -> APIs & Services -> Credentials
3. Click Create Credentials -> OAuth client ID
4. Application type: Web application
5. Authorized JavaScript origins: http://localhost:3000
6. Copy Client ID and paste into both:
   - backend/.env       -> GOOGLE_CLIENT_ID=...
   - frontend/.env.local -> VITE_GOOGLE_CLIENT_ID=...
7. Restart both servers after saving

---

## Gmail SMTP Setup (One-Time)

1. Go to https://myaccount.google.com/apppasswords
2. Enable 2-Step Verification if not already on
3. Generate an App Password -> copy the 16-char code
4. Open .env at the project root and set:

`env
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_SUBJECT=Hello from Outbox22!
`

Then run:

`powershell
node send-emails.js
`

---

## Slack OAuth Setup (Optional)

1. Go to https://api.slack.com/apps -> Create New App
2. Add scopes: chat:write, incoming-webhook
3. Add redirect URL: http://localhost:5000/api/slack/callback
4. Copy Client ID and Client Secret -> add to backend/.env
5. In the app dashboard, click Connect Slack

---

## Project Structure

`
outbox22/
|-- .env                    <- Gmail SMTP credentials (root level)
|-- send-emails.js          <- Standalone email sender script
|-- msingh7763@gmail.csv    <- CSV with recipient email addresses
|
|-- backend/
|   |-- .env                <- Backend config (DB, Redis, OAuth, JWT)
|   |-- docker-compose.yml  <- PostgreSQL + Redis + Elasticsearch
|   |-- prisma/
|   |   +-- schema.prisma   <- Database schema
|   +-- src/
|       |-- config/         <- Environment config loader
|       |-- lib/            <- Redis, Prisma, Elasticsearch, Mailer
|       |-- middleware/     <- JWT auth middleware
|       |-- queues/         <- BullMQ queue, worker, Bull Board
|       |-- routes/         <- Express route handlers
|       |-- services/       <- Rate limiter, Slack notifier
|       |-- app.ts          <- Express app factory
|       +-- server.ts       <- Entry point
|
+-- frontend/
    |-- .env.local          <- Frontend env (API URL, Google Client ID)
    +-- src/
        |-- api/            <- API client modules
        |-- components/     <- ComposeEmailModal, SlackConnect
        |-- context/        <- AuthContext
        |-- pages/          <- Login, Dashboard
        +-- types.ts        <- TypeScript interfaces
`

---

## API Reference

### Auth

| Method | Endpoint             | Description                        |
|--------|----------------------|------------------------------------|
| POST   | /api/auth/register   | Register with email + password     |
| POST   | /api/auth/login      | Login with email + password        |
| POST   | /api/auth/google     | Exchange Google credential for JWT |
| GET    | /api/auth/me         | Get current user info              |

### Emails

| Method | Endpoint                        | Description                       |
|--------|---------------------------------|-----------------------------------|
| POST   | /api/emails/schedule            | Schedule an email campaign        |
| GET    | /api/emails?status=scheduled    | List scheduled emails             |
| GET    | /api/emails?status=sent         | List sent emails                  |
| GET    | /api/emails/search?q=keyword    | Full-text search (Elasticsearch)  |
| GET    | /api/emails/:id                 | Get single email detail           |

### Slack

| Method | Endpoint                | Description                           |
|--------|-------------------------|---------------------------------------|
| GET    | /api/slack/status       | Check Slack connection status         |
| GET    | /api/slack/connect      | Start Slack OAuth flow                |
| GET    | /api/slack/callback     | OAuth callback (Slack redirects here) |
| DELETE | /api/slack/disconnect   | Remove Slack token                    |

---

## Bull Board Queue Dashboard

Live queue monitor at: http://localhost:5000/admin/queues

- Default login: admin / admin123
- Shows: waiting, delayed, active, completed, failed jobs
- Retry or remove jobs manually from the UI

---

## Environment Variables Reference

### backend/.env

| Variable                         | Default                         | Description                    |
|----------------------------------|---------------------------------|--------------------------------|
| PORT                             | 5000                            | Backend server port            |
| DATABASE_URL                     | postgresql://admin:secret@...   | PostgreSQL connection string   |
| REDIS_URL                        | redis://localhost:6379          | Redis connection URL           |
| ELASTICSEARCH_URL                | http://localhost:9200           | Elasticsearch URL              |
| JWT_SECRET                       | (required)                      | Secret for JWT signing         |
| GOOGLE_CLIENT_ID                 | (required)                      | Google OAuth Client ID         |
| GOOGLE_CLIENT_SECRET             | (required)                      | Google OAuth Client Secret     |
| SLACK_CLIENT_ID                  | (optional)                      | Slack App Client ID            |
| SLACK_CLIENT_SECRET              | (optional)                      | Slack App Client Secret        |
| MAX_EMAILS_PER_HOUR_PER_SENDER   | 200                             | Rate limit per sender per hour |
| WORKER_CONCURRENCY               | 5                               | BullMQ worker concurrency      |
| MIN_DELAY_BETWEEN_EMAILS_MS      | 2000                            | Min delay between email sends  |
| BULL_BOARD_USER                  | admin                           | Bull Board username            |
| BULL_BOARD_PASSWORD              | admin123                        | Bull Board password            |

### frontend/.env.local

| Variable                | Description                    |
|-------------------------|--------------------------------|
| VITE_API_BASE_URL       | Backend URL (default: :5000)   |
| VITE_GOOGLE_CLIENT_ID   | Google OAuth Client ID         |

### .env (project root - Gmail sender)

| Variable              | Description                          |
|-----------------------|--------------------------------------|
| GMAIL_USER            | Gmail address to send FROM           |
| GMAIL_APP_PASSWORD    | Gmail App Password (16-char code)    |
| EMAIL_SUBJECT         | Subject line for outgoing emails     |

---

## Rate Limiting Design

- Per-sender hourly limit enforced via Redis atomic Lua script
- Key pattern: rate:{userId}:{fromEmail}:{YYYY-MM-DDTHH}
- When limit is hit: job is moved to next hour window (NOT dropped), Slack notification sent
- Default: 200 emails/sender/hour (configurable via MAX_EMAILS_PER_HOUR_PER_SENDER)

---

## Idempotency

- Each schedule request hashes {userId}:{subject}:{startTime}:{recipients} with SHA-256
- Duplicate requests return the existing email ID - no double-sends
- BullMQ jobs have deterministic IDs: email_{emailId}_{recipientId}

---

## Restart Safety

- Redis uses AOF persistence (--appendonly yes) - jobs survive Redis restarts
- Delayed jobs are stored in Redis sorted sets - worker picks them up after restart
- No in-memory state - safe to restart the backend server at any time

---

Built with love for the ReachInbox intern assignment.