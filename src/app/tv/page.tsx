'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTVDashboardData, TVDashboardData } from './actions'
import { Slide1Total } from './components/Slide1Total'
import { Slide2Programs } from './components/Slide2Programs'
import { Slide3PICs } from './components/Slide3PICs'
import { SlideProgress } from './components/SlideProgress'
import { cn } from '@/lib/utils'

const SLIDE_DURATION = 15000 // 15 seconds
const REFRESH_INTERVAL = 60000 // 60 seconds
const PROGRESS_UPDATE_INTERVAL = 100 // 100ms for smooth progress bar

export default function TVDashboardPage() {
  const [data, setData] = useState<TVDashboardData | null>(null)
  const [activeSlide, setActiveSlide] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const totalSlides = 3

  const fetchData = useCallback(async () => {
    try {
      const result = await getTVDashboardData()
      setData(result)
    } catch (err) {
      console.error('Failed to fetch TV data:', err)
    }
  }, [])

  // Initial Fetch & Refresh Interval
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchData])

  // Slide Rotation & Progress Logic
  useEffect(() => {
    const startTime = Date.now()
    
    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime
      const currentProgress = (elapsed / SLIDE_DURATION) * 100
      
      if (currentProgress >= 100) {
        setIsTransitioning(true)
        setTimeout(() => {
          setActiveSlide((prev) => (prev + 1) % totalSlides)
          setProgress(0)
          setIsTransitioning(false)
        }, 700) // Match Tailwind duration-700
        clearInterval(progressTimer)
      } else {
        setProgress(currentProgress)
      }
    }, PROGRESS_UPDATE_INTERVAL)

    return () => clearInterval(progressTimer)
  }, [activeSlide])

  if (!data) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 gap-6">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xl font-bold text-slate-400 uppercase tracking-widest animate-pulse">
           Menyiapkan Dashboard...
        </p>
      </div>
    )
  }

  const renderSlide = () => {
    switch (activeSlide) {
      case 0: return <Slide1Total data={data} />
      case 1: return <Slide2Programs data={data} />
      case 2: return <Slide3PICs data={data} />
      default: return null
    }
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-950 relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/5 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      {/* Slide Container */}
      <div 
        className={cn(
          "h-full w-full transition-opacity duration-700 ease-in-out relative z-10",
          isTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"
        )}
      >
        {renderSlide()}
      </div>

      {/* Persistence Elements */}
      <SlideProgress 
        currentSlide={activeSlide} 
        totalSlides={totalSlides} 
        progress={progress} 
      />
    </main>
  )
}
