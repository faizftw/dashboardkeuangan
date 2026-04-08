'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTVDashboardData, TVDashboardData } from './actions'
import { Slide1Total } from './components/Slide1Total'
import { Slide2Programs } from './components/Slide2Programs'
import { Slide3PICs } from './components/Slide3PICs'
import { SlideProgress } from './components/SlideProgress'
import { SlideProgramDetail } from './components/SlideProgramDetail'
import { SlidePICDetail } from './components/SlidePICDetail'
import { cn } from '@/lib/utils'

const SLIDE_DURATION = 10000 // 10 seconds
const REFRESH_INTERVAL = 60000 // 60 seconds
const PROGRESS_UPDATE_INTERVAL = 100 // 100ms for smooth progress bar

export default function TVDashboardPage() {
  const [data, setData] = useState<TVDashboardData | null>(null)
  const [activeSlide, setActiveSlide] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Dynamic slides calculation
  const totalSummarySlides = 3
  const totalProgramSlides = data?.programs?.length || 0
  const totalPICSlides = data?.pics?.length || 0
  const totalSlides = totalSummarySlides + totalProgramSlides + totalPICSlides

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
    if (!data) return

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
  }, [activeSlide, data, totalSlides])

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
    // 0: Global Summary
    // 1: All Programs Grid
    // 2: All PICs Grid
    // 3..3+P-1: Individual Program Details
    // 3+P..3+P+PIC-1: Individual PIC Details

    if (activeSlide === 0) return <Slide1Total data={data} />
    if (activeSlide === 1) return <Slide2Programs data={data} />
    if (activeSlide === 2) return <Slide3PICs data={data} />

    const programIdx = activeSlide - totalSummarySlides
    if (programIdx < totalProgramSlides) {
      const program = data.programs[programIdx]
      const programInputs = (data.rawInputs || []).filter(i => i.program_id === program.id)
      return <SlideProgramDetail program={program} inputs={programInputs} />
    }

    const picIdx = activeSlide - totalSummarySlides - totalProgramSlides
    if (picIdx < totalPICSlides) {
      const pic = data.pics[picIdx]
      const picPrograms = data.programs.filter(p => p.pic_name === pic.picName)
      return <SlidePICDetail pic={pic} programs={picPrograms} />
    }

    return null
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
