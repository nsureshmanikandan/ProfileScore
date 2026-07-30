import axios from 'axios'
import { ProfileAnalysis } from '../types/profile'

const api = axios.create({ baseURL: '/api' })

export async function analyzeFromPDF(
  file: File,
  targetRole?: string,
  targetJd?: string
): Promise<ProfileAnalysis> {
  const form = new FormData()
  form.append('file', file)
  if (targetRole) form.append('target_role', targetRole)
  if (targetJd) form.append('target_jd', targetJd)
  const { data } = await api.post<ProfileAnalysis>('/analyze/upload', form)
  return data
}

export async function analyzeFromText(
  text: string,
  targetRole?: string,
  targetJd?: string
): Promise<ProfileAnalysis> {
  const form = new FormData()
  form.append('text', text)
  if (targetRole) form.append('target_role', targetRole)
  if (targetJd) form.append('target_jd', targetJd)
  const { data } = await api.post<ProfileAnalysis>('/analyze/text', form)
  return data
}

export async function rewriteSection(
  section: string,
  content: string,
  targetRole?: string
): Promise<string> {
  const form = new FormData()
  form.append('section', section)
  form.append('content', content)
  if (targetRole) form.append('target_role', targetRole)
  const { data } = await api.post<{ section: string; rewritten: string }>('/analyze/rewrite-section', form)
  return data.rewritten
}

export async function generateResume(
  analysis: ProfileAnalysis,
  targetRole?: string,
  format: 'docx' | 'txt' = 'docx'
): Promise<Blob> {
  const { data } = await api.post(
    '/resume/generate',
    { analysis, target_role: targetRole, format },
    { responseType: 'blob' }
  )
  return data
}
