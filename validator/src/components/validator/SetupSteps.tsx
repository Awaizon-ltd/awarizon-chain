export interface SetupStep {
  title: string
  code?: string
  body?: React.ReactNode
}

// Numbered step list used by both /self-hosted (install guide) and
// /self-hosted/register (on-chain registration flow) — factored out so
// the two stay visually identical instead of drifting.
export default function SetupSteps({ steps }: { steps: SetupStep[] }) {
  return (
    <div className="space-y-4">
      {steps.map((step, i) => (
        <div key={i}
          className="bg-[#111118] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 bg-yellow-400/10 text-yellow-400
              rounded-full flex items-center justify-center
              text-sm font-bold flex-shrink-0">
              {i + 1}
            </div>
            <h3 className="font-bold">{step.title}</h3>
          </div>
          {step.code && (
            <pre className="bg-[#0a0a0f] rounded-lg p-4 text-sm
              font-mono text-green-400 overflow-x-auto whitespace-pre-wrap">
              {step.code}
            </pre>
          )}
          {step.body}
        </div>
      ))}
    </div>
  )
}
