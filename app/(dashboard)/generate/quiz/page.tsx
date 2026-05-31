'use client'
import { useState } from 'react'
import { QuizForm } from '@/components/generate/QuizForm'
import { ManualQuizForm } from '@/components/generate/ManualQuizForm'

export default function QuizPage() {
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Generator Kuis</h1>
          <p className="text-gray-400 text-sm mt-1">Buat kuis pilihan ganda otomatis dengan AI atau buat kuis kustom Anda secara manual</p>
        </div>

        {/* Premium Tab Switcher */}
        <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/[0.06] rounded-xl self-start sm:self-auto shadow-inner">
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'ai'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🤖 Buat dengan AI
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'manual'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            ✏️ Buat Manual
          </button>
        </div>
      </div>

      {activeTab === 'ai' ? <QuizForm /> : <ManualQuizForm />}
    </div>
  )
}
