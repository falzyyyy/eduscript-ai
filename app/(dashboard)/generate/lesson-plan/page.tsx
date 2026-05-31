import { LessonPlanForm } from '@/components/generate/LessonPlanForm'

export default function LessonPlanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Rencana Pembelajaran</h1>
        <p className="text-gray-400 text-sm mt-1">Susun RPP lengkap dalam hitungan detik</p>
      </div>
      <LessonPlanForm />
    </div>
  )
}
