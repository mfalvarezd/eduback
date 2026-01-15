-- AlterTable: add PDF metadata columns to Quotation
ALTER TABLE "Quotation"
ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT,
ADD COLUMN IF NOT EXISTS "pdfFileName" TEXT,
ADD COLUMN IF NOT EXISTS "pdfPath" TEXT,
ADD COLUMN IF NOT EXISTS "pdfUploadedAt" TIMESTAMP(3);

