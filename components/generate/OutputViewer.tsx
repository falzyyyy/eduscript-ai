'use client'
import { useState } from 'react'
import { ExportButton } from '@/components/shared/ExportButton'
import type { OutputViewerProps, QuizOutput, LessonPlanOutput, SummaryOutput } from '@/types'

export function OutputViewer({ content, type, topic, loading }: OutputViewerProps) {
  let parsed: QuizOutput | LessonPlanOutput | SummaryOutput | null = null
  try {
    parsed = JSON.parse(content)
  } catch {
    // Not valid JSON yet (still streaming)
  }

  return (
    <div className="border border-white/[0.06] rounded-2xl bg-[#0d1224]/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          {loading && (
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          )}
          <h3 className="font-semibold text-white">
            {parsed && 'title' in parsed ? parsed.title : loading ? 'Sedang membuat...' : topic}
          </h3>
        </div>
        {!loading && content && (
          <ExportButton content={content} type={type} topic={topic} />
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {loading && !content && (
          <div className="flex items-center gap-3 text-gray-400">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm">AI sedang membuat konten...</span>
          </div>
        )}

        {/* Quiz Output */}
        {type === 'quiz' && parsed && 'questions' in parsed && parsed.questions ? (
          <div className="space-y-4">
            {parsed.questions.map((q, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                <p className="font-medium text-white mb-3">
                  <span className="text-violet-400 font-bold mr-2">{i + 1}.</span>
                  {q.question}
                </p>
                <ul className="space-y-1.5 mb-3">
                  {q.options?.map((opt, j) => (
                    <li
                      key={j}
                      className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                        opt.startsWith(q.answer)
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'text-gray-400'
                      }`}
                    >
                      {opt}
                    </li>
                  ))}
                </ul>
                {q.explanation && (
                  <div className="text-xs text-gray-500 bg-white/[0.02] rounded-lg px-3 py-2 border border-white/[0.04]">
                    💡 {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : type === 'lesson_plan' && parsed && 'activities' in parsed ? (
          /* Lesson Plan Output */
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Durasi</p>
                <p className="text-sm font-medium text-white">{parsed.duration}</p>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Penilaian</p>
                <p className="text-sm font-medium text-white">{parsed.assessment}</p>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-violet-400 mb-2">Tujuan Pembelajaran</h4>
              <ul className="space-y-1">
                {parsed.objectives?.map((obj, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-violet-500 mt-0.5">•</span> {obj}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-violet-400 mb-2">Bahan Ajar</h4>
              <div className="flex flex-wrap gap-2">
                {parsed.materials?.map((m, i) => (
                  <span key={i} className="text-xs bg-white/[0.04] border border-white/[0.06] text-gray-300 px-3 py-1 rounded-full">{m}</span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-violet-400 mb-3">Kegiatan Pembelajaran</h4>
              <div className="space-y-3">
                {parsed.activities?.map((act, i) => (
                  <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-semibold bg-violet-500/15 text-violet-300 px-2.5 py-0.5 rounded-full">{act.phase}</span>
                      <span className="text-xs text-gray-500">{act.duration}</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{act.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : type === 'summary' && parsed && 'key_points' in parsed ? (
          /* Summary Output */
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-300 leading-relaxed">{parsed.overview}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-violet-400 mb-2">Poin-Poin Utama</h4>
              <ul className="space-y-2">
                {parsed.key_points?.map((point, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2 bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2">
                    <span className="text-violet-400 font-bold">{i + 1}.</span> {point}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-violet-400 mb-2">Penjelasan Detail</h4>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{parsed.details}</p>
            </div>
            <div className="bg-violet-500/5 border border-violet-500/10 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-violet-400 mb-1">Kesimpulan</h4>
              <p className="text-sm text-gray-300">{parsed.conclusion}</p>
            </div>
          </div>
        ) : content ? (
          /* Raw / streaming text */
          <pre className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed font-mono">{content}</pre>
        ) : null}
      </div>
    </div>
  )
}
