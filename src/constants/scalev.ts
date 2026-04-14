/**
 * Scalev API Integration Constants
 * 
 * Mapping antara field dari Scalev API ke metric_key dalam sistem kita.
 * File ini hanya dokumentasi struktur — belum diimplementasi.
 * 
 * Untuk implementasi: tambahkan data source di daily_metric_values
 * dengan source = 'scalev' saat data diambil dari API.
 */

export const SCALEV_METRIC_MAP: Record<string, string> = {
  ads_spent:      'budget_iklan',   // Budget Iklan / Ad Spend
  goals:          'closing',        // Goals = Closing (user acquisition)
  cpm:            'cpm',            // CPM (belum ada di template saat ini)
  cpc_all:        'cpc',            // CPC All (belum ada di template saat ini)
  adds_to_cart:   'adds_to_cart',   // Adds to Cart (belum ada di template saat ini)
  cost_per_goal:  'cpp_real',       // Cost per Goal = CPP Real
  // roas dan conversion_rate TIDAK dari Scalev — dihitung dari formula
  // omzet juga tidak dari Scalev — diinput manual atau dari sistem payment
}

/**
 * Metric keys yang berasal dari Scalev (tidak boleh di-edit manual)
 * Tampilkan badge "Scalev" di input harian jika key ada di list ini
 */
export const SCALEV_AUTO_KEYS = Object.values(SCALEV_METRIC_MAP)

/**
 * Untuk nanti: endpoint Scalev
 * - Base URL: https://api.scalev.io (placeholder)
 * - Auth: Bearer token dari env SCALEV_API_KEY
 * - Method: GET /reports/daily?date=YYYY-MM-DD&account_id=...
 */
export const SCALEV_CONFIG = {
  baseUrl: process.env.SCALEV_BASE_URL || '',
  apiKey: process.env.SCALEV_API_KEY || '',
}
