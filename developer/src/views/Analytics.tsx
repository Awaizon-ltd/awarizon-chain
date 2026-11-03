'use client'

import { useEffect, useState } from 'react'
import { useWalletStore } from '../store/walletStore'
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Megaphone, Inbox, CheckCircle2, TrendingUp, BarChart3,
} from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import { INDEXER_ENDPOINT } from '../constants'

export default function Analytics() {
  const { address } = useWalletStore()
  const [stats, setStats] = useState<any>(null)
  const [chartData, setChartData] =
    useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!address) return
      try {
        const res = await fetch(
          `${INDEXER_ENDPOINT}` +
          `/campaign-events?developer=${address}` +
          `&limit=100`
        ).then(r => r.json()).catch(() => null)

        if (res?.events) {
          const events = res.events
          const deliveries = events.filter(
            (e: any) => e.event_type === 'delivered'
          )
          const engaged = events.filter(
            (e: any) => e.event_type === 'engaged'
          )

          setStats({
            totalCampaigns: events.filter(
              (e: any) => e.event_type === 'created'
            ).length,
            totalDeliveries: deliveries.length,
            totalEngagements: engaged.length,
            engagementRate: deliveries.length > 0
              ? ((engaged.length / deliveries.length)
                * 100).toFixed(1)
              : '0',
          })

          const byDay = new Map<string, {
            deliveries: number
            engagements: number
          }>()

          for (const e of events) {
            if (!e.timestamp_ms) continue
            const day = new Date(e.timestamp_ms)
              .toLocaleDateString('en-US', {
                month: 'short', day: 'numeric'
              })
            if (!byDay.has(day)) {
              byDay.set(day, {
                deliveries: 0, engagements: 0
              })
            }
            const entry = byDay.get(day)!
            if (e.event_type === 'delivered') {
              entry.deliveries++
            }
            if (e.event_type === 'engaged') {
              entry.engagements++
            }
          }

          setChartData(
            Array.from(byDay.entries())
              .slice(-14)
              .map(([day, data]) => ({
                day, ...data
              }))
          )
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [address])

  if (loading) {
    return (
      <div className="text-center py-20 text-[#888]">
        Loading analytics...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">Analytics</h1>

      <div className="grid grid-cols-2
        lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Campaigns"
          value={stats?.totalCampaigns ?? 0}
          icon={Megaphone}
        />
        <StatCard
          label="Total Deliveries"
          value={(stats?.totalDeliveries ?? 0)
            .toLocaleString()}
          icon={Inbox}
        />
        <StatCard
          label="Engagements"
          value={(stats?.totalEngagements ?? 0)
            .toLocaleString()}
          icon={CheckCircle2}
        />
        <StatCard
          label="Engagement Rate"
          value={`${stats?.engagementRate ?? 0}%`}
          icon={TrendingUp}
          accent
        />
      </div>

      {chartData.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h2 className="font-bold mb-5">
            Deliveries vs Engagements (Last 14 days)
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1F1F1F"
              />
              <XAxis
                dataKey="day"
                stroke="#888"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                stroke="#888"
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: '#111',
                  border: '1px solid #1F1F1F',
                  borderRadius: 8,
                }}
              />
              <Bar
                dataKey="deliveries"
                name="Deliveries"
                fill="#FFCC00"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="engagements"
                name="Engagements"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {chartData.length === 0 && (
        <div className="glass rounded-xl p-12
          text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-[#444]" />
          <h2 className="font-bold text-lg mb-2">
            No data yet
          </h2>
          <p className="text-[#888] text-sm">
            Create campaigns to see analytics here
          </p>
        </div>
      )}
    </div>
  )
}
