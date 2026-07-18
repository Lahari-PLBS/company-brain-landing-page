'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CTAButton } from './cta-button'

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleNavClick = (id: string) => {
    if (pathname === '/') {
      const element = document.getElementById(id)
      element?.scrollIntoView({ behavior: 'smooth' })
    } else {
      router.push(`/#${id}`)
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-[#0B1220]/75 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-blue to-brand-purple rounded-lg flex items-center justify-center shadow-md shadow-blue-500/20">
            <span className="text-white font-bold text-sm">AA</span>
          </div>
          <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-brand-purple">Alpha Assistant</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: 'Features', id: 'features' },
            { label: 'How it Works', id: 'how-it-works' },
            { label: 'Use Cases', id: 'use-cases' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className="text-gray-400 hover:text-white transition-colors font-medium cursor-pointer"
            >
              {item.label}
            </button>
          ))}
          {user && (
            <Link 
              href="/workspace" 
              className="text-brand-blue hover:text-brand-purple transition-colors font-semibold"
            >
              My Workspace
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-gray-400 font-medium max-w-[120px] truncate">
                {user.email}
              </span>
              <Link href="/workspace">
                <button className="rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] hover:from-[#2563EB] hover:to-[#7C3AED] px-4 py-2 text-sm text-white font-semibold hover:shadow-lg hover:shadow-blue-500/20 transition-all cursor-pointer border-none">
                  Workspace
                </button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-400 hover:text-white font-medium text-sm transition-colors">
                Sign In
              </Link>
              <Link href="/dashboard" className="inline-flex">
                <CTAButton variant="primary" size="sm">
                  Demo
                </CTAButton>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
