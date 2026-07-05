export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-brand-blue to-brand-purple rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">CB</span>
            </div>
            <span className="font-semibold text-brand-primary">Company Brain</span>
          </div>
          <p className="text-brand-secondary text-sm">
            Hackathon MVP. Turning scattered knowledge into one searchable AI memory.
          </p>
        </div>
      </div>
    </footer>
  )
}
