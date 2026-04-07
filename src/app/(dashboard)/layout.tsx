import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '@/app/login/actions'
import { Button } from '@/components/ui/button'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-100 text-indigo-700 w-10 h-10 rounded-lg flex items-center justify-center font-bold shadow-sm">
            TK
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-600">
            Target Keuangan
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
            <div className="hidden md:flex space-x-8 ml-6">
              <a href="/dashboard" className="text-slate-900 border-b-2 border-indigo-600 px-1 pt-1 text-sm font-medium">
                Dashboard
              </a>
              {/* Only admins see the master data link strictly, but since PICs have read only access, we can let everyone see it or conditionally render based on role */}
              <a href="/master-data" className="text-slate-500 hover:text-slate-700 hover:border-slate-300 border-b-2 border-transparent px-1 pt-1 text-sm font-medium transition-colors">
                Master Data
              </a>
            </div>
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-bold text-slate-800">{profile?.name || user.email}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wide">
              {profile?.role || 'User'}
            </span>
          </div>
          
          <form action={logout}>
            <Button variant="outline" size="sm" className="text-slate-600 border-slate-200 hover:bg-slate-50">
              Keluar
            </Button>
          </form>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  )
}
