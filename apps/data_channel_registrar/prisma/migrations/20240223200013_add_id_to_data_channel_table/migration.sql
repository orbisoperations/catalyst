/*
  Warnings:

  - Added the required column `id` to the `DataChannel` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DataChannel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "organization" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL
);
INSERT INTO "new_DataChannel" ("endpoint", "name", "organization") SELECT "endpoint", "name", "organization" FROM "DataChannel";
DROP TABLE "DataChannel";
ALTER TABLE "new_DataChannel" RENAME TO "DataChannel";
CREATE UNIQUE INDEX "DataChannel_organization_key" ON "DataChannel"("organization");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
