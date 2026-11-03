import Image from 'next/image'
import FaucetForm from '@/components/FaucetForm'
import StatusCard from '@/components/StatusCard'
import RecentRequests from '@/components/RecentRequests'
import NetworkInfo from '@/components/NetworkInfo'

export const metadata = {
  title: 'Awarizon Testnet Faucet',
  description:
    'Request free testnet RIZ tokens for ' +
    'building on Awarizon',
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b
          from-[#1A1200] via-[#0D0900] to-[#0A0A0A]" />
        <div className="absolute top-0 left-1/2
          -translate-x-1/2 w-[500px] h-[250px]
          bg-[#FFCC00] opacity-[0.05]
          rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto
        px-4 py-12 lg:py-20">

        {/* Hero: giant text left, form right */}
        <div className="grid lg:grid-cols-2 gap-10
          lg:gap-16 items-center mb-14">

          {/* Left: headline */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center
              justify-center w-14 h-14 rounded-2xl
              bg-black/60 ring-1 ring-[#FFCC00]/40 mb-6">
              <Image
                src="/logo.png"
                alt="Awarizon"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>

            <h1 className="text-5xl sm:text-6xl
              lg:text-7xl xl:text-8xl font-black
              tracking-tight leading-[0.95] mb-5">
              Awarizon
              <br />
              <span className="text-[#FFCC00]">
                Faucet
              </span>
            </h1>

            <p className="text-[#8B8B93] font-mono
              text-xs sm:text-sm tracking-widest mb-4">
              TESTNET · RIZ TOKEN DISTRIBUTION
            </p>

            <p className="text-[#8B8B93] text-sm
              lg:text-base max-w-md mx-auto lg:mx-0">
              Get free testnet RIZ instantly. Build,
              test, and ship on Awarizon without
              spending real funds.
            </p>
          </div>

          {/* Right: form card */}
          <div className="w-full max-w-md mx-auto
            lg:mx-0 lg:ml-auto">
            <div className="rounded-2xl border
              border-[#FFCC00]/20 bg-[#111111]
              overflow-hidden">

              <div className="px-6 py-4 border-b
                border-white/5">
                <h2 className="font-bold text-base">
                  Request Testnet RIZ
                </h2>
                <p className="text-[#8B8B93] text-xs mt-1">
                  10 RIZ · one-time claim per address
                </p>
              </div>

              <div className="p-6">
                <FaucetForm />
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-xl mx-auto">
          <StatusCard />
        </div>

        {/* Recent */}
        <div className="mt-5 max-w-xl mx-auto">
          <RecentRequests />
        </div>

        {/* Network */}
        <div className="mt-5 max-w-xl mx-auto">
          <NetworkInfo />
        </div>

        {/* Footer */}
        <div className="text-center mt-10
          text-[#333333] text-xs font-mono space-y-1">
          <p>AWARIZON TESTNET · FOR TESTING ONLY</p>
          <p>Testnet RIZ has no monetary value</p>
          <div className="flex items-center
            justify-center gap-6 mt-3">
            <a
              href="https://rizscan.awarizon.com"
              className="hover:text-[#FFCC00]
                transition-colors"
            >
              Explorer ↗
            </a>
            <a
              href="https://awarizon.com"
              className="hover:text-[#FFCC00]
                transition-colors"
            >
              Website ↗
            </a>
            <a
              href="https://docs.awarizon.com"
              className="hover:text-[#FFCC00]
                transition-colors"
            >
              Docs ↗
            </a>
          </div>
        </div>

      </div>
    </main>
  )
}
