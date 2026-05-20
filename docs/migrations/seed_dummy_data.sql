-- ============================================================
-- SEED DATA DUMMY - Dashboard Keuangan (v3 - minimal & correct)
-- 1 program per jenis: Normal (sales_basic), MOU (mou_partnership), Ads (advertising)
-- Periode: Maret 2026 (locked), April 2026 (aktif)
-- ============================================================
-- CARA PAKAI: Copy-paste seluruh file ke Supabase SQL Editor → Run
-- ROLLBACK: lihat bagian bawah file
-- ============================================================

DO $$
DECLARE
  -- ── PROFILES ─────────────────────────────────────────────────
  v_admin_id  UUID;
  v_pic1_id   UUID;
  v_pic2_id   UUID;

  -- ── PERIODS ──────────────────────────────────────────────────
  v_period_mar UUID;
  v_period_apr UUID;

  -- ── PROGRAMS ─────────────────────────────────────────────────
  v_prog_normal UUID;   -- quantitative, sales_basic template
  v_prog_mou    UUID;   -- mou, mou_partnership template
  v_prog_ads    UUID;   -- quantitative, advertising template

  -- ── METRIC IDs - NORMAL (sales_basic) ────────────────────────
  v_n_revenue    UUID;
  v_n_user_count UUID;

  -- ── METRIC IDs - MOU (mou_partnership) ───────────────────────
  v_m_mou_signed UUID;
  v_m_agr_leads  UUID;
  v_m_conv_rate  UUID;

  -- ── METRIC IDs - ADS (advertising, manual inputs only) ───────
  v_a_budget     UUID;
  v_a_spend      UUID;
  v_a_reach      UUID;
  v_a_impr       UUID;
  v_a_clicks     UUID;
  v_a_lpview     UUID;
  v_a_leads      UUID;
  v_a_ql         UUID;
  v_a_inv        UUID;
  v_a_wa         UUID;
  v_a_revenue    UUID;
  v_a_user_count UUID;
  v_a_tcpl       UUID;
  v_a_troas      UUID;
  -- calculated
  v_a_freq       UUID;
  v_a_ctr        UUID;
  v_a_cpc        UUID;
  v_a_cpm        UUID;
  v_a_lpvr       UUID;
  v_a_lcr        UUID;
  v_a_cpl        UUID;
  v_a_qlr        UUID;
  v_a_cpql       UUID;
  v_a_roas       UUID;
  v_a_cpp        UUID;
  v_a_sctr       UUID;
  v_a_scpc       UUID;
  v_a_sfreq      UUID;
  v_a_slpvr      UUID;
  v_a_sroas      UUID;
  v_a_scpl       UUID;
  v_a_as_ap      UUID;
  v_a_as_tq      UUID;
  v_a_as_ld      UUID;
  v_a_as_rv      UUID;

BEGIN
  -- ── RESOLVE PROFILES ─────────────────────────────────────────
  SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1;
  SELECT id INTO v_pic1_id  FROM public.profiles WHERE role = 'pic'   ORDER BY created_at LIMIT 1;
  SELECT id INTO v_pic2_id  FROM public.profiles WHERE role = 'pic'   ORDER BY created_at OFFSET 1 LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Tidak ada admin di profiles. Login dulu minimal 1x.';
  END IF;
  IF v_pic1_id IS NULL THEN
    RAISE EXCEPTION 'Tidak ada PIC di profiles. Buat minimal 1 user PIC.';
  END IF;
  -- Fallback jika hanya ada 1 PIC
  IF v_pic2_id IS NULL THEN v_pic2_id := v_pic1_id; END IF;

  RAISE NOTICE 'Admin: %, PIC1: %, PIC2: %', v_admin_id, v_pic1_id, v_pic2_id;


  -- ============================================================
  -- 1. PERIODS
  -- ============================================================
  INSERT INTO public.periods (id, month, year, working_days, is_active, is_locked)
  VALUES
    (gen_random_uuid(), 3, 2026, 20, false, true),
    (gen_random_uuid(), 4, 2026, 22, true,  false)
  ON CONFLICT (month, year) DO NOTHING;

  SELECT id INTO v_period_mar FROM public.periods WHERE month = 3 AND year = 2026;
  SELECT id INTO v_period_apr FROM public.periods WHERE month = 4 AND year = 2026;

  -- ============================================================
  -- 2. PROGRAMS
  -- ============================================================

  -- Normal: quantitative, sales_basic template
  INSERT INTO public.programs (
    id, name, pic_name, pic_whatsapp, target_type,
    monthly_target_rp, monthly_target_user,
    daily_target_rp, daily_target_user,
    is_active, department, pic_id
  ) VALUES (
    gen_random_uuid(),
    '[DEV] Bootcamp Data Science',
    'Andi Wijaya', '081234567801',
    'quantitative',
    120000000, 24,
    5454545, 1,
    true, 'sales_marketing', v_pic1_id
  ) ON CONFLICT DO NOTHING;
  SELECT id INTO v_prog_normal FROM public.programs WHERE name = '[DEV] Bootcamp Data Science';

  -- MOU: mou_partnership template
  INSERT INTO public.programs (
    id, name, pic_name, pic_whatsapp, target_type,
    monthly_target_rp, monthly_target_user,
    is_active, department, pic_id
  ) VALUES (
    gen_random_uuid(),
    '[DEV] MoU Universitas',
    'Siti Rahayu', '081234567802',
    'mou',
    0, 5,
    true, 'sales_marketing', v_pic2_id
  ) ON CONFLICT DO NOTHING;
  SELECT id INTO v_prog_mou FROM public.programs WHERE name = '[DEV] MoU Universitas';

  -- Ads: quantitative, advertising template
  INSERT INTO public.programs (
    id, name, pic_name, pic_whatsapp, target_type,
    monthly_target_rp, monthly_target_user,
    is_active, department, pic_id
  ) VALUES (
    gen_random_uuid(),
    '[DEV] Meta Ads Bootcamp',
    'Fajar Nugroho', '081234567803',
    'quantitative',
    150000000, 30,
    true, 'sales_marketing', v_pic1_id
  ) ON CONFLICT DO NOTHING;
  SELECT id INTO v_prog_ads FROM public.programs WHERE name = '[DEV] Meta Ads Bootcamp';

  -- ============================================================
  -- 3. ASSIGN PICs
  -- ============================================================
  INSERT INTO public.program_pics (program_id, profile_id)
  VALUES
    (v_prog_normal, v_pic1_id),
    (v_prog_normal, v_admin_id),
    (v_prog_mou,    v_pic2_id),
    (v_prog_mou,    v_admin_id),
    (v_prog_ads,    v_pic1_id),
    (v_prog_ads,    v_admin_id)
  ON CONFLICT (program_id, profile_id) DO NOTHING;


  -- ============================================================
  -- 4. METRIC DEFINITIONS
  -- Metric key & group harus PERSIS sesuai synonym list di calculator:
  --   revenue group  : metric_key='revenue', metric_group='revenue'
  --   user_acq group : metric_key='user_count', metric_group='user_acquisition'
  --   ad_spend group : metric_key='ad_spend', metric_group='ad_spend'
  --   leads group    : metric_key='leads', metric_group='leads'
  --   mou group      : metric_key='mou_signed', metric_group='user_acquisition'
  -- ============================================================

  -- ── NORMAL: sales_basic ──────────────────────────────────────
  INSERT INTO public.program_metric_definitions (
    id, program_id, metric_key, label, data_type, input_type,
    is_primary, is_target_metric, monthly_target, target_direction,
    unit_label, display_order, metric_group, formula,
    show_on_dashboard, show_on_tv
  ) VALUES
    (gen_random_uuid(), v_prog_normal, 'revenue',    'Pendapatan',     'currency', 'manual',
     true, true, 120000000, 'higher_is_better', 'Rp',     1, 'revenue',          null, true, true),
    (gen_random_uuid(), v_prog_normal, 'user_count', 'Jumlah Peserta', 'integer',  'manual',
     true, true, 24,        'higher_is_better', 'peserta',2, 'user_acquisition', null, true, true)
  ON CONFLICT (program_id, metric_key) DO NOTHING;

  -- ── MOU: mou_partnership ─────────────────────────────────────
  -- PENTING: mou_signed pakai metric_group='user_acquisition' agar terbaca
  -- oleh calculator sebagai target metric (isMouProgram check)
  INSERT INTO public.program_metric_definitions (
    id, program_id, metric_key, label, data_type, input_type,
    is_primary, is_target_metric, monthly_target, target_direction,
    unit_label, display_order, metric_group, formula,
    show_on_dashboard, show_on_tv
  ) VALUES
    (gen_random_uuid(), v_prog_mou, 'mou_signed',      'Tanda Tangan MoU',   'integer',    'manual',
     true,  true,  5,    'higher_is_better', 'MoU',    1, 'user_acquisition', null, true, true),
    (gen_random_uuid(), v_prog_mou, 'agreement_leads', 'Prospek Kerja Sama', 'integer',    'manual',
     false, false, null, 'higher_is_better', 'prospek',2, 'leads',            null, true, true),
    (gen_random_uuid(), v_prog_mou, 'conversion_rate', 'Konversi Kumulatif', 'percentage', 'calculated',
     false, false, null, 'higher_is_better', '%',      3, 'conversion',       'mou_signed / agreement_leads', true, false)
  ON CONFLICT (program_id, metric_key) DO NOTHING;

  -- ── ADS: advertising template (manual inputs) ────────────────
  -- metric_key='ad_spend', metric_group='ad_spend' → terbaca oleh isAdsProgram()
  -- metric_key='revenue', metric_group='revenue'   → terbaca oleh aggregateAdsMetrics
  -- metric_key='user_count', metric_group='user_acquisition' → goals
  -- metric_key='leads', metric_group='leads'       → leads funnel
  INSERT INTO public.program_metric_definitions (
    id, program_id, metric_key, label, data_type, input_type,
    is_primary, is_target_metric, monthly_target, target_direction,
    unit_label, display_order, metric_group, formula,
    show_on_dashboard, show_on_tv
  ) VALUES
    (gen_random_uuid(), v_prog_ads, 'budget_plan',     'Budget Plan',           'currency', 'manual',
     false, false, null,      'higher_is_better', 'Rp',      1,  'ad_spend', null, true,  true),
    (gen_random_uuid(), v_prog_ads, 'ad_spend',        'Ad Spend',              'currency', 'manual',
     false, false, null,      'lower_is_better',  'Rp',      2,  'ad_spend', null, true,  true),
    (gen_random_uuid(), v_prog_ads, 'reach',           'Reach',                 'integer',  'manual',
     false, false, null,      'higher_is_better', 'orang',   3,  'leads',    null, true,  true),
    (gen_random_uuid(), v_prog_ads, 'impressions',     'Impressions',           'integer',  'manual',
     false, false, null,      'higher_is_better', 'tayangan',4,  null,       null, true,  true),
    (gen_random_uuid(), v_prog_ads, 'link_clicks',     'Link Clicks',           'integer',  'manual',
     false, false, null,      'higher_is_better', 'klik',    5,  null,       null, true,  true),
    (gen_random_uuid(), v_prog_ads, 'lp_views',        'Landing Page Views',    'integer',  'manual',
     false, false, null,      'higher_is_better', 'view',    6,  null,       null, true,  true),
    (gen_random_uuid(), v_prog_ads, 'leads',           'Leads',                 'integer',  'manual',
     true,  true,  200,       'higher_is_better', 'lead',    7,  'leads',    null, true,  true),
    (gen_random_uuid(), v_prog_ads, 'qualified_leads', 'Qualified Leads',       'integer',  'manual',
     false, false, null,      'higher_is_better', 'lead',    8,  'leads',    null, true,  true),
    (gen_random_uuid(), v_prog_ads, 'invalid_leads',   'Invalid / Fake Leads',  'integer',  'manual',
     false, false, null,      'lower_is_better',  'lead',    9,  null,       null, true,  false),
    (gen_random_uuid(), v_prog_ads, 'wa_conversations','WA Conversations',      'integer',  'manual',
     false, false, null,      'higher_is_better', 'chat',    10, null,       null, true,  false),
    (gen_random_uuid(), v_prog_ads, 'revenue',         'Revenue from Paid Traffic','currency','manual',
     true,  true,  150000000, 'higher_is_better', 'Rp',      14, 'revenue',  null, true,  true),
    (gen_random_uuid(), v_prog_ads, 'user_count',      'Closing (User Baru)',   'integer',  'manual',
     true,  true,  30,        'higher_is_better', 'user',    15, 'user_acquisition', null, true, true),
    (gen_random_uuid(), v_prog_ads, 'target_cpl',      'Target CPL',            'currency', 'manual',
     false, false, null,      'lower_is_better',  'Rp',      24, null,       null, false, false),
    (gen_random_uuid(), v_prog_ads, 'target_roas',     'Target ROAS',           'float',    'manual',
     false, false, null,      'higher_is_better', 'x',       28, null,       null, false, false)
  ON CONFLICT (program_id, metric_key) DO NOTHING;

  -- ADS: calculated metrics
  INSERT INTO public.program_metric_definitions (
    id, program_id, metric_key, label, data_type, input_type,
    is_primary, is_target_metric, monthly_target, target_direction,
    unit_label, display_order, metric_group, formula,
    show_on_dashboard, show_on_tv
  ) VALUES
    (gen_random_uuid(), v_prog_ads, 'frequency',           'Frequency',              'float',      'calculated',
     false,false,null,'lower_is_better', 'x',   30,'null',      'impressions / reach',                                          true, true),
    (gen_random_uuid(), v_prog_ads, 'ctr',                 'CTR (Link)',              'percentage', 'calculated',
     false,false,null,'higher_is_better','%',   31,'efficiency','link_clicks / impressions',                                    true, true),
    (gen_random_uuid(), v_prog_ads, 'cpc',                 'CPC',                    'currency',   'calculated',
     false,false,null,'lower_is_better', 'Rp',  32,null,        'ad_spend / link_clicks',                                       true, true),
    (gen_random_uuid(), v_prog_ads, 'cpm',                 'CPM',                    'currency',   'calculated',
     false,false,null,'lower_is_better', 'Rp',  33,null,        'ad_spend / impressions * 1000',                                true, false),
    (gen_random_uuid(), v_prog_ads, 'lp_view_rate',        'LP View Rate',           'percentage', 'calculated',
     false,false,null,'higher_is_better','%',   34,'efficiency','lp_views / link_clicks',                                       true, true),
    (gen_random_uuid(), v_prog_ads, 'lead_conversion_rate','Lead Conversion Rate',   'percentage', 'calculated',
     false,false,null,'higher_is_better','%',   36,'conversion','leads / lp_views',                                             true, true),
    (gen_random_uuid(), v_prog_ads, 'cpl',                 'CPL',                    'currency',   'calculated',
     false,false,null,'lower_is_better', 'Rp',  37,null,        'ad_spend / leads',                                             true, true),
    (gen_random_uuid(), v_prog_ads, 'qualified_lead_rate', 'Qualified Lead Rate',    'percentage', 'calculated',
     false,false,null,'higher_is_better','%',   38,'conversion','qualified_leads / leads',                                      true, false),
    (gen_random_uuid(), v_prog_ads, 'cpql',                'Cost per Qualified Lead','currency',   'calculated',
     false,false,null,'lower_is_better', 'Rp',  39,null,        'ad_spend / qualified_leads',                                   true, false),
    (gen_random_uuid(), v_prog_ads, 'roas',                'ROAS',                   'float',      'calculated',
     false,false,null,'higher_is_better','x',   45,'efficiency','revenue / ad_spend',                                           true, true),
    (gen_random_uuid(), v_prog_ads, 'cpp',                 'CPP (Cost per Closing)', 'currency',   'calculated',
     false,false,null,'lower_is_better', 'Rp',  43,null,        'ad_spend / user_count',                                        true, false),
    (gen_random_uuid(), v_prog_ads, 'score_ctr',           'Score: CTR',             'float',      'calculated',
     false,false,null,'higher_is_better','poin',51,null,         'IF(ctr > 0.02, 100, IF(ctr > 0.015, 60, 20))',                false,false),
    (gen_random_uuid(), v_prog_ads, 'score_cpc',           'Score: CPC',             'float',      'calculated',
     false,false,null,'higher_is_better','poin',52,null,         'IF(cpc <= baseline_cpc, 100, IF(cpc <= baseline_cpc * 1.2, 60, 20))',false,false),
    (gen_random_uuid(), v_prog_ads, 'score_frequency',     'Score: Frequency',       'float',      'calculated',
     false,false,null,'higher_is_better','poin',53,null,         'IF(frequency >= 1.5, IF(frequency <= 3, 100, 60), 20)',        false,false),
    (gen_random_uuid(), v_prog_ads, 'score_lp_view_rate',  'Score: LP View Rate',    'float',      'calculated',
     false,false,null,'higher_is_better','poin',54,null,         'IF(lp_view_rate >= 0.8, 100, IF(lp_view_rate >= 0.7, 60, 20))',false,false),
    (gen_random_uuid(), v_prog_ads, 'score_roas',          'Score: ROAS',            'float',      'calculated',
     false,false,null,'higher_is_better','poin',55,null,         'IF(roas >= target_roas, 100, roas / target_roas * 100)',       false,false),
    (gen_random_uuid(), v_prog_ads, 'score_cpl',           'Score: CPL',             'float',      'calculated',
     false,false,null,'higher_is_better','poin',56,null,         'IF(cpl <= target_cpl, 100, IF(cpl <= target_cpl * 1.2, 60, 20))',false,false),
    (gen_random_uuid(), v_prog_ads, 'area_score_ad_appeal',      'Area Score: Iklan Menarik?',      'float','calculated',
     false,false,null,'higher_is_better','poin',57,null,         'AVG(score_ctr, score_cpc, score_frequency)',                   true, true),
    (gen_random_uuid(), v_prog_ads, 'area_score_traffic_quality','Area Score: Traffic Berkualitas?', 'float','calculated',
     false,false,null,'higher_is_better','poin',58,null,         'AVG(score_lp_view_rate)',                                      true, true),
    (gen_random_uuid(), v_prog_ads, 'area_score_leads',          'Area Score: Lead Masuk?',          'float','calculated',
     false,false,null,'higher_is_better','poin',59,null,         'AVG(score_cpl)',                                               true, true),
    (gen_random_uuid(), v_prog_ads, 'area_score_revenue',        'Area Score: Uang Iklan Sehat?',    'float','calculated',
     false,false,null,'higher_is_better','poin',60,null,         'AVG(score_roas)',                                              true, true)
  ON CONFLICT (program_id, metric_key) DO NOTHING;


  -- ============================================================
  -- 4b. RESOLVE SEMUA METRIC IDs (wajib setelah INSERT)
  -- ON CONFLICT DO NOTHING tidak update variabel UUID,
  -- jadi harus SELECT ulang dari DB.
  -- ============================================================
  SELECT id INTO v_n_revenue    FROM public.program_metric_definitions WHERE program_id = v_prog_normal AND metric_key = 'revenue';
  SELECT id INTO v_n_user_count FROM public.program_metric_definitions WHERE program_id = v_prog_normal AND metric_key = 'user_count';

  SELECT id INTO v_m_mou_signed FROM public.program_metric_definitions WHERE program_id = v_prog_mou AND metric_key = 'mou_signed';
  SELECT id INTO v_m_agr_leads  FROM public.program_metric_definitions WHERE program_id = v_prog_mou AND metric_key = 'agreement_leads';
  SELECT id INTO v_m_conv_rate  FROM public.program_metric_definitions WHERE program_id = v_prog_mou AND metric_key = 'conversion_rate';

  SELECT id INTO v_a_budget     FROM public.program_metric_definitions WHERE program_id = v_prog_ads AND metric_key = 'budget_plan';
  SELECT id INTO v_a_spend      FROM public.program_metric_definitions WHERE program_id = v_prog_ads AND metric_key = 'ad_spend';
  SELECT id INTO v_a_reach      FROM public.program_metric_definitions WHERE program_id = v_prog_ads AND metric_key = 'reach';
  SELECT id INTO v_a_impr       FROM public.program_metric_definitions WHERE program_id = v_prog_ads AND metric_key = 'impressions';
  SELECT id INTO v_a_clicks     FROM public.program_metric_definitions WHERE program_id = v_prog_ads AND metric_key = 'link_clicks';
  SELECT id INTO v_a_lpview     FROM public.program_metric_definitions WHERE program_id = v_prog_ads AND metric_key = 'lp_views';
  SELECT id INTO v_a_leads      FROM public.program_metric_definitions WHERE program_id = v_prog_ads AND metric_key = 'leads';
  SELECT id INTO v_a_ql         FROM public.program_metric_definitions WHERE program_id = v_prog_ads AND metric_key = 'qualified_leads';
  SELECT id INTO v_a_inv        FROM public.program_metric_definitions WHERE program_id = v_prog_ads AND metric_key = 'invalid_leads';
  SELECT id INTO v_a_wa         FROM public.program_metric_definitions WHERE program_id = v_prog_ads AND metric_key = 'wa_conversations';
  SELECT id INTO v_a_revenue    FROM public.program_metric_definitions WHERE program_id = v_prog_ads AND metric_key = 'revenue';
  SELECT id INTO v_a_user_count FROM public.program_metric_definitions WHERE program_id = v_prog_ads AND metric_key = 'user_count';
  SELECT id INTO v_a_tcpl       FROM public.program_metric_definitions WHERE program_id = v_prog_ads AND metric_key = 'target_cpl';
  SELECT id INTO v_a_troas      FROM public.program_metric_definitions WHERE program_id = v_prog_ads AND metric_key = 'target_roas';

  -- ============================================================
  -- 5. DATA INPUT - MARET 2026 (historis, locked)
  -- ============================================================

  -- NORMAL - daily_inputs (legacy path, juga isi metric_values untuk modern path)
  INSERT INTO public.daily_inputs (period_id, program_id, date, achievement_rp, achievement_user, created_by)
  VALUES
    (v_period_mar, v_prog_normal, '2026-03-05', 15000000, 3, v_admin_id),
    (v_period_mar, v_prog_normal, '2026-03-12', 18000000, 4, v_admin_id),
    (v_period_mar, v_prog_normal, '2026-03-19', 20000000, 4, v_admin_id),
    (v_period_mar, v_prog_normal, '2026-03-26', 16000000, 3, v_admin_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.daily_metric_values (period_id, program_id, metric_definition_id, date, value, created_by)
  VALUES
    (v_period_mar, v_prog_normal, v_n_revenue,    '2026-03-05', 15000000, v_admin_id),
    (v_period_mar, v_prog_normal, v_n_revenue,    '2026-03-12', 18000000, v_admin_id),
    (v_period_mar, v_prog_normal, v_n_revenue,    '2026-03-19', 20000000, v_admin_id),
    (v_period_mar, v_prog_normal, v_n_revenue,    '2026-03-26', 16000000, v_admin_id),
    (v_period_mar, v_prog_normal, v_n_user_count, '2026-03-05', 3, v_admin_id),
    (v_period_mar, v_prog_normal, v_n_user_count, '2026-03-12', 4, v_admin_id),
    (v_period_mar, v_prog_normal, v_n_user_count, '2026-03-19', 4, v_admin_id),
    (v_period_mar, v_prog_normal, v_n_user_count, '2026-03-26', 3, v_admin_id)
  ON CONFLICT (period_id, program_id, metric_definition_id, date) DO NOTHING;
  -- Total Maret Normal: Rp 69jt / 14 peserta (57.5% dari target 120jt/24)

  -- MOU - metric_values
  INSERT INTO public.daily_metric_values (period_id, program_id, metric_definition_id, date, value, created_by)
  VALUES
    (v_period_mar, v_prog_mou, v_m_mou_signed, '2026-03-10', 1, v_admin_id),
    (v_period_mar, v_prog_mou, v_m_mou_signed, '2026-03-24', 2, v_admin_id),
    (v_period_mar, v_prog_mou, v_m_agr_leads,  '2026-03-05', 8, v_admin_id),
    (v_period_mar, v_prog_mou, v_m_agr_leads,  '2026-03-18', 5, v_admin_id)
  ON CONFLICT (period_id, program_id, metric_definition_id, date) DO NOTHING;
  -- Total Maret MOU: 3 MoU signed / 13 leads (60% dari target 5)

  -- ADS - metric_values (Maret, 2 minggu data)
  INSERT INTO public.daily_metric_values (period_id, program_id, metric_definition_id, date, value, created_by)
  VALUES
    -- Week 1 (3 Mar)
    (v_period_mar, v_prog_ads, v_a_budget,  '2026-03-03', 10000000, v_admin_id),
    (v_period_mar, v_prog_ads, v_a_spend,   '2026-03-03', 2200000,  v_admin_id),
    (v_period_mar, v_prog_ads, v_a_reach,   '2026-03-03', 18000,    v_admin_id),
    (v_period_mar, v_prog_ads, v_a_impr,    '2026-03-03', 45000,    v_admin_id),
    (v_period_mar, v_prog_ads, v_a_clicks,  '2026-03-03', 900,      v_admin_id),
    (v_period_mar, v_prog_ads, v_a_lpview,  '2026-03-03', 750,      v_admin_id),
    (v_period_mar, v_prog_ads, v_a_leads,   '2026-03-03', 38,       v_admin_id),
    (v_period_mar, v_prog_ads, v_a_ql,      '2026-03-03', 22,       v_admin_id),
    (v_period_mar, v_prog_ads, v_a_inv,     '2026-03-03', 5,        v_admin_id),
    (v_period_mar, v_prog_ads, v_a_wa,      '2026-03-03', 30,       v_admin_id),
    (v_period_mar, v_prog_ads, v_a_revenue, '2026-03-03', 18000000, v_admin_id),
    (v_period_mar, v_prog_ads, v_a_user_count,'2026-03-03',4,       v_admin_id),
    (v_period_mar, v_prog_ads, v_a_tcpl,    '2026-03-03', 60000,    v_admin_id),
    (v_period_mar, v_prog_ads, v_a_troas,   '2026-03-03', 8,        v_admin_id),
    -- Week 2 (10 Mar)
    (v_period_mar, v_prog_ads, v_a_spend,   '2026-03-10', 2500000,  v_admin_id),
    (v_period_mar, v_prog_ads, v_a_reach,   '2026-03-10', 20000,    v_admin_id),
    (v_period_mar, v_prog_ads, v_a_impr,    '2026-03-10', 52000,    v_admin_id),
    (v_period_mar, v_prog_ads, v_a_clicks,  '2026-03-10', 1100,     v_admin_id),
    (v_period_mar, v_prog_ads, v_a_lpview,  '2026-03-10', 920,      v_admin_id),
    (v_period_mar, v_prog_ads, v_a_leads,   '2026-03-10', 45,       v_admin_id),
    (v_period_mar, v_prog_ads, v_a_ql,      '2026-03-10', 28,       v_admin_id),
    (v_period_mar, v_prog_ads, v_a_inv,     '2026-03-10', 4,        v_admin_id),
    (v_period_mar, v_prog_ads, v_a_wa,      '2026-03-10', 38,       v_admin_id),
    (v_period_mar, v_prog_ads, v_a_revenue, '2026-03-10', 22000000, v_admin_id),
    (v_period_mar, v_prog_ads, v_a_user_count,'2026-03-10',5,       v_admin_id),
    -- Week 3 (17 Mar)
    (v_period_mar, v_prog_ads, v_a_spend,   '2026-03-17', 2800000,  v_admin_id),
    (v_period_mar, v_prog_ads, v_a_reach,   '2026-03-17', 22000,    v_admin_id),
    (v_period_mar, v_prog_ads, v_a_impr,    '2026-03-17', 58000,    v_admin_id),
    (v_period_mar, v_prog_ads, v_a_clicks,  '2026-03-17', 1250,     v_admin_id),
    (v_period_mar, v_prog_ads, v_a_lpview,  '2026-03-17', 1050,     v_admin_id),
    (v_period_mar, v_prog_ads, v_a_leads,   '2026-03-17', 52,       v_admin_id),
    (v_period_mar, v_prog_ads, v_a_ql,      '2026-03-17', 32,       v_admin_id),
    (v_period_mar, v_prog_ads, v_a_inv,     '2026-03-17', 6,        v_admin_id),
    (v_period_mar, v_prog_ads, v_a_wa,      '2026-03-17', 42,       v_admin_id),
    (v_period_mar, v_prog_ads, v_a_revenue, '2026-03-17', 26000000, v_admin_id),
    (v_period_mar, v_prog_ads, v_a_user_count,'2026-03-17',6,       v_admin_id),
    -- Week 4 (24 Mar)
    (v_period_mar, v_prog_ads, v_a_spend,   '2026-03-24', 3000000,  v_admin_id),
    (v_period_mar, v_prog_ads, v_a_reach,   '2026-03-24', 25000,    v_admin_id),
    (v_period_mar, v_prog_ads, v_a_impr,    '2026-03-24', 62000,    v_admin_id),
    (v_period_mar, v_prog_ads, v_a_clicks,  '2026-03-24', 1400,     v_admin_id),
    (v_period_mar, v_prog_ads, v_a_lpview,  '2026-03-24', 1180,     v_admin_id),
    (v_period_mar, v_prog_ads, v_a_leads,   '2026-03-24', 58,       v_admin_id),
    (v_period_mar, v_prog_ads, v_a_ql,      '2026-03-24', 36,       v_admin_id),
    (v_period_mar, v_prog_ads, v_a_inv,     '2026-03-24', 5,        v_admin_id),
    (v_period_mar, v_prog_ads, v_a_wa,      '2026-03-24', 48,       v_admin_id),
    (v_period_mar, v_prog_ads, v_a_revenue, '2026-03-24', 30000000, v_admin_id),
    (v_period_mar, v_prog_ads, v_a_user_count,'2026-03-24',7,       v_admin_id)
  ON CONFLICT (period_id, program_id, metric_definition_id, date) DO NOTHING;
  -- Total Maret Ads: 193 leads (96.5%), Rp 96jt revenue (64%), 22 closing (73%)


  -- ============================================================
  -- 6. DATA INPUT - APRIL 2026 (aktif, s/d tgl 20)
  -- ============================================================

  -- NORMAL - April (on track ~76%)
  INSERT INTO public.daily_inputs (period_id, program_id, date, achievement_rp, achievement_user, created_by)
  VALUES
    (v_period_apr, v_prog_normal, '2026-04-03', 10000000, 2, v_pic1_id),
    (v_period_apr, v_prog_normal, '2026-04-07', 12000000, 2, v_pic1_id),
    (v_period_apr, v_prog_normal, '2026-04-10', 11000000, 2, v_pic1_id),
    (v_period_apr, v_prog_normal, '2026-04-14', 13000000, 3, v_pic1_id),
    (v_period_apr, v_prog_normal, '2026-04-17', 10000000, 2, v_pic1_id),
    (v_period_apr, v_prog_normal, '2026-04-21', 12000000, 2, v_pic1_id),
    (v_period_apr, v_prog_normal, '2026-04-24', 14000000, 3, v_pic1_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.daily_metric_values (period_id, program_id, metric_definition_id, date, value, created_by)
  VALUES
    (v_period_apr, v_prog_normal, v_n_revenue,    '2026-04-03', 10000000, v_pic1_id),
    (v_period_apr, v_prog_normal, v_n_revenue,    '2026-04-07', 12000000, v_pic1_id),
    (v_period_apr, v_prog_normal, v_n_revenue,    '2026-04-10', 11000000, v_pic1_id),
    (v_period_apr, v_prog_normal, v_n_revenue,    '2026-04-14', 13000000, v_pic1_id),
    (v_period_apr, v_prog_normal, v_n_revenue,    '2026-04-17', 10000000, v_pic1_id),
    (v_period_apr, v_prog_normal, v_n_revenue,    '2026-04-21', 12000000, v_pic1_id),
    (v_period_apr, v_prog_normal, v_n_revenue,    '2026-04-24', 14000000, v_pic1_id),
    (v_period_apr, v_prog_normal, v_n_user_count, '2026-04-03', 2, v_pic1_id),
    (v_period_apr, v_prog_normal, v_n_user_count, '2026-04-07', 2, v_pic1_id),
    (v_period_apr, v_prog_normal, v_n_user_count, '2026-04-10', 2, v_pic1_id),
    (v_period_apr, v_prog_normal, v_n_user_count, '2026-04-14', 3, v_pic1_id),
    (v_period_apr, v_prog_normal, v_n_user_count, '2026-04-17', 2, v_pic1_id),
    (v_period_apr, v_prog_normal, v_n_user_count, '2026-04-21', 2, v_pic1_id),
    (v_period_apr, v_prog_normal, v_n_user_count, '2026-04-24', 3, v_pic1_id)
  ON CONFLICT (period_id, program_id, metric_definition_id, date) DO NOTHING;
  -- Total April Normal: Rp 82jt / 16 peserta (68% revenue, 67% user)

  -- MOU - April (PERLU PERHATIAN ~40%)
  INSERT INTO public.daily_metric_values (period_id, program_id, metric_definition_id, date, value, created_by)
  VALUES
    (v_period_apr, v_prog_mou, v_m_mou_signed, '2026-04-10', 1, v_pic2_id),
    (v_period_apr, v_prog_mou, v_m_mou_signed, '2026-04-22', 1, v_pic2_id),
    (v_period_apr, v_prog_mou, v_m_agr_leads,  '2026-04-05', 5, v_pic2_id),
    (v_period_apr, v_prog_mou, v_m_agr_leads,  '2026-04-15', 4, v_pic2_id),
    (v_period_apr, v_prog_mou, v_m_agr_leads,  '2026-04-22', 3, v_pic2_id)
  ON CONFLICT (period_id, program_id, metric_definition_id, date) DO NOTHING;
  -- Total April MOU: 2 MoU signed / 12 leads (40% dari target 5)

  -- ADS - April (on track ~70%)
  INSERT INTO public.daily_metric_values (period_id, program_id, metric_definition_id, date, value, created_by)
  VALUES
    -- 1 Apr
    (v_period_apr, v_prog_ads, v_a_budget,    '2026-04-01', 12000000, v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_spend,     '2026-04-01', 2500000,  v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_reach,     '2026-04-01', 20000,    v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_impr,      '2026-04-01', 50000,    v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_clicks,    '2026-04-01', 1050,     v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_lpview,    '2026-04-01', 880,      v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_leads,     '2026-04-01', 42,       v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_ql,        '2026-04-01', 25,       v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_inv,       '2026-04-01', 4,        v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_wa,        '2026-04-01', 35,       v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_revenue,   '2026-04-01', 20000000, v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_user_count,'2026-04-01', 4,        v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_tcpl,      '2026-04-01', 60000,    v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_troas,     '2026-04-01', 8,        v_pic1_id),
    -- 8 Apr
    (v_period_apr, v_prog_ads, v_a_spend,     '2026-04-08', 2800000,  v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_reach,     '2026-04-08', 22000,    v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_impr,      '2026-04-08', 55000,    v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_clicks,    '2026-04-08', 1200,     v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_lpview,    '2026-04-08', 1000,     v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_leads,     '2026-04-08', 48,       v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_ql,        '2026-04-08', 30,       v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_inv,       '2026-04-08', 5,        v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_wa,        '2026-04-08', 40,       v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_revenue,   '2026-04-08', 24000000, v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_user_count,'2026-04-08', 5,        v_pic1_id),
    -- 15 Apr
    (v_period_apr, v_prog_ads, v_a_spend,     '2026-04-15', 3200000,  v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_reach,     '2026-04-15', 26000,    v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_impr,      '2026-04-15', 65000,    v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_clicks,    '2026-04-15', 1380,     v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_lpview,    '2026-04-15', 1150,     v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_leads,     '2026-04-15', 55,       v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_ql,        '2026-04-15', 34,       v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_inv,       '2026-04-15', 6,        v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_wa,        '2026-04-15', 45,       v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_revenue,   '2026-04-15', 28000000, v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_user_count,'2026-04-15', 6,        v_pic1_id),
    -- 22 Apr
    (v_period_apr, v_prog_ads, v_a_spend,     '2026-04-22', 1800000,  v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_reach,     '2026-04-22', 14000,    v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_impr,      '2026-04-22', 35000,    v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_clicks,    '2026-04-22', 740,      v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_lpview,    '2026-04-22', 620,      v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_leads,     '2026-04-22', 30,       v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_ql,        '2026-04-22', 18,       v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_inv,       '2026-04-22', 3,        v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_wa,        '2026-04-22', 24,       v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_revenue,   '2026-04-22', 15000000, v_pic1_id),
    (v_period_apr, v_prog_ads, v_a_user_count,'2026-04-22', 3,        v_pic1_id)
  ON CONFLICT (period_id, program_id, metric_definition_id, date) DO NOTHING;
  -- Total April Ads: 175 leads (87.5%), Rp 87jt revenue (58%), 18 closing (60%)


  -- ============================================================
  -- 7. SNAPSHOT TARGET ke program_period_settings (Maret)
  -- ============================================================
  INSERT INTO public.program_period_settings (
    program_id, period_id,
    monthly_target_rp, monthly_target_user,
    custom_targets
  ) VALUES
    (v_prog_normal, v_period_mar, 120000000, 24,
     '{"revenue": 120000000, "user_count": 24}'),
    (v_prog_mou,    v_period_mar, 0,         5,
     '{"mou_signed": 5}'),
    (v_prog_ads,    v_period_mar, 150000000, 30,
     '{"revenue": 150000000, "user_count": 30, "leads": 200}')
  ON CONFLICT (program_id, period_id) DO NOTHING;

  -- ============================================================
  -- 8. RINGKASAN
  -- ============================================================
  RAISE NOTICE '=== SEED BERHASIL ===';
  RAISE NOTICE 'Programs: [DEV] Bootcamp Data Science | [DEV] MoU Universitas | [DEV] Meta Ads Bootcamp';
  RAISE NOTICE 'Periode : Maret 2026 (locked) | April 2026 (aktif)';
  RAISE NOTICE '';
  RAISE NOTICE 'Status April 2026:';
  RAISE NOTICE '  Normal (Bootcamp) : Rp 82jt / 16 peserta  → ~68%% MENUJU TARGET';
  RAISE NOTICE '  MOU (Universitas) : 2 MoU signed          → ~40%% PERLU PERHATIAN';
  RAISE NOTICE '  Ads (Meta Ads)    : 175 leads / Rp 87jt   → ~70%% MENUJU TARGET';

END $$;

-- ============================================================
-- ROLLBACK - jalankan jika ingin hapus semua data dummy
-- ============================================================
/*
DELETE FROM public.programs
  WHERE name IN (
    '[DEV] Bootcamp Data Science',
    '[DEV] MoU Universitas',
    '[DEV] Meta Ads Bootcamp'
  );
-- CASCADE akan otomatis hapus: program_pics, program_metric_definitions,
-- daily_metric_values, daily_inputs, program_period_settings
-- Hapus periods jika tidak ada data lain:
DELETE FROM public.periods WHERE (month=3 AND year=2026) OR (month=4 AND year=2026);
*/
