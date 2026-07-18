import React from 'react'
import { cn } from '@/lib/utils'

interface CTAButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function CTAButton({
  children,
  variant = 'primary',
  size = 'md',
  className,
}: CTAButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 cursor-pointer'

  const variants = {
    primary:
      'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 hover:-translate-y-0.5 active:translate-y-0 hover:scale-[1.03] active:scale-[0.98]',
    secondary:
      'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200',
  }

  const sizes = {
    sm: 'px-6 py-2 text-sm',
    md: 'px-8 py-3 text-base',
    lg: 'px-10 py-4 text-lg',
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      style={{
        boxShadow:
          variant === 'primary'
            ? '0 3px 9.1px rgba(63, 74, 126, 0.05), 0 1px 29px rgba(63, 74, 126, 0.10)'
            : undefined,
      }}
    >
      {children}
    </button>
  )
}
