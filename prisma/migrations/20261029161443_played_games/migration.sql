BEGIN;
-- CreateTable
CREATE TABLE "games_db"."Game" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "coverImageId" TEXT,
    "firstReleaseDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games_db"."PlayedGame" (
    "userId" TEXT NOT NULL,
    "gameId" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayedGame_pkey" PRIMARY KEY ("userId","gameId")
);

-- CreateIndex
CREATE INDEX "PlayedGame_userId_addedAt_gameId_idx" ON "games_db"."PlayedGame"("userId", "addedAt" DESC, "gameId" DESC);

-- CreateIndex
CREATE INDEX "PlayedGame_gameId_idx" ON "games_db"."PlayedGame"("gameId");

-- AddForeignKey
ALTER TABLE "games_db"."PlayedGame" ADD CONSTRAINT "PlayedGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "games_db"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games_db"."PlayedGame" ADD CONSTRAINT "PlayedGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games_db"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;


REVOKE ALL ON TABLE "games_db"."Game", "games_db"."PlayedGame" FROM PUBLIC, anon, authenticated;
ALTER TABLE "games_db"."Game" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "games_db"."PlayedGame" ENABLE ROW LEVEL SECURITY;

COMMIT;
