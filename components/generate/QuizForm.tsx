'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OutputViewer } from './OutputViewer'

export function QuizForm() {
  const [topik, setTopik] = useState('')
  const [jumlahSoal, setJumlahSoal] = useState('5')
  const [kesulitan, setKesulitan] = useState('sedang')
  const [jenjang, setJenjang] = useState('SMA')
  const [jurusan, setJurusan] = useState('IPA')
  const [mapel, setMapel] = useState('Biologi')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Prerequisites state
  const [prereqList, setPrereqList] = useState<any[]>([])
  const [selectedPrereq, setSelectedPrereq] = useState<string>('tidak_ada')

  // Fetch previous documents for prerequisites list
  useEffect(() => {
    fetch('/api/documents')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Filter to only include quizzes as prerequisites for safety
          setPrereqList(data.filter(d => d.type === 'quiz'))
        }
      })
      .catch(err => console.error(err))
  }, [])

  async function handleGenerate() {
    if (!topik.trim()) return
    setLoading(true)
    setOutput('')
    setError('')

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'quiz',
          topic: topik,
          options: { 
            count: jumlahSoal, 
            difficulty: kesulitan, 
            level: jenjang,
            class_group: jurusan,
            subject: mapel
          },
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Terjadi kesalahan' }))
        setError(errData.error || 'Terjadi kesalahan')
        setLoading(false)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let result = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        result += decoder.decode(value)
        setOutput(result)
      }

      // Auto-save
      await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'quiz',
          title: `Kuis: ${topik} (${mapel} - ${jurusan})`,
          topic: topik,
          content: result,
          class_group: jurusan,
          subject: mapel,
          prerequisite_id: selectedPrereq === 'tidak_ada' ? null : selectedPrereq,
        }),
      })
    } catch {
      setError('Gagal menghubungi server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300 text-sm mb-1.5 block">Topik / Materi</Label>
              <Input
                placeholder="Contoh: Fotosintesis, Persamaan Kuadrat, Revolusi Industri..."
                value={topik}
                onChange={(e) => setTopik(e.target.value)}
                className="h-11 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-600"
              />
            </div>
            <div>
              <Label className="text-gray-300 text-sm mb-1.5 block">Mata Pelajaran</Label>
              <Select value={mapel} onValueChange={(v) => v && setMapel(v)}>
                <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Matematika', 'Fisika', 'Kimia', 'Biologi', 'Ekonomi', 'Geografi', 'Sosiologi', 'Sejarah', 'Bahasa Indonesia', 'Bahasa Inggris'].map((subj) => (
                    <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label className="text-gray-300 text-sm mb-1.5 block">Jurusan / Kelas</Label>
              <Select value={jurusan} onValueChange={(v) => v && setJurusan(v)}>
                <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua">Semua</SelectItem>
                  <SelectItem value="IPA">IPA</SelectItem>
                  <SelectItem value="IPS">IPS</SelectItem>
                  <SelectItem value="Bahasa">Bahasa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300 text-sm mb-1.5 block">Jumlah Soal</Label>
              <Select value={jumlahSoal} onValueChange={(v) => v && setJumlahSoal(v)}>
                <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['5', '10', '15', '20'].map((n) => (
                    <SelectItem key={n} value={n}>{n} soal</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300 text-sm mb-1.5 block">Tingkat Kesulitan</Label>
              <Select value={kesulitan} onValueChange={(v) => v && setKesulitan(v)}>
                <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mudah">Mudah</SelectItem>
                  <SelectItem value="sedang">Sedang</SelectItem>
                  <SelectItem value="sulit">Sulit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300 text-sm mb-1.5 block">Jenjang</Label>
              <Select value={jenjang} onValueChange={(v) => v && setJenjang(v)}>
                <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SD">SD</SelectItem>
                  <SelectItem value="SMP">SMP</SelectItem>
                  <SelectItem value="SMA">SMA</SelectItem>
                  <SelectItem value="Universitas">Universitas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <Label className="text-gray-300 text-sm mb-1.5 block">Materi Prasyarat (Lock)</Label>
              <Select value={selectedPrereq} onValueChange={(v) => v && setSelectedPrereq(v)}>
                <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tidak_ada">Tidak Ada</SelectItem>
                  {prereqList.map((prereq) => (
                    <SelectItem key={prereq.id} value={prereq.id}>
                      {prereq.title.replace('Kuis: ', '').substring(0, 20)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={loading || !topik.trim()}
            className="w-full h-11 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-violet-500/25"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sedang membuat soal kuis...
              </span>
            ) : (
              'Generate Kuis'
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {(output || loading) && <OutputViewer content={output} type="quiz" topic={topik} loading={loading} />}
    </div>
  )
}
