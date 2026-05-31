'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OutputViewer } from './OutputViewer'
import { createClient } from '@/lib/supabase/client'

export function SummaryForm() {
  const [topik, setTopik] = useState('')
  const [audience, setAudience] = useState('siswa SMA')
  const [jurusan, setJurusan] = useState('IPA')
  const [mapel, setMapel] = useState('Biologi')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Prerequisites state
  const [prereqList, setPrereqList] = useState<any[]>([])
  const [selectedPrereq, setSelectedPrereq] = useState<string>('tidak_ada')

  // Classroom selection state
  const [classesList, setClassesList] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('tidak_ada')

  // Fetch previous documents and teacher classes
  useEffect(() => {
    fetch('/api/documents')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPrereqList(data.filter(d => d.type === 'quiz'))
        }
      })
      .catch(err => console.error(err))

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('classes')
          .select('*')
          .eq('teacher_id', user.id)
          .then(({ data: cls }) => {
            if (cls) setClassesList(cls)
          })
      }
    })
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
          type: 'summary',
          topic: topik,
          options: { 
            audience,
            class_group: jurusan,
            subject: mapel,
            level: audience.replace('siswa ', '').toUpperCase()
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

      await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'summary',
          title: `Ringkasan: ${topik} (${mapel} - ${jurusan})`,
          topic: topik,
          content: result,
          class_group: jurusan,
          subject: mapel,
          prerequisite_id: selectedPrereq === 'tidak_ada' ? null : selectedPrereq,
          class_id: selectedClass === 'tidak_ada' ? null : selectedClass,
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
                placeholder="Contoh: Teori Evolusi, Perang Dunia II, Struktur Atom..."
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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
              <Label className="text-gray-300 text-sm mb-1.5 block">Target Pembaca / Jenjang</Label>
              <Select value={audience} onValueChange={(v) => v && setAudience(v)}>
                <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="siswa SD">Siswa SD</SelectItem>
                  <SelectItem value="siswa SMP">Siswa SMP</SelectItem>
                  <SelectItem value="siswa SMA">Siswa SMA</SelectItem>
                  <SelectItem value="mahasiswa">Mahasiswa</SelectItem>
                  <SelectItem value="umum">Umum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
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
            <div>
              <Label className="text-gray-300 text-sm mb-1.5 block">Hubungkan ke Kelas</Label>
              <Select value={selectedClass} onValueChange={(v) => v && setSelectedClass(v)}>
                <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tidak_ada">Tidak Ada</SelectItem>
                  {classesList.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={loading || !topik.trim()}
            className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium shadow-lg shadow-emerald-500/25"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sedang menyusun Ringkasan Lengkap...
              </span>
            ) : (
              'Generate Ringkasan'
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {(output || loading) && <OutputViewer content={output} type="summary" topic={topik} loading={loading} />}
    </div>
  )
}
