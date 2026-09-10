-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "RecipientStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'RATE_LIMITED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "googleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emails" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "hourlyLimit" INTEGER NOT NULL DEFAULT 200,
    "delayBetweenEmails" INTEGER NOT NULL DEFAULT 2,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_recipients" (
    "id" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" "RecipientStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slack_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "channel" TEXT,
    "botUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slack_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "emails_idempotencyKey_key" ON "emails"("idempotencyKey");

-- CreateIndex
CREATE INDEX "emails_userId_idx" ON "emails"("userId");

-- CreateIndex
CREATE INDEX "emails_status_idx" ON "emails"("status");

-- CreateIndex
CREATE UNIQUE INDEX "email_recipients_jobId_key" ON "email_recipients"("jobId");

-- CreateIndex
CREATE INDEX "email_recipients_emailId_idx" ON "email_recipients"("emailId");

-- CreateIndex
CREATE UNIQUE INDEX "slack_tokens_userId_key" ON "slack_tokens"("userId");

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_recipients" ADD CONSTRAINT "email_recipients_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "emails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_tokens" ADD CONSTRAINT "slack_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
