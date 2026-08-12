-- CreateEnum
CREATE TYPE "BookCondition" AS ENUM ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('AVAILABLE', 'BORROWED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "LendingRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'RETURNED');

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "isbn" TEXT,
    "description" TEXT,
    "coverImage" TEXT,
    "genre" TEXT,
    "language" TEXT,
    "condition" "BookCondition" NOT NULL DEFAULT 'GOOD',
    "status" "BookStatus" NOT NULL DEFAULT 'AVAILABLE',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LendingRequest" (
    "id" TEXT NOT NULL,
    "status" "LendingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "bookId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LendingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Book_ownerId_idx" ON "Book"("ownerId");

-- CreateIndex
CREATE INDEX "Book_status_idx" ON "Book"("status");

-- CreateIndex
CREATE INDEX "LendingRequest_bookId_idx" ON "LendingRequest"("bookId");

-- CreateIndex
CREATE INDEX "LendingRequest_requesterId_idx" ON "LendingRequest"("requesterId");

-- CreateIndex
CREATE INDEX "LendingRequest_ownerId_idx" ON "LendingRequest"("ownerId");

-- CreateIndex
CREATE INDEX "LendingRequest_status_idx" ON "LendingRequest"("status");

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LendingRequest" ADD CONSTRAINT "LendingRequest_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LendingRequest" ADD CONSTRAINT "LendingRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LendingRequest" ADD CONSTRAINT "LendingRequest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
