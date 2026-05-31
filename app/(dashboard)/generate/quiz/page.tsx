import { QuizForm } from '@/components/generate/QuizForm'

export default function QuizPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Generator Kuis</h1>
        <p className="text-gray-400 text-sm mt-1">Buat soal pilihan ganda otomatis dengan AI</p>
      </div>
      <QuizForm />
    </div>
  )
}
