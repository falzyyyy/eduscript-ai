// ============================================================
// EduScript AI — Global Type Definitions
// ============================================================

export type UserRole = 'admin' | 'guru' | 'siswa'
export type DocumentType = 'quiz' | 'lesson_plan' | 'summary'

// ---------- Database Models ----------

export interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  quota_limit: number
  quota_used: number
  created_at: string
}

export interface Document {
  id: string
  user_id: string
  type: DocumentType
  title: string
  topic: string
  content: string
  metadata: Record<string, unknown>
  class_group?: string
  subject?: string
  prerequisite_id?: string
  created_at: string
}

// ---------- AI Generation ----------

export interface GenerateRequest {
  type: DocumentType
  topic: string
  options: Record<string, string>
}

export interface QuizQuestion {
  question: string
  options: string[]
  answer: string
  explanation: string
}

export interface QuizOutput {
  title: string
  questions: QuizQuestion[]
}

export interface LessonPlanActivity {
  phase: string
  duration: string
  description: string
}

export interface LessonPlanOutput {
  title: string
  duration: string
  objectives: string[]
  materials: string[]
  activities: LessonPlanActivity[]
  assessment: string
}

export interface SummaryOutput {
  title: string
  overview: string
  key_points: string[]
  details: string
  conclusion: string
}

// ---------- API Responses ----------

export interface ApiError {
  error: string
  status: number
}

// ---------- Component Props ----------

export interface OutputViewerProps {
  content: string
  type: DocumentType
  topic: string
  loading?: boolean
}
