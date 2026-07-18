'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CTAButton } from '@/components/cta-button'
import { FeatureCard } from '@/components/feature-card'
import { DashboardCard } from '@/components/dashboard-card'
import {
  Search,
  CheckCircle,
  AlertTriangle,
  Copy,
  Zap,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'

const features = [
  {
    icon: <Search className="w-6 h-6 text-brand-blue" />,
    title: 'Ask About Projects',
    description: 'Search instantly across your entire knowledge base to find what happened in any project.',
  },
  {
    icon: <CheckCircle className="w-6 h-6 text-brand-purple" />,
    title: 'Decision Tracking',
    description: 'Automatically extract and organize all decisions made, with full context and dates.',
  },
  {
    icon: <Zap className="w-6 h-6 text-brand-orange" />,
    title: 'Pending Task Extraction',
    description: 'Never lose track of action items with AI-powered task identification.',
  },
  {
    icon: <AlertTriangle className="w-6 h-6 text-brand-blue" />,
    title: 'Risk Detection',
    description: 'Identify potential issues and risks hidden in your company knowledge.',
  },
  {
    icon: <Copy className="w-6 h-6 text-brand-purple" />,
    title: 'Duplicate Work',
    description: 'Find and eliminate duplicate efforts across teams and projects.',
  },
  {
    icon: <TrendingUp className="w-6 h-6 text-brand-orange" />,
    title: 'Missing Documentation',
    description: 'Get alerts on undocumented processes and knowledge gaps.',
  },
]

const useCases = [
  {
    title: 'Project Managers',
    description: 'Keep every project detail accessible and trackable in seconds.',
  },
  {
    title: 'Operations Teams',
    description: 'Streamline process discovery and eliminate duplicated work.',
  },
  {
    title: 'Founders',
    description: 'Access institutional knowledge without losing context.',
  },
  {
    title: 'Knowledge-Heavy Teams',
    description: 'Transform scattered information into a unified intelligence layer.',
  },
]

export default function Home() {
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

  return (
    <div className="min-h-screen bg-[#0B1220] text-gray-100">

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <h1 className="text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
                Turn Scattered Knowledge Into{' '}
                <span
                  className="bg-clip-text text-transparent bg-gradient-to-r from-brand-blue via-brand-purple to-brand-orange"
                >
                  One AI Memory
                </span>
              </h1>

              <p className="text-lg text-gray-400 font-medium leading-relaxed">
                Search across emails, documents, chats, meeting notes, and PDFs in one place. Get answers grounded in your company knowledge.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-1">
                <Link href="/dashboard" className="inline-flex">
                  <CTAButton variant="primary" size="lg">
                    Demo
                  </CTAButton>
                </Link>
                {!user && (
                  <Link href="/login" className="inline-flex">
                    <CTAButton variant="secondary" size="lg">
                      Sign In
                    </CTAButton>
                  </Link>
                )}
              </div>
            </div>

            {/* Product Mockup */}
            <div className="relative h-96 lg:h-[500px] bg-[#1A2235]/40 backdrop-blur-md rounded-2xl border border-white/5 flex items-center justify-center overflow-hidden shadow-2xl shadow-blue-500/5 group hover:border-white/10 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/10 via-transparent to-brand-purple/10"></div>
              <div className="relative text-center z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-purple mb-4 shadow-lg shadow-blue-500/20">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <p className="text-gray-300 font-semibold uppercase tracking-wider text-xs">
                  AlphaAssistant Dashboard
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="bg-[#111827]/40 border-y border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gray-400 font-medium tracking-wide">
            Built for modern teams handling messy knowledge
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold text-white tracking-tight mb-4">
            Powerful Features for Your Team
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-medium">
            Everything you need to turn company knowledge into actionable insights
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <FeatureCard
              key={i}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="bg-[#111827]/40 border-y border-white/5 py-14"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-extrabold text-white tracking-tight mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Ingest Scattered Knowledge',
                description: 'Connect your emails, documents, chats, PDFs and meeting transcripts',
              },
              {
                step: '2',
                title: 'Retrieve Relevant Context',
                description: 'AI finds the most relevant information from your entire knowledge base',
              },
              {
                step: '3',
                title: 'Generate Grounded Answers',
                description: 'Get comprehensive answers with full citations and source links',
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple text-white font-extrabold mb-4 shadow-md shadow-blue-500/10">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                  {item.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="bg-[#111827]/40 border-y border-white/5 py-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-extrabold text-white tracking-tight mb-4">
              Built for Every Role
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {useCases.map((useCase, i) => (
              <DashboardCard
                key={i}
                title={useCase.title}
                className="hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300"
              >
                <p className="text-gray-400 text-sm leading-relaxed">{useCase.description}</p>
              </DashboardCard>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 pb-8 text-center">
        <h2 className="text-4xl font-extrabold text-white tracking-tight mb-6">
          Never Lose Company Knowledge Again
        </h2>
        <p className="text-lg text-gray-400 mb-5 max-w-2xl mx-auto font-medium">
          Join modern teams that are using AlphaAssistant to unlock their collective intelligence
        </p>
        <Link href="/dashboard" className="inline-flex">
          <CTAButton variant="primary" size="lg">
            Launch Demo
          </CTAButton>
        </Link>
        {/* 4cm spacer below Launch Demo button */}
        <div style={{ height: '4cm' }} />
      </section>
    </div>
  )
}
