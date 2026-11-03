import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-rz-border bg-rz-bg py-12 px-4 mt-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-yellow-400 flex items-center justify-center">
            <span className="text-black font-black text-xs">R</span>
          </div>
          <span className="font-black">
            Riz<span className="text-yellow-400">Art</span>
          </span>
          <span className="text-[#444] text-sm ml-2">NFT Marketplace on Awarizon</span>
        </div>

        <div className="flex items-center gap-6 text-sm text-[#888]">
          <Link href="/explore" className="hover:text-white transition-colors">
            Explore
          </Link>
          <Link href="/rankings" className="hover:text-white transition-colors">
            Rankings
          </Link>
          <Link href="/studio" className="hover:text-white transition-colors">
            Create
          </Link>
          <a
            href="https://awarizon.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-yellow-400 transition-colors"
          >
            Powered by Awarizon ↗
          </a>
        </div>

        <p className="text-[#444] text-xs">© 2026 RizArt</p>
      </div>
    </footer>
  )
}
