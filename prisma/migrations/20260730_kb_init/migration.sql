-- Agro Olam KB — production migration skeleton
-- Requires: PostgreSQL 15+ and superuser/extension privileges
-- Apply manually when DATABASE_URL is provisioned:
--   psql $DATABASE_URL -f prisma/migrations/20260730_kb_init/migration.sql

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Tables are managed by Prisma Migrate once `npx prisma migrate deploy` is run
-- with a real DATABASE_URL. This file documents required extensions for ops.
