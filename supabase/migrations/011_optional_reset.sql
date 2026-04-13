-- ============================================================
-- Migration 011: Optional Reset Script (Test Data)
-- ⚠️  HANYA JALANKAN JIKA INGIN MENGHAPUS DATA TEST
-- Run this in Supabase SQL Editor AFTER 008-010
-- ============================================================

-- Hapus semua daily inputs (data test)
DELETE FROM daily_inputs;

-- Hapus semua milestone completions
DELETE FROM milestone_completions;

-- Hapus semua milestones
DELETE FROM program_milestones;

-- Hapus semua program pics
DELETE FROM program_pics;

-- Hapus semua metric values (seharusnya sudah kosong)
DELETE FROM daily_metric_values;

-- Hapus semua metric definitions
DELETE FROM program_metric_definitions;

-- Hapus semua programs (mulai fresh)
DELETE FROM programs;

-- Hapus semua periods (mulai fresh)
DELETE FROM periods;

-- ============================================================
-- Setelah reset, Anda bisa mulai membuat program baru
-- dengan department dan metric definitions yang tepat
-- melalui halaman Master Data di aplikasi.
-- ============================================================
