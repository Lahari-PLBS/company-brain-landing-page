import React from 'react'
import { cn } from '@/lib/utils'

interface DashboardCardProps {
  title?: string
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'highlight'
}

export function DashboardCard({
  title,
  children,
  className,
  variant = 'default',
}: DashboardCardProps) {
  const variantStyles = {
    default: 'bg-white border border-gray-200',
    highlight: 'bg-brand-surface border-0',
  }

  return (
    <div
      className={cn(
        'rounded-xl p-6 transition-all duration-300',
        variantStyles[variant],
        className
      )}
      style={{
        boxShadow:
          variant === 'default'
            ? '0 3px 9.1px rgba(63, 74, 126, 0.05), 0 1px 29px rgba(63, 74, 126, 0.10)'
            : undefined,
      }}
    >
      {title && <h4 className="font-semibold text-brand-primary mb-4">{title}</h4>}
      {children}
    </div>
  )
}
