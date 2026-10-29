BEGIN;
ALTER TABLE "games_db"."PlayedGame" ADD COLUMN "rating" INTEGER;
ALTER TABLE "games_db"."PlayedGame" ADD CONSTRAINT "PlayedGame_rating_range" CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 10);
COMMIT;
