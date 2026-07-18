import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export const metadata: Metadata = {
  title: 'AlphaAssistant - Centralized AI Memory for Organizations',
  description: 'Search across emails, documents, chats, PDFs, and meeting notes. Get answers grounded in your company knowledge with AI.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0B1220',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased bg-[#0B1220] text-gray-100 min-h-screen flex flex-col relative overflow-x-hidden selection:bg-purple-600/30 selection:text-white">
        {/* Animated Background Glowing Blobs — fixed so they never inflate page height */}
        <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none animate-pulse duration-[8000ms] z-0" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none animate-pulse duration-[10000ms] z-0" />
        <div className="fixed top-[30%] right-[20%] w-[35vw] h-[35vw] rounded-full bg-cyan-600/5 blur-[100px] pointer-events-none animate-pulse duration-[6000ms] z-0" />

        <Header />
        <div className="flex-1 relative z-10">
          {children}
        </div>
        <Footer />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
