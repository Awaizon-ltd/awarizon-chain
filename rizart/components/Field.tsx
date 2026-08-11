export const inputCls = `
  w-full bg-rz-s2 border border-rz-border
  rounded-xl px-4 py-3 text-sm text-white
  placeholder-[#555] focus:outline-none
  focus:border-yellow-400/50 transition-colors
`

export default function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-sm text-[#888] font-semibold block mb-2">{label}</label>
      {children}
      {hint && <p className="text-xs text-[#555] mt-1">{hint}</p>}
    </div>
  )
}
