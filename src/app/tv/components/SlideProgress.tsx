'use client'

import { cn } from '@/lib/utils'

interface SlideProgressProps {
  currentSlide: number
  totalSlides: number
  progress: number // 0 to 100
}

export function SlideProgress({ currentSlide, totalSlides, progress }: SlideProgressProps) {
  return (
    <div className="fixed bottom-0 left-0 w-full z-50">
      {/* Visual Progress Bar */}
      <div className="h-1.5 bg-slate-800 w-full overflow-hidden">
        <div 
          className="h-full bg-indigo-500 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(99,102,241,0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Slide Indicators (Dots) */}
      <div className="absolute bottom-6 right-8 flex items-center gap-3 bg-slate-900/50 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700/50">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <div 
            key={i}
            className={cn(
              "transition-all duration-500 rounded-full",
              currentSlide === i 
                ? "w-8 h-2.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" 
                : "w-2.5 h-2.5 bg-slate-700"
            )}
          />
        ))}
      </div>
      
      {/* Slide Number Label */}
      <div className="absolute bottom-6 left-8 text-xs font-bold text-slate-500 uppercase tracking-widest px-4 py-2 bg-slate-900/50 backdrop-blur-md rounded-full border border-slate-700/50">
        Slide <span className="text-slate-300">{currentSlide + 1}</span> / {totalSlides}
      </div>
    </div>
  )
}
