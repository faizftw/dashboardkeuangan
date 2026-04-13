-- ============================================================
-- Migration 009: Create Flexible Custom Metrics Tables
-- Run this in Supabase SQL Editor AFTER 008
-- ============================================================

-- Table: program_metric_definitions
-- Defines what KPI metrics each program tracks
CREATE TABLE IF NOT EXISTS program_metric_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,

  -- snake_case identifier used in formulas, e.g. 'revenue', 'lead_masuk'
  metric_key TEXT NOT NULL,

  -- Display name in Bahasa Indonesia
  label TEXT NOT NULL,

  -- Type of value this metric holds
  data_type TEXT NOT NULL CHECK (data_type IN (
    'integer',    -- whole numbers: leads, users, closing count
    'currency',   -- Rp amounts
    'percentage', -- 0-100 shown as %
    'float',      -- decimal: ROAS, CPP
    'boolean'     -- yes/no
  )),

  -- How the value is produced
  input_type TEXT NOT NULL CHECK (input_type IN (
    'manual',     -- user types directly
    'calculated'  -- derived from formula, read-only
  )),

  -- Only for calculated metrics. Uses metric_key tokens.
  -- Example: 'omzet / budget_iklan'
  -- Allowed operators: + - * /
  formula TEXT,

  -- If true, this metric has a monthly target and shows progress on dashboard
  is_target_metric BOOLEAN NOT NULL DEFAULT false,

  -- Required when is_target_metric = true
  monthly_target NUMERIC,

  -- Progress direction logic
  target_direction TEXT NOT NULL DEFAULT 'higher_is_better' CHECK (target_direction IN (
    'higher_is_better',  -- revenue, leads → want to exceed target
    'lower_is_better'    -- CPP, complaints → want to stay below target
  )),

  -- Display suffix shown to user: 'Rp', '%', 'leads', 'x', etc.
  unit_label TEXT,

  -- Visibility controls
  show_on_dashboard BOOLEAN NOT NULL DEFAULT true,
  show_on_tv BOOLEAN NOT NULL DEFAULT true,

  -- Ordering within a program's metric list
  display_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),

  -- A program can only have one metric per key
  UNIQUE(program_id, metric_key)
);

-- Table: daily_metric_values
-- Stores daily input values for custom metrics
CREATE TABLE IF NOT EXISTS daily_metric_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  metric_definition_id UUID NOT NULL REFERENCES program_metric_definitions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  value NUMERIC,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),

  -- One value per metric per day per period
  UNIQUE(period_id, program_id, metric_definition_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pmd_program_id ON program_metric_definitions(program_id);
CREATE INDEX IF NOT EXISTS idx_dmv_period_program ON daily_metric_values(period_id, program_id);
CREATE INDEX IF NOT EXISTS idx_dmv_date ON daily_metric_values(date);

-- Rollback:
-- DROP TABLE IF EXISTS daily_metric_values;
-- DROP TABLE IF EXISTS program_metric_definitions;
