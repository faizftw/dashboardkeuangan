'use client'

import { useState, useEffect } from 'react'

export function DigitalClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeString = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(time)

  const dateString = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(time)

  return (
    <div className="flex flex-col items-end">
      <div className="text-4xl font-mono font-bold text-indigo-400">
        {timeString}
      </div>
      <div className="text-sm font-semibold text-slate-400 uppercase tracking-tighter">
        {dateString}
      </div>
    </div>
  )
}
