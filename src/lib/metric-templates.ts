/**
 * Metric Templates
 * 
 * Preset configurations for common program types.
 * These templates populate program_metric_definitions when
 * creating a new program via the metric builder UI.
 */

import { Database } from '@/types/database'

type MetricDefinitionInsert = Omit<
  Database['public']['Tables']['program_metric_definitions']['Insert'],
  'id' | 'program_id' | 'created_at'
>

export interface MetricTemplate {
  key: string
  label: string
  description: string
  metrics: MetricDefinitionInsert[]
}

export const METRIC_TEMPLATES: MetricTemplate[] = [
  {
    key: 'advertising',
    label: 'Advertising (Advertiser & CS)',
    description: 'Untuk program yang menjalankan iklan digital. Includes Lead, Budget, Closing, Omzet, ROAS, CPP.',
    metrics: [
      {
        metric_key: 'lead_masuk',
        label: 'Lead Masuk',
        data_type: 'integer',
        input_type: 'manual',
        is_target_metric: false,
        monthly_target: null,
        target_direction: 'higher_is_better',
        unit_label: 'leads',
        show_on_dashboard: true,
        show_on_tv: true,
        display_order: 1,
        formula: null,
      },
      {
        metric_key: 'budget_iklan',
        label: 'Budget Iklan + PPn',
        data_type: 'currency',
        input_type: 'manual',
        is_target_metric: false,
        monthly_target: null,
        target_direction: 'lower_is_better',
        unit_label: 'Rp',
        show_on_dashboard: true,
        show_on_tv: true,
        display_order: 2,
        formula: null,
      },
      {
        metric_key: 'closing',
        label: 'Closing',
        data_type: 'integer',
        input_type: 'manual',
        is_target_metric: true,
        monthly_target: null,
        target_direction: 'higher_is_better',
        unit_label: 'closing',
        show_on_dashboard: true,
        show_on_tv: true,
        display_order: 3,
        formula: null,
      },
      {
        metric_key: 'omzet',
        label: 'Omzet',
        data_type: 'currency',
        input_type: 'manual',
        is_target_metric: true,
        monthly_target: null,
        target_direction: 'higher_is_better',
        unit_label: 'Rp',
        show_on_dashboard: true,
        show_on_tv: true,
        display_order: 4,
        formula: null,
      },
      {
        metric_key: 'conversion_rate',
        label: 'Conversion Rate',
        data_type: 'percentage',
        input_type: 'calculated',
        is_target_metric: false,
        monthly_target: null,
        target_direction: 'higher_is_better',
        unit_label: '%',
        show_on_dashboard: true,
        show_on_tv: false,
        display_order: 5,
        formula: 'closing / lead_masuk',
      },
      {
        metric_key: 'roas',
        label: 'ROAS',
        data_type: 'float',
        input_type: 'calculated',
        is_target_metric: false,
        monthly_target: null,
        target_direction: 'higher_is_better',
        unit_label: 'x',
        show_on_dashboard: true,
        show_on_tv: true,
        display_order: 6,
        formula: 'omzet / budget_iklan',
      },
      {
        metric_key: 'cpp_real',
        label: 'CPP Real',
        data_type: 'currency',
        input_type: 'calculated',
        is_target_metric: false,
        monthly_target: null,
        target_direction: 'lower_is_better',
        unit_label: 'Rp',
        show_on_dashboard: true,
        show_on_tv: false,
        display_order: 7,
        formula: 'budget_iklan / closing',
      },
    ],
  },
  {
    key: 'sales_basic',
    label: 'Sales Dasar (Rp + User)',
    description: 'Template standar untuk program sales yang melacak pendapatan dan jumlah peserta.',
    metrics: [
      {
        metric_key: 'revenue',
        label: 'Pendapatan',
        data_type: 'currency',
        input_type: 'manual',
        is_target_metric: true,
        monthly_target: null,
        target_direction: 'higher_is_better',
        unit_label: 'Rp',
        show_on_dashboard: true,
        show_on_tv: true,
        display_order: 1,
        formula: null,
      },
      {
        metric_key: 'user_count',
        label: 'Jumlah Peserta',
        data_type: 'integer',
        input_type: 'manual',
        is_target_metric: true,
        monthly_target: null,
        target_direction: 'higher_is_better',
        unit_label: 'peserta',
        show_on_dashboard: true,
        show_on_tv: true,
        display_order: 2,
        formula: null,
      },
    ],
  },
  {
    key: 'qualitative_only',
    label: 'Kualitatif (Milestone Only)',
    description: 'Program yang hanya melacak pencapaian milestone tanpa target angka.',
    metrics: [],
  },
  {
    key: 'customer_service',
    label: 'Customer Service',
    description: 'Untuk tim CS yang melacak tiket, response time, dan kepuasan pelanggan.',
    metrics: [
      {
        metric_key: 'tiket_masuk',
        label: 'Tiket Masuk',
        data_type: 'integer',
        input_type: 'manual',
        is_target_metric: false,
        monthly_target: null,
        target_direction: 'higher_is_better',
        unit_label: 'tiket',
        show_on_dashboard: true,
        show_on_tv: true,
        display_order: 1,
        formula: null,
      },
      {
        metric_key: 'tiket_selesai',
        label: 'Tiket Diselesaikan',
        data_type: 'integer',
        input_type: 'manual',
        is_target_metric: true,
        monthly_target: null,
        target_direction: 'higher_is_better',
        unit_label: 'tiket',
        show_on_dashboard: true,
        show_on_tv: true,
        display_order: 2,
        formula: null,
      },
      {
        metric_key: 'resolution_rate',
        label: 'Resolution Rate',
        data_type: 'percentage',
        input_type: 'calculated',
        is_target_metric: false,
        monthly_target: null,
        target_direction: 'higher_is_better',
        unit_label: '%',
        show_on_dashboard: true,
        show_on_tv: false,
        display_order: 3,
        formula: 'tiket_selesai / tiket_masuk',
      },
    ],
  },
]

export const METRIC_TEMPLATE_MAP = Object.fromEntries(
  METRIC_TEMPLATES.map(t => [t.key, t])
)
