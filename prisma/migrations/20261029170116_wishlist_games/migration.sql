BEGIN;
-- CreateTable
CREATE TABLE "games_db"."WishlistGame" (
    "userId" TEXT NOT NULL,
    "gameId" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistGame_pkey" PRIMARY KEY ("userId","gameId")
);

-- CreateIndex
CREATE INDEX "WishlistGame_userId_addedAt_gameId_idx" ON "games_db"."WishlistGame"("userId", "addedAt" DESC, "gameId" DESC);

-- CreateIndex
CREATE INDEX "WishlistGame_gameId_idx" ON "games_db"."WishlistGame"("gameId");

-- AddForeignKey
ALTER TABLE "games_db"."WishlistGame" ADD CONSTRAINT "WishlistGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "games_db"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games_db"."WishlistGame" ADD CONSTRAINT "WishlistGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games_db"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

REVOKE ALL ON TABLE "games_db"."WishlistGame" FROM PUBLIC, anon, authenticated;
ALTER TABLE "games_db"."WishlistGame" ENABLE ROW LEVEL SECURITY;
COMMIT;

