BEGIN;
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "games_db";

-- CreateTable
CREATE TABLE "games_db"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "username" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games_db"."Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "games_db"."Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "games_db"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "games_db"."AuthRateLimit" (
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "games_db"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "games_db"."User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "games_db"."Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "games_db"."Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "games_db"."Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "games_db"."VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_expires_idx" ON "games_db"."VerificationToken"("expires");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "games_db"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "AuthRateLimit_expiresAt_idx" ON "games_db"."AuthRateLimit"("expiresAt");

-- AddForeignKey
ALTER TABLE "games_db"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "games_db"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games_db"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "games_db"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Authentication is server-only. This schema must not be exposed through the Data API.
REVOKE ALL ON SCHEMA games_db FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA games_db FROM PUBLIC, anon, authenticated;
ALTER TABLE "games_db"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "games_db"."Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "games_db"."Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "games_db"."VerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "games_db"."AuthRateLimit" ENABLE ROW LEVEL SECURITY;

COMMIT;
