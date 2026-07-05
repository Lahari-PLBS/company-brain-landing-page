import { CTAButton } from './cta-button'

export function Header() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-blue to-brand-purple rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">CB</span>
          </div>
          <span className="font-bold text-xl text-brand-primary">Company Brain</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: 'Features', id: 'features' },
            { label: 'How it Works', id: 'how-it-works' },
            { label: 'Demo', id: 'demo' },
            { label: 'Use Cases', id: 'use-cases' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="text-brand-secondary hover:text-brand-primary transition-colors font-medium"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <CTAButton variant="primary" size="sm">
          Try Demo
        </CTAButton>
      </div>
    </header>
  )
}
