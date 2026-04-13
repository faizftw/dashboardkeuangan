/**
 * Department Configuration
 * 
 * Single source of truth for department values used across the app.
 * Matches the CHECK constraint in migration 008.
 */

export type DepartmentKey =
  | 'sales_marketing'
  | 'operations'
  | 'creative'
  | 'web_it'
  | 'general_affair'
  | 'customer_service'
  | 'hr'
  | 'general'

export interface DepartmentConfig {
  key: DepartmentKey
  label: string
  color: string  // Tailwind bg color class for badges
  textColor: string  // Tailwind text color class
}

export const DEPARTMENTS: DepartmentConfig[] = [
  {
    key: 'sales_marketing',
    label: 'Sales & Marketing',
    color: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  {
    key: 'operations',
    label: 'Operasional',
    color: 'bg-green-100',
    textColor: 'text-green-700',
  },
  {
    key: 'creative',
    label: 'Creative',
    color: 'bg-purple-100',
    textColor: 'text-purple-700',
  },
  {
    key: 'web_it',
    label: 'Web & IT Dev',
    color: 'bg-cyan-100',
    textColor: 'text-cyan-700',
  },
  {
    key: 'general_affair',
    label: 'General Affair',
    color: 'bg-orange-100',
    textColor: 'text-orange-700',
  },
  {
    key: 'customer_service',
    label: 'Customer Service',
    color: 'bg-pink-100',
    textColor: 'text-pink-700',
  },
  {
    key: 'hr',
    label: 'HR',
    color: 'bg-yellow-100',
    textColor: 'text-yellow-700',
  },
  {
    key: 'general',
    label: 'General',
    color: 'bg-slate-100',
    textColor: 'text-slate-600',
  },
]

export const DEPARTMENT_MAP = Object.fromEntries(
  DEPARTMENTS.map(d => [d.key, d])
) as Record<DepartmentKey, DepartmentConfig>

export function getDepartmentConfig(key: string): DepartmentConfig {
  const normalizedKey = key.toLowerCase().trim()
  
  // 1. Exact match or case-insensitive key match
  const matchByKey = DEPARTMENTS.find(d => d.key.toLowerCase() === normalizedKey)
  if (matchByKey) return matchByKey

  // 2. Try matching by Label (common for Excel migrations)
  const matchByLabel = DEPARTMENTS.find(d => d.label.toLowerCase() === normalizedKey)
  if (matchByLabel) return matchByLabel

  // 3. Fallback
  return DEPARTMENT_MAP['general']
}
