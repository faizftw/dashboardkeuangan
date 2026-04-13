/**
 * Safe Formula Evaluator
 * 
 * Evaluates metric formulas without using eval().
 * Supports operators: + - * /
 * Tokens can be metric_keys (resolved from `values`) or numeric literals.
 * 
 * Examples:
 *   'omzet / budget_iklan'      → ROAS
 *   'closing / lead_masuk'      → Conversion Rate (as decimal, * 100 for %)
 *   'budget_iklan / closing'    → CPP Real
 */

type TokenType = 'number' | 'operator' | 'identifier'

interface Token {
  type: TokenType
  value: string
}

const ALLOWED_OPERATORS = new Set(['+', '-', '*', '/'])

/**
 * Tokenize a formula string into a flat list of tokens.
 * No parentheses supported for simplicity and safety.
 */
function tokenize(formula: string): Token[] {
  const tokens: Token[] = []
  const cleaned = formula.trim()
  // Split on operators while keeping them
  const parts = cleaned.split(/([+\-*/])/).map(p => p.trim()).filter(Boolean)
  
  for (const part of parts) {
    if (ALLOWED_OPERATORS.has(part)) {
      tokens.push({ type: 'operator', value: part })
    } else if (/^\d+(\.\d+)?$/.test(part)) {
      tokens.push({ type: 'number', value: part })
    } else if (/^[a-z_][a-z0-9_]*$/.test(part)) {
      tokens.push({ type: 'identifier', value: part })
    } else {
      // Unknown token — abort evaluation
      throw new Error(`Invalid token in formula: "${part}"`)
    }
  }
  
  return tokens
}

/**
 * Resolve a single token to its numeric value.
 * Returns null if the identifier is missing from values.
 */
function resolveToken(
  token: Token,
  values: Record<string, number | null>
): number | null {
  if (token.type === 'number') {
    return parseFloat(token.value)
  }
  if (token.type === 'identifier') {
    const v = values[token.value]
    return v ?? null
  }
  return null
}

/**
 * Apply a binary operation between two numbers.
 * Returns null on division by zero.
 */
function applyOp(left: number, op: string, right: number): number | null {
  switch (op) {
    case '+': return left + right
    case '-': return left - right
    case '*': return left * right
    case '/':
      if (right === 0) return null  // division by zero → display as "—"
      return left / right
    default:
      return null
  }
}

/**
 * Evaluate a formula string with given metric values.
 * 
 * @param formula - e.g. 'omzet / budget_iklan'
 * @param values  - map of metric_key → current value
 * @returns computed number, or null if any required value is missing/zero-divisor
 */
export function evaluateFormula(
  formula: string,
  values: Record<string, number | null>
): number | null {
  if (!formula || formula.trim() === '') return null

  let tokens: Token[]
  try {
    tokens = tokenize(formula)
  } catch {
    return null  // Invalid formula
  }

  if (tokens.length === 0) return null

  // Evaluate left to right (no operator precedence — keep formulas simple)
  // For * and / to work correctly in mixed expressions like 'a + b * c',
  // users should write separate calculated metrics for complex logic.
  let result: number | null = resolveToken(tokens[0], values)
  if (result === null) return null

  let i = 1
  while (i < tokens.length - 1) {
    const opToken = tokens[i]
    const rightToken = tokens[i + 1]

    if (opToken.type !== 'operator') return null
    
    const right = resolveToken(rightToken, values)
    if (right === null) return null

    result = applyOp(result, opToken.value, right)
    if (result === null) return null  // division by zero

    i += 2
  }

  return result
}

/**
 * Format a metric value for display based on its data_type.
 */
export function formatMetricValue(
  value: number | null,
  dataType: 'integer' | 'currency' | 'percentage' | 'float' | 'boolean',
  unitLabel?: string | null
): string {
  if (value === null || value === undefined) return '—'
  
  switch (dataType) {
    case 'currency': {
      if (value >= 1_000_000_000) {
        return `Rp ${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}M`
      }
      if (value >= 1_000_000) {
        return `Rp ${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}jt`
      }
      return `Rp ${value.toLocaleString('id-ID')}`
    }
    case 'percentage':
      return `${value.toFixed(1)}%`
    case 'float':
      return `${value.toFixed(2)}${unitLabel ? ' ' + unitLabel : ''}`
    case 'integer':
      return `${Math.round(value).toLocaleString('id-ID')}${unitLabel ? ' ' + unitLabel : ''}`
    case 'boolean':
      return value ? 'Ya' : 'Tidak'
    default:
      return `${value}${unitLabel ? ' ' + unitLabel : ''}`
  }
}
