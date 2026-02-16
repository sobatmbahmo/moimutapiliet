-- SQL Migration Script for Affiliates Fix

-- Step 1: Add username field to the affiliates table
ALTER TABLE affiliates ADD COLUMN username VARCHAR(255);

-- Step 2: Fix RLS (Row Level Security) policies
-- (Assuming we have a policy that needs to be updated, these are examples)
-- Example policy updates can go here

-- Step 3: Change tiktok_shop_link column type to TEXT
ALTER TABLE affiliates ALTER COLUMN tiktok_shop_link TYPE TEXT;

-- Migration completed successfully.
-- Date: 2026-02-16 05:58:36 UTC
-- Author: sobatmbahmo