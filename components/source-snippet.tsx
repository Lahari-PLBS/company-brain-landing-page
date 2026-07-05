import React from 'react'
import { DashboardCard } from './dashboard-card'

interface SourceSnippetProps {
  source: string
  content: string
  highlight?: string
}

export function SourceSnippet({
  source,
  content,
  highlight,
}: SourceSnippetProps) {
  return (
    <DashboardCard variant="default" className="text-sm">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
        <div className="w-2 h-2 rounded-full bg-brand-blue"></div>
        <span className="font-medium text-brand-secondary text-xs uppercase tracking-wide">
          {source}
        </span>
      </div>
      <p className="text-brand-primary leading-relaxed">
        {highlight ? (
          <>
            {content.split(highlight).map((part, i) => (
              <React.Fragment key={i}>
                {part}
                {i < content.split(highlight).length - 1 && (
                  <span className="bg-yellow-100 px-1 rounded">{highlight}</span>
                )}
              </React.Fragment>
            ))}
          </>
        ) : (
          content
        )}
      </p>
    </DashboardCard>
  )
}
