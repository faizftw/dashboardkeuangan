import React from 'react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TV Dashboard Slideshow',
  description: 'Internal performance monitoring display',
}

export default function TVLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-slate-950 min-h-screen text-slate-50 antialiased overflow-hidden">
      {children}
    </div>
  )
}
