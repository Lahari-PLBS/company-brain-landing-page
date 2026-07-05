import React from 'react'
import { cn } from '@/lib/utils'

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  className?: string
}

export function FeatureCard({
  icon,
  title,
  description,
  className,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl p-8 flex flex-col gap-4 transition-all duration-300 hover:shadow-lg',
        className
      )}
      style={{
        boxShadow:
          '0 3px 9.1px rgba(63, 74, 126, 0.05), 0 1px 29px rgba(63, 74, 126, 0.10)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{icon}</div>
      </div>
      <h3 className="text-xl font-bold text-brand-primary">{title}</h3>
      <p className="text-brand-secondary leading-relaxed">{description}</p>
    </div>
  )
}
