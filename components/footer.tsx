export function Footer() {
  return (
    <footer className="bg-[#0B1220]/75 border-t border-white/5 backdrop-blur-md">
      {/* Inner div mirrors the navbar exactly: max-w-7xl mx-auto px-6 py-4 with h-8 content */}
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Left — logo block identical to navbar logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-blue to-brand-purple rounded-lg flex items-center justify-center shadow-md shadow-blue-500/20">
            <span className="text-white font-bold text-sm">AA</span>
          </div>
          <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-brand-purple">
            Alpha Assistant
          </span>
        </div>

        {/* Right — tagline */}
        <p className="text-xs text-gray-500 font-medium hidden sm:block">
          Turning scattered knowledge into searchable AI memory.
        </p>
      </div>
    </footer>
  )
}
