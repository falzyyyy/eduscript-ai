interface QuotaCardProps {
  label: string
  value: number | string
  description?: string
  color?: 'violet' | 'amber' | 'emerald' | 'red' | 'blue'
}

const colorMap = {
  violet: 'bg-violet-500/5 border-violet-500/10 text-violet-400',
  amber: 'bg-amber-500/5 border-amber-500/10 text-amber-400',
  emerald: 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400',
  red: 'bg-red-500/5 border-red-500/10 text-red-400',
  blue: 'bg-blue-500/5 border-blue-500/10 text-blue-400',
}

export function QuotaCard({ label, value, description, color = 'violet' }: QuotaCardProps) {
  return (
    <div className={`rounded-2xl border p-5 ${colorMap[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-white mt-2">{value}</p>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
  )
}
