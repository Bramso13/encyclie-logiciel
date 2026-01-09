-- AlterEnum
-- This migration adds PASSWORD_RESET value to the EmailType enum.

ALTER TYPE "EmailType" ADD VALUE 'PASSWORD_RESET';
