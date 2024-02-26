-- CreateTable
CREATE TABLE "DataChannel" (
    "organization" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DataChannel_organization_key" ON "DataChannel"("organization");
