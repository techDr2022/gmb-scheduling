-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "gmbReviewId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "comment" TEXT,
    "rating" INTEGER NOT NULL,
    "responded" BOOLEAN NOT NULL DEFAULT false,
    "reply" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Review_gmbReviewId_key" ON "Review"("gmbReviewId");

-- CreateIndex
CREATE INDEX "Review_locationId_idx" ON "Review"("locationId");

-- CreateIndex
CREATE INDEX "Review_gmbReviewId_idx" ON "Review"("gmbReviewId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
