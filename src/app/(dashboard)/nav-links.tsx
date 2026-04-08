'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  FileInput, 
  Database,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavLinksProps {
  isCollapsed?: boolean
  onClick?: () => void
}

export function NavLinks({ isCollapsed, onClick }: NavLinksProps) {
  const pathname = usePathname()

  const links = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: LayoutDashboard,
      active: pathname === '/dashboard'
    },
    { 
      name: 'Pencapaian Harian', 
      href: '/input-harian', 
      icon: FileInput,
      active: pathname?.startsWith('/input-harian')
    },
    { 
      name: 'Master Data', 
      href: '/master-data', 
      icon: Database,
      active: pathname?.startsWith('/master-data')
    },
  ]

  return (
    <nav className="flex flex-col gap-2 px-3">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onClick}
          className={cn(
            "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative",
            link.active 
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" 
              : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
          )}
        >
          <link.icon className={cn("h-5 w-5 shrink-0", link.active ? "text-white" : "text-slate-500 group-hover:text-indigo-600")} />
          
          {!isCollapsed && (
            <span className="flex-1 truncate animate-in fade-in slide-in-from-left-2 duration-300">
              {link.name}
            </span>
          )}

          {isCollapsed && (
            <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              {link.name}
            </div>
          )}

          {!isCollapsed && link.active && (
             <ChevronRight className="h-4 w-4 opacity-70" />
          )}
        </Link>
      ))}
    </nav>
  )
}
