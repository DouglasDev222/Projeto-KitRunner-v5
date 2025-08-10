-- Migration: Add event status and stock control fields
-- Date: 2025-08-10
-- Description: Add status, stock control and migration from available field

BEGIN;

-- Add new columns for status and stock control
ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ativo';
ALTER TABLE events ADD COLUMN IF NOT EXISTS stock_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_orders INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS current_orders INTEGER NOT NULL DEFAULT 0;

-- Migrate existing data from available to status
UPDATE events SET status = CASE 
  WHEN available = true THEN 'ativo' 
  ELSE 'inativo' 
END 
WHERE status = 'ativo'; -- Only update if not already migrated

-- Calculate current_orders based on existing non-cancelled orders
UPDATE events SET current_orders = (
  SELECT COUNT(*)
  FROM orders 
  WHERE orders."eventId" = events.id 
  AND orders.status NOT IN ('cancelado')
);

-- Add index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

COMMIT;