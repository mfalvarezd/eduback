/*
  Warnings:

  - You are about to drop the column `updateAt` on the `File` table. All the data in the column will be lost.
  - You are about to drop the column `updateAt` on the `Folder` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `File` table without a default value. This is not possible if the table is not empty.
  - Made the column `modifyBy` on table `File` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `Folder` table without a default value. This is not possible if the table is not empty.
  - Made the column `modifyBy` on table `Folder` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_modifyBy_fkey";

-- DropForeignKey
ALTER TABLE "Folder" DROP CONSTRAINT "Folder_modifyBy_fkey";

-- AlterTable
ALTER TABLE "File" DROP COLUMN "updateAt",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "modifyBy" SET NOT NULL;

-- AlterTable
ALTER TABLE "Folder" DROP COLUMN "updateAt",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "modifyBy" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_modifyBy_fkey" FOREIGN KEY ("modifyBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_modifyBy_fkey" FOREIGN KEY ("modifyBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
