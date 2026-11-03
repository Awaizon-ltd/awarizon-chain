export default function CodeBlock({
  code,
  label,
}: {
  code: string
  label?: string
}) {
  return (
    <div className="rounded-xl border border-dev-border
      bg-black/50 overflow-hidden my-5">
      {label && (
        <div className="px-4 py-2 border-b border-dev-border
          text-[11px] uppercase tracking-wider text-[#666]">
          {label}
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed
        text-[#d4d4d4]">
        <code>{code}</code>
      </pre>
    </div>
  )
}
