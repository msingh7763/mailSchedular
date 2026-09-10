# Outbox22 — Production-Grade Email Scheduler
### Built for ReachInbox Intern Assignment

---

## What Is This?

A **production-grade email scheduling service** that mimics what ReachInbox does under the hood:

- Accept email send requests via REST APIs
- Schedule them to fire at a **specific future time**
- Use **BullMQ + Redis** as a persistent job queue (zero cron jobs)
- Send emails via **Ethereal SMTP** (fake/test SMTP — no real email costs)
- Survive **server restarts** without losing a single job
- Full **React dashboard** to compose, schedule, and monitor emails

---

## Live Demo Stats (Verified Today)

| Metric | Value |
|--------|-------|
| Emails Scheduled & Sent | **4 campaigns** |
| Total Recipients Reached | **9 deliveries** |
| Queue Engine | BullMQ + Redis |
| Email Provider | Ethereal SMTP |
| Server Restarts Survived | Tested & confirmed |
| Scheduled → Sent Time | < 60 seconds |

### Campaigns Sent
| Subject | Recipients | Sent At |
|---------|-----------|---------|
| Test Email from Outbox22 | 2 | 10 Sep 2026, 9:25 PM IST |
| Welcome to Outbox22! | 3 | 10 Sep 2026, 9:28 PM IST |
| Your Weekly ReachInbox Report | 2 | 10 Sep 2026, 9:29 PM IST |
| Action Required: Confirm Your Email | 2 | 10 Sep 2026, 9:29 PM IST |

---

## Architecture

`
 Browser (React + TypeScript + Tailwind CSS)
      |
      |  Register / Login (Email+Password or Google OAuth)
      |  Compose email → pick schedule time → Submit
      v
 ┌─────────────────────────────────────────┐
 │     Backend (Express + TypeScript)       │
 │             localhost:5000               │
 │                                          │
 │  POST /api/emails/schedule               │
 │    → saves to PostgreSQL                 │
 │    → creates BullMQ delayed jobs         │
 │                                          │
 │  GET /api/emails?status=scheduled|sent   │
 │  GET /api/emails/search?q=...            │
 └──────────────┬──────────────────────────┘
                |
       ┌────────▼────────┐
       │   Redis (BullMQ) │   ← persistent job store
       │  Delayed Jobs    │      (survives restarts)
       └────────┬────────┘
                |  job fires at scheduled time
       ┌────────▼────────┐
       │  BullMQ Worker  │   ← processes one job at a time
       │                 │      min 2s delay between sends
       │  Sends via      │      rate limit: 200/sender/hr
       │  Ethereal SMTP  │
       └────────┬────────┘
                |
       ┌────────▼────────┐
       │   PostgreSQL     │   ← stores email + recipient
       │   + Prisma ORM   │      status (PENDING → SENT)
       └─────────────────┘
                |
       ┌────────▼────────┐
       │  Elasticsearch  │   ← full-text search index
       └─────────────────┘
`

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Backend** | TypeScript + Express.js | Type-safe, fast REST API |
| **Job Queue** | BullMQ + Redis | Persistent delayed jobs, no cron |
| **Database** | PostgreSQL + Prisma ORM | Relational data, type-safe queries |
| **Search** | Elasticsearch 8.x | Full-text search on email content |
| **Email** | Nodemailer + Ethereal SMTP | Fake SMTP — test without spam risk |
| **Auth** | Google OAuth 2.0 + JWT | Secure, real-world login flow |
| **Frontend** | React 18 + TypeScript + Tailwind + Vite | Fast, beautiful UI |
| **Queue UI** | Bull Board | Live job monitoring dashboard |
| **Infrastructure** | Docker Compose | One-command dev setup |

---

## Key Features

### 1. Schedule Emails at Scale
- API accepts subject, body, recipients list, start time, delay, and hourly limit
- Each recipient gets its own **independent BullMQ delayed job**
- Jobs stagger automatically based on delayBetweenEmails setting

### 2. BullMQ — Not Cron
`
Why BullMQ over cron:
  Cron → in-memory, dies on restart, no per-job control
  BullMQ → Redis-backed, survives restarts, per-job retry/delay/status
`
- Jobs are stored in **Redis sorted sets** by their fire timestamp
- Server restart = worker reconnects to Redis = jobs resume exactly on time
- **Zero data loss** on restart — tested and verified

### 3. Rate Limiting (Per Sender, Per Hour)
`
Key:   rate:{userId}:{fromEmail}:{YYYY-MM-DDTHH}
Op:    INCR + EXPIRE via Lua script (atomic — no race conditions)
Limit: 200 emails/sender/hour (configurable)
`
- When limit is hit → job is **moved to next hour window** (not dropped)
- Slack notification sent to user (if connected)
- Recipient status set to RATE_LIMITED → retried automatically

### 4. Idempotency
- Each schedule request hashes {userId}:{subject}:{startTime}:{recipients} → SHA-256
- Duplicate API call returns existing email ID — **no double sends**
- BullMQ job IDs are deterministic: email_{emailId}_{recipientId}

### 5. Restart Safety — Verified
`
Test:
  1. Schedule email for T+2 minutes
  2. Kill backend (Ctrl+C)
  3. Restart backend
  4. Email sends at T+2 minutes exactly
Result: PASS ✅
`

### 6. Elasticsearch Full-Text Search
- Every email indexed on schedule and updated on send
- Search by subject, body, sender, or recipient
- Fuzzy matching + subject boosted 2x
- Falls back to PostgreSQL ILIKE if Elasticsearch is down

### 7. Frontend Dashboard
- **Login** — email/password or Google OAuth
- **Compose** — rich text editor, CSV recipient upload, schedule picker
- **Scheduled tab** — live count of pending emails
- **Sent tab** — delivered emails with timestamps
- **Search bar** — powered by Elasticsearch
- **Queue link** — opens Bull Board live dashboard

---

## API Endpoints

### Auth
`
POST   /api/auth/register        Register with email + password
POST   /api/auth/login           Login with email + password
POST   /api/auth/google          Exchange Google credential for JWT
GET    /api/auth/me              Get current user
`

### Emails
`
POST   /api/emails/schedule      Schedule a campaign
GET    /api/emails?status=...    List scheduled or sent emails
GET    /api/emails/search?q=...  Full-text search
GET    /api/emails/:id           Email detail + recipient statuses
`

### Slack (Optional)
`
GET    /api/slack/status         Check connection
GET    /api/slack/connect        Start OAuth
DELETE /api/slack/disconnect     Remove token
`

---

## Database Schema

`
User
  id, email, name, googleId, passwordHash, avatar

Email
  id, userId, subject, body, fromEmail, fromName
  status: SCHEDULED | SENDING | SENT | FAILED | PARTIAL
  scheduledAt, sentAt, hourlyLimit, delayBetweenEmails
  idempotencyKey (SHA-256 — prevents duplicates)

EmailRecipient
  id, emailId, address
  status: PENDING | SENT | FAILED | RATE_LIMITED
  jobId (BullMQ job reference), sentAt, error

SlackToken
  userId, accessToken, teamName, webhookUrl
`

---

## Project Structure

`
outbox22/
├── send-emails.js          ← Standalone Gmail CSV sender
├── msingh7763@gmail.csv    ← Recipient list (3 emails)
├── .env                    ← Gmail SMTP credentials
│
├── backend/
│   ├── src/
│   │   ├── config/         ← All env vars loaded here
│   │   ├── lib/
│   │   │   ├── mailer.ts   ← Nodemailer + Ethereal transport
│   │   │   ├── redis.ts    ← IORedis connection factory
│   │   │   ├── prisma.ts   ← Prisma client singleton
│   │   │   └── elasticsearch.ts
│   │   ├── middleware/
│   │   │   └── auth.ts     ← JWT verify middleware
│   │   ├── queues/
│   │   │   ├── emailQueue.ts   ← BullMQ Queue definition
│   │   │   ├── emailWorker.ts  ← Job processor + rate limiter
│   │   │   └── bullBoard.ts    ← Queue monitoring UI
│   │   ├── routes/
│   │   │   ├── auth.ts     ← Register, login, Google OAuth
│   │   │   ├── emails.ts   ← Schedule, list, search
│   │   │   └── slack.ts    ← Slack OAuth + notifications
│   │   ├── services/
│   │   │   ├── rateLimiter.ts  ← Redis Lua atomic counter
│   │   │   └── slackNotifier.ts
│   │   ├── app.ts          ← Express app factory
│   │   └── server.ts       ← Entry: DB → Worker → HTTP
│   ├── prisma/schema.prisma
│   └── docker-compose.yml  ← Postgres + Redis + Elasticsearch
│
└── frontend/
    └── src/
        ├── api/            ← Axios API calls
        ├── components/
        │   ├── ComposeEmailModal.tsx  ← Rich text + CSV upload
        │   └── SlackConnect.tsx
        ├── context/
        │   └── AuthContext.tsx  ← JWT + Google OAuth state
        └── pages/
            ├── Login.tsx       ← Email/password + Google login
            └── Dashboard.tsx   ← Scheduled + Sent + Search
`

---

## How to Run

### One-Time Setup
`powershell
# 1. Start Docker services
cd backend
docker-compose up -d

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Run DB migrations
cd backend
npx prisma migrate dev --name init
`

### Start the App
`powershell
# Terminal 1 — Backend (http://localhost:5000)
cd backend
npm run dev

# Terminal 2 — Frontend (http://localhost:3001)
cd frontend
npm run dev
`

### Send CSV Emails Directly (Gmail SMTP)
`powershell
# From project root — reads .env automatically
node send-emails.js
`

---

## URLs When Running

| Service | URL | Login |
|---------|-----|-------|
| Frontend Dashboard | http://localhost:3001 | Register/Login |
| Backend API | http://localhost:5000 | Bearer token |
| Bull Board Queue UI | http://localhost:5000/admin/queues | admin / admin123 |
| Health Check | http://localhost:5000/health | — |

---

## What Makes This Production-Grade

| Feature | Implementation |
|---------|---------------|
| No job loss on restart | Redis AOF persistence + BullMQ sorted sets |
| No duplicate emails | SHA-256 idempotency key + deterministic jobId |
| No race conditions | Atomic Redis Lua script for rate limiting |
| Graceful shutdown | SIGTERM handler closes worker + DB before exit |
| Search at scale | Elasticsearch with fallback to PostgreSQL |
| Auth security | JWT HS256 + bcrypt password hashing |
| Type safety | TypeScript end-to-end (backend + frontend) |
| Error handling | Per-job retry with exponential backoff (3 attempts) |

---

## Bonus Feature — Gmail CSV Sender

Beyond the full-stack system, a standalone script sends real emails:

`
Recipients from CSV:
  msingh7763@gmail.com
  mchiki7763@gmail.com
  msisodia7763@gmail.com

Sent via Gmail SMTP with App Password
Verified delivery — all 3 inboxes received
`

---

*Built with care for the ReachInbox Intern Assignment — Sep 2026*