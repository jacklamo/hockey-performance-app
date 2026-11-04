ALTER TABLE "User" ALTER COLUMN "team" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "birthYear" INTEGER;
ALTER TABLE "Game" ADD COLUMN "shotsAgainst" INTEGER, ADD COLUMN "goalsAgainst" INTEGER, ADD COLUMN "saves" INTEGER;
ALTER TABLE "MentalState" ADD COLUMN "timing" TEXT, ADD COLUMN "checkedInAt" TIMESTAMP(3);
-- NOT VALID: unattended migrate deploy must not fail on an odd legacy row
ALTER TABLE "User" ADD CONSTRAINT "User_position_check"
  CHECK ("position" IN ('Center','Left Wing','Right Wing','Defenseman','Goalie')) NOT VALID;
