import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'EduScript AI — Platform AI untuk Materi Ajar',
  description: 'Buat soal kuis, rencana pembelajaran, dan ringkasan materi secara instan dengan AI. Platform SaaS untuk guru, dosen, dan tutor.',
  keywords: ['AI', 'pendidikan', 'kuis', 'rencana pembelajaran', 'materi ajar', 'guru', 'dosen'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
