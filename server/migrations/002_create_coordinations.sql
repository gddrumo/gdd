-- ========================================
-- MIGRATION 002: Create Coordinations Table
-- ========================================
-- Purpose: Separate Technical Coordinations from general Areas
-- Date: 2025-11-23
-- ========================================

-- Create coordinations table with same structure as areas
CREATE TABLE IF NOT EXISTS coordinations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT ''
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_coordinations_name ON coordinations(name);

-- Insert default coordinations (you can customize these)
INSERT INTO coordinations (id, name, description) VALUES
  ('coord-infra', 'Infraestrutura', 'Coordenação Técnica de Infraestrutura'),
  ('coord-dev', 'Desenvolvimento', 'Coordenação Técnica de Desenvolvimento'),
  ('coord-data', 'Dados e Analytics', 'Coordenação Técnica de Dados'),
  ('coord-sec', 'Segurança', 'Coordenação Técnica de Segurança')
ON CONFLICT (id) DO NOTHING;

-- Optional: Migrate existing "technical" areas to coordinations
-- This query finds areas that might be technical coordinations
-- and creates corresponding coordination entries
-- Uncomment if you want to auto-migrate:
-- INSERT INTO coordinations (id, name, description)
-- SELECT
--   REPLACE(id, 'area-', 'coord-') as id,
--   name,
--   description
-- FROM areas
-- WHERE LOWER(description) LIKE '%técnic%'
--    OR LOWER(description) LIKE '%coordena%'
--    OR LOWER(name) LIKE '%técnic%'
-- ON CONFLICT (id) DO NOTHING;

-- ========================================
-- NOTES:
-- ========================================
-- 1. This creates a separate table for Technical Coordinations
-- 2. Areas table remains for Requester Areas (who requests)
-- 3. Coordinations table is for Technical Teams (who executes)
-- 4. You may need to update demands.areaId to reference coordinations
--    instead of areas, or add a new coordinationId column
-- 5. The frontend will manage these separately in SettingsPanel
-- ========================================
