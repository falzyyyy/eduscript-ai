import { SummaryForm } from '@/components/generate/SummaryForm'

export default function SummaryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Ringkasan Materi</h1>
        <p className="text-gray-400 text-sm mt-1">Buat ringkasan materi yang komprehensif dan terstruktur</p>
      </div>
      <SummaryForm />
    </div>
  )
}
