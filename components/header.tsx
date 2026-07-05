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
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-blue to-brand-purple rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">CB</span>
          </div>
          <span className="font-bold text-xl text-brand-primary">Company Brain</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: 'Features', id: 'features' },
            { label: 'How it Works', id: 'how-it-works' },
            { label: 'Demo', id: 'demo' },
            { label: 'Use Cases', id: 'use-cases' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className="text-brand-secondary hover:text-brand-primary transition-colors font-medium cursor-pointer"
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
              <span className="hidden sm:inline text-xs text-[#83799E] font-medium max-w-[120px] truncate">
                {user.email}
              </span>
              <Link href="/workspace">
                <button className="rounded-xl bg-gradient-to-br from-[#2BA7FF] to-[#CA45FF] px-4 py-2 text-sm text-white font-semibold hover:shadow-md transition-all cursor-pointer border-none">
                  Workspace
                </button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-brand-secondary hover:text-brand-primary font-medium text-sm transition-colors">
                Sign In
              </Link>
              <Link href="/dashboard" className="inline-flex">
                <CTAButton variant="primary" size="sm">
                  Try Demo
                </CTAButton>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
