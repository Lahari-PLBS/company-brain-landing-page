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
      'bg-brand-primary text-white hover:shadow-lg hover:scale-105 active:scale-95',
    secondary:
      'bg-white text-brand-primary border-2 border-brand-primary hover:bg-brand-surface transition-colors',
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
