import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, Loader2, FileText, Sparkles, Linkedin } from 'lucide-react'
import { ProfileAnalysis } from '../types/profile'
import ScoreDashboard from '../components/ScoreDashboard'
import SectionCard from '../components/SectionCard'
import SuggestionBlock from '../components/SuggestionBlock'
import { generateResume } from '../api/client'
import toast from 'react-hot-toast'

export default function Results() {
  const navigate = useNavigate()
  const { state } = useLocation() as { state: { analysis: ProfileAnalysis; targetRole?: string } | null }
  const [downloading, setDownloading] = useState(false)

  if (!state?.analysis) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400">No analysis found. Please upload a profile first.</p>
        <button onClick={() => navigate('/')} className="btn-primary">Go Back</button>
      </div>
    )
  }

  const { analysis, targetRole } = state
  const raw = analysis.raw_sections || {}

  const handleDownload = async (format: 'docx' | 'txt') => {
    setDownloading(true)
    try {
      const blob = await generateResume(analysis, targetRole, format)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ProfileScore_Resume.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Resume downloaded as .${format}`)
    } catch {
      toast.error('Resume generation failed — please try again')
    } finally {
      setDownloading(false)
    }
  }

  // Build suggestion blocks from analysis
  const linkedinBlocks = [
    analysis.rewritten_headline && {
      key: 'headline', label: 'Headline', icon: '✍️',
      content: analysis.rewritten_headline,
      raw: raw['headline'] || analysis.rewritten_headline,
      color: 'violet' as const,
    },
    analysis.rewritten_about && {
      key: 'about', label: 'About / Summary', icon: '📝',
      content: analysis.rewritten_about,
      raw: raw['about'] || analysis.rewritten_about,
      color: 'blue' as const,
    },
    analysis.rewritten_bullets.length > 0 && {
      key: 'experience', label: 'Experience Bullets', icon: '💼',
      content: analysis.rewritten_bullets.map(b => '• ' + b).join('\n'),
      raw: raw['experience'] || analysis.rewritten_bullets.join('\n'),
      color: 'blue' as const,
    },
    raw['skills'] && {
      key: 'skills', label: 'Skills', icon: '🎯',
      content: analysis.sections.find(s => s.section.toLowerCase() === 'skills')?.rewritten || raw['skills'],
      raw: raw['skills'],
      color: 'emerald' as const,
    },
    raw['certifications'] && {
      key: 'certifications', label: 'Certifications', icon: '🏆',
      content: analysis.sections.find(s => s.section.toLowerCase() === 'certifications')?.rewritten || raw['certifications'],
      raw: raw['certifications'],
      color: 'amber' as const,
    },
    raw['education'] && {
      key: 'education', label: 'Education', icon: '🎓',
      content: analysis.sections.find(s => s.section.toLowerCase() === 'education')?.rewritten || raw['education'],
      raw: raw['education'],
      color: 'violet' as const,
    },
  ].filter(Boolean) as { key: string; label: string; icon: string; content: string; raw: string; color: 'blue' | 'emerald' | 'violet' | 'amber' }[]

  return (
    <div className="min-h-screen pb-20">
      {/* Sticky header */}
      <div className="bg-slate-950 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Analyze Another Profile
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-white text-sm">ProfileScore</span>
          </div>
          <button
            onClick={() => handleDownload('docx')}
            disabled={downloading}
            className="btn-primary flex items-center gap-2 text-sm py-2"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download ATS Resume
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-8 space-y-12">

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-black text-white mb-1">Your Profile Analysis</h1>
          {targetRole && (
            <p className="text-slate-400 text-sm">
              Analyzed against: <span className="text-blue-400 font-semibold">{targetRole}</span>
            </p>
          )}
        </motion.div>

        {/* Score Dashboard */}
        <ScoreDashboard analysis={analysis} />

        {/* Section Breakdown */}
        <section>
          <h2 className="text-xl font-bold text-slate-200 mb-4">Section Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.sections.map((section, i) => (
              <motion.div
                key={section.section}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <SectionCard feedback={section} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* LinkedIn Ready Suggestions */}
        {linkedinBlocks.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2">
                <Linkedin className="w-5 h-5 text-blue-500" />
                <h2 className="text-xl font-bold text-slate-200">LinkedIn Ready Suggestions</h2>
              </div>
              <span className="bg-blue-950 border border-blue-800 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full">
                Click Copy → Paste directly into LinkedIn
              </span>
            </div>
            <p className="text-slate-500 text-sm mb-6 -mt-3">
              Each block below is formatted for direct paste into your LinkedIn profile. Hit <strong className="text-slate-400">Regenerate</strong> for a fresh AI variation.
            </p>

            <div className="space-y-5">
              {linkedinBlocks.map((block, i) => (
                <motion.div
                  key={block.key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <SuggestionBlock
                    sectionKey={block.key}
                    label={block.label}
                    icon={block.icon}
                    initialContent={block.content}
                    rawContent={block.raw}
                    targetRole={targetRole}
                    accentColor={block.color}
                  />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ATS Resume CTA */}
        <motion.div
          className="card bg-gradient-to-r from-blue-950 to-slate-900 border-blue-800 text-center py-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-xl font-black text-white mb-2">Ready to Apply?</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-lg mx-auto">
            Download a complete ATS-optimized resume built from your improved profile content.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => handleDownload('docx')}
              disabled={downloading}
              className="btn-primary flex items-center gap-2"
            >
              {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              Download .docx Resume
            </button>
            <button
              onClick={() => handleDownload('txt')}
              disabled={downloading}
              className="btn-secondary flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Plain Text (.txt)
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
