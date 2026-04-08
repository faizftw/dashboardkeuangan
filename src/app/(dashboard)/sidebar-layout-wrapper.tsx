'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { cn } from '@/lib/utils'

interface LocalProfile {
  id: string
  name: string
  role: 'admin' | 'pic' | null
}

export function SidebarLayoutWrapper({
  children,
  profile,
  user
}: {
  children: React.ReactNode
  profile: LocalProfile | null
  user: { email?: string } | null
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <Sidebar 
        profile={profile} 
        userEmail={user?.email || ''} 
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Content Area */}
      <main 
        className={cn(
          "flex-1 w-full transition-all duration-300 ease-in-out",
          isCollapsed ? "lg:ml-20" : "lg:ml-72"
        )}
      >
        <div className="p-4 md:p-8 lg:p-10 max-w-full lg:max-w-[1600px] mx-auto min-h-screen">
          {children}
        </div>
      </main>
    </div>
  )
}
