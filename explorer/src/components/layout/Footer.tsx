const YEAR = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="border-t border-awz-border bg-awz-surface mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <span className="text-[10px] font-mono text-awz-muted/40">© {YEAR} Awarizon. All rights reserved.</span>
      </div>
    </footer>
  )
}
