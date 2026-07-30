import { useNavigate } from 'react-router-dom'
import { ProfileAnalysis } from '../types/profile'
import UploadSection from '../components/UploadSection'
import { Sparkles, TrendingUp, FileCheck, Target } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Home() {
  const navigate = useNavigate()

  const handleResult = (analysis: ProfileAnalysis, targetRole?: string) => {
    navigate('/results', { state: { analysis, targetRole } })
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 pt-6 pb-4">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500 to-transparent" />
        <div className="relative max-w-5xl mx-auto px-6">
          <motion.div
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Left: text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-950 border border-blue-800 rounded-full px-3 py-1 text-xs text-blue-300 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                AI-Powered LinkedIn Profile Analysis
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">
                Score Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">LinkedIn</span>
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">
                Actionable score, gap analysis, and AI-rewritten sections in seconds.
              </p>
            </div>

            {/* Right: feature pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: TrendingUp, label: 'Section Scoring' },
                { icon: FileCheck, label: 'Gap Analysis' },
                { icon: Target, label: 'Keyword Match' },
                { icon: Sparkles, label: 'ATS Resume' },
              ].map(({ icon: Icon, label }, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-full px-3 py-1.5 text-xs text-slate-400"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Icon className="w-3.5 h-3.5 text-blue-400" />
                  {label}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Upload section — flush below hero */}
      <div className="max-w-5xl mx-auto px-6 py-5">
        <UploadSection onResult={handleResult} />
      </div>

      {/* Footer note */}
      <p className="text-center text-slate-600 text-xs pb-6">
        No LinkedIn login required · No data stored · Powered by Claude AI
      </p>
    </div>
  )
}
