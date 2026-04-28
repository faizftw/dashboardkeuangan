import { describe, it, expect } from 'vitest'
import { calculateProgramHealth, ProgramWithRelations } from './dashboard-calculator'
import { Database } from '@/types/database'

type MetricValue = Database['public']['Tables']['daily_metric_values']['Row']
type DailyInput = Database['public']['Tables']['daily_inputs']['Row']
type MilestoneCompletion = Database['public']['Tables']['milestone_completions']['Row']

describe('dashboard-calculator - calculateProgramHealth', () => {
  it('should fallback to legacy metrics when no custom metrics are defined', () => {
    const program: ProgramWithRelations = {
      id: 'prog-1',
      name: 'Legacy Prog',
      department: 'Marketing',
      target_type: 'quantitative',
      is_active: true,
      monthly_target_rp: 1000000,
      monthly_target_user: 10,
      daily_target_rp: null,
      daily_target_user: null,
      created_at: '',
      program_metric_definitions: [],
      program_milestones: []
    } as unknown as ProgramWithRelations

    const dailyInputsByProgram = new Map<string, DailyInput[]>()
    dailyInputsByProgram.set('prog-1', [
      { id: '1', program_id: 'prog-1', period_id: 'p1', date: '2026-04-01', achievement_rp: 200000, achievement_user: 2, notes: null, prospek_drop: 0, prospek_notes: null, qualitative_status: null, created_at: null, created_by: null, updated_at: null },
      { id: '2', program_id: 'prog-1', period_id: 'p1', date: '2026-04-02', achievement_rp: 300000, achievement_user: 3, notes: null, prospek_drop: 0, prospek_notes: null, qualitative_status: null, created_at: null, created_by: null, updated_at: null }
    ])

    const prorationFactor = 0.5 // e.g. mid month

    const result = calculateProgramHealth(
      program,
      new Map(),
      dailyInputsByProgram,
      new Map(),
      prorationFactor
    )

    // Legacy RP target = 1M, prorated to 500k. Actual = 500k. Health for RP = 100%
    // Legacy User target = 10, prorated to 5. Actual = 5. Health for User = 100%
    // Overall health = 100
    expect(result.calculatedMetrics?.revenue).toBe(500000)
    expect(result.calculatedMetrics?.user_acquisition).toBe(5)
    
    expect(result.effectiveTargets?.revenue).toBe(500000)
    expect(result.absoluteTargets?.revenue).toBe(1000000)
    
    expect(result.healthScore).toBe(100)
    expect(result.status).toBe('SEHAT')
  })

  it('should prioritize custom metrics and NOT double-count legacy targets', () => {
    const program: ProgramWithRelations = {
      id: 'prog-2',
      name: 'Custom Prog',
      department: 'Sales',
      target_type: 'quantitative',
      is_active: true,
      monthly_target_rp: 1000000, // Legacy target exists
      monthly_target_user: 10,
      daily_target_rp: null,
      daily_target_user: null,
      created_at: '',
      program_metric_definitions: [
        { id: 'm1', program_id: 'prog-2', metric_key: 'revenue', label: 'Rev', metric_group: 'revenue', data_type: 'currency', input_type: 'manual', is_target_metric: true, monthly_target: 2000000, display_order: 1, is_primary: true, target_direction: 'higher_is_better', unit_label: null, formula: null, show_on_dashboard: true, show_on_tv: true, created_at: null }
      ],
      program_milestones: []
    } as unknown as ProgramWithRelations

    const metricValuesByProgram = new Map<string, MetricValue[]>()
    metricValuesByProgram.set('prog-2', [
      { id: 'mv1', program_id: 'prog-2', metric_definition_id: 'm1', period_id: 'p1', date: '2026-04-01', value: 1000000, target_value: null, created_at: null, created_by: null } as MetricValue
    ])
    
    const dailyInputsByProgram = new Map<string, DailyInput[]>()
    dailyInputsByProgram.set('prog-2', [
      // Legacy input exists, but should not double count if custom metric handles it
      { id: '1', program_id: 'prog-2', period_id: 'p1', date: '2026-04-01', achievement_rp: 500000, achievement_user: 0, notes: null, prospek_drop: 0, prospek_notes: null, qualitative_status: null, created_at: null, created_by: null, updated_at: null } as DailyInput
    ])

    const prorationFactor = 1.0

    const result = calculateProgramHealth(
      program,
      metricValuesByProgram,
      dailyInputsByProgram,
      new Map(),
      prorationFactor
    )

    // Should use custom target (2M) not legacy (1M). 
    // And actual should use modern value (1M) not legacy input (500k) since modern exists
    expect(result.calculatedMetrics?.revenue).toBe(1000000)
    expect(result.absoluteTargets?.revenue).toBe(2000000)
    
    // Legacy user should still be counted because there's no custom metric for user!
    expect(result.absoluteTargets?.user_acquisition).toBe(10)

    // Health: Revenue (1M/2M) = 50%. User (0/10) = 0%. Avg = 25%
    expect(result.healthScore).toBe(25)
  })

  it('should score qualitative programs based on milestone completion', () => {
    const program: ProgramWithRelations = {
      id: 'prog-3',
      name: 'Qualitative Prog',
      department: 'Product',
      target_type: 'qualitative',
      is_active: true,
      monthly_target_rp: null,
      monthly_target_user: null,
      daily_target_rp: null,
      daily_target_user: null,
      created_at: '',
      program_metric_definitions: [],
      program_milestones: [
        { id: 'ms1', program_id: 'prog-3', title: 'A', description: null, order: 1, created_at: null },
        { id: 'ms2', program_id: 'prog-3', title: 'B', description: null, order: 2, created_at: null },
        { id: 'ms3', program_id: 'prog-3', title: 'C', description: null, order: 3, created_at: null },
        { id: 'ms4', program_id: 'prog-3', title: 'D', description: null, order: 4, created_at: null },
      ]
    } as unknown as ProgramWithRelations

    const milestoneCompletionsByMilestone = new Map<string, MilestoneCompletion>()
    milestoneCompletionsByMilestone.set('ms1', { id: 'mc1', milestone_id: 'ms1', period_id: 'p1', is_completed: true, completed_at: null, updated_at: null, evidence_url: null, notes: null })
    milestoneCompletionsByMilestone.set('ms2', { id: 'mc2', milestone_id: 'ms2', period_id: 'p1', is_completed: true, completed_at: null, updated_at: null, evidence_url: null, notes: null })
    // ms3 and ms4 are not completed

    const result = calculateProgramHealth(
      program,
      new Map(),
      new Map(),
      milestoneCompletionsByMilestone,
      1.0
    )

    expect(result.isQualitativeOnly).toBe(true)
    // 2 out of 4 milestones completed = 50%
    expect(result.healthScore).toBe(50)
  })
})
