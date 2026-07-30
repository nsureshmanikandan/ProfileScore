export interface SectionFeedback {
  section: string
  score: number
  what_working: string[]
  what_not_working: string[]
  how_to_fix: string
  rewritten?: string
}

export interface ProfileAnalysis {
  overall_score: number
  letter_grade: string
  sections: SectionFeedback[]
  rewritten_headline: string
  rewritten_about: string
  rewritten_bullets: string[]
  keyword_match_before?: number
  keyword_match_after?: number
  raw_sections: Record<string, string>
  person_name: string
  person_location: string
  person_linkedin_url: string
}

export type InputMethod = 'upload' | 'text'
