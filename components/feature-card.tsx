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
        'glass-panel glass-panel-hover rounded-2xl p-8 flex flex-col gap-4 transition-all duration-300',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl p-2 bg-white/5 rounded-xl border border-white/5">{icon}</div>
      </div>
      <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  )
}
