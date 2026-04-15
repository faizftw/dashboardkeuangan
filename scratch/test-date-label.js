const { format } = require('date-fns');

function getPreviousPeriodLabel(startDate, endDate) {
  if (!startDate || !endDate) return 'vs periode sblmnya'
  
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'vs periode sblmnya'

    const diffTime = Math.abs(end.getTime() - start.getTime())
    const daysInSelection = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    
    const prevEnd = new Date(start)
    prevEnd.setDate(prevEnd.getDate() - 1)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - daysInSelection + 1)
    
    const fmt = (d) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    
    return `vs ${fmt(prevStart)} - ${fmt(prevEnd)}`
  } catch (e) {
    return 'vs periode sblmnya'
  }
}

console.log('Test 1 (3-6 Apr):', getPreviousPeriodLabel('2026-04-03', '2026-04-06'));
console.log('Test 2 (1-30 Apr):', getPreviousPeriodLabel('2026-04-01', '2026-04-30'));
console.log('Test 3 (Undefined):', getPreviousPeriodLabel(undefined, undefined));
