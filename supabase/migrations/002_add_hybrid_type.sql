-- Add "hybrid" to target_type ENUM
ALTER TYPE target_type ADD VALUE IF NOT EXISTS 'hybrid';
