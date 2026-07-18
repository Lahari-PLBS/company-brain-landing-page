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
    default: 'glass-panel glass-panel-hover',
    highlight: 'bg-[#1A2235]/65 border border-white/10 shadow-lg shadow-purple-500/5',
  }

  return (
    <div
      className={cn(
        'rounded-xl p-6 transition-all duration-300',
        variantStyles[variant],
        className
      )}
    >
      {title && <h4 className="font-bold text-base text-white tracking-tight mb-4">{title}</h4>}
      {children}
    </div>
  )
}
