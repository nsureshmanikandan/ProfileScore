import { useState } from 'react'
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Lightbulb, Copy } from 'lucide-react'
import { SectionFeedback } from '../types/profile'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

interface Props {
  feedback: SectionFeedback
}

function scoreClass(score: number) {
  if (score >= 80) return 'score-green border'
  if (score >= 55) return 'score-amber border'
  return 'score-red border'
}

function scoreLabel(score: number) {
  if (score >= 80) return 'Strong'
  if (score >= 55) return 'Needs Work'
  return 'Weak'
}

export default function SectionCard({ feedback }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showRewrite, setShowRewrite] = useState(false)

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  return (
    <motion.div
      className="card-hover cursor-pointer"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${scoreClass(feedback.score)}`}>
            {feedback.score} -- {scoreLabel(feedback.score)}
          </span>
          <h3 className="font-semibold text-slate-200 capitalize">{feedback.section}</h3>
        </div>
        {expanded ? <ChevronUp className="text-slate-400 w-5 h-5" /> : <ChevronDown className="text-slate-400 w-5 h-5" />}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-5 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="text-emerald-400 w-4 h-4 shrink-0" />
                  <span className="text-emerald-400 font-semibold text-sm">What's Working</span>
                </div>
                <ul className="space-y-1 pl-6">
                  {feedback.what_working.map((item, i) => (
                    <li key={i} className="text-sm text-slate-300 before:content-['*'] before:text-emerald-400 before:mr-2">{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="text-amber-400 w-4 h-4 shrink-0" />
                  <span className="text-amber-400 font-semibold text-sm">What's Not Working</span>
                </div>
                <ul className="space-y-1 pl-6">
                  {feedback.what_not_working.map((item, i) => (
                    <li key={i} className="text-sm text-slate-300 before:content-['*'] before:text-amber-400 before:mr-2">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-blue-950 border border-blue-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="text-blue-400 w-4 h-4" />
                  <span className="text-blue-400 font-semibold text-sm">How to Fix It</span>
                </div>
                <p className="text-sm text-slate-300">{feedback.how_to_fix}</p>
              </div>

              {feedback.rewritten && (
                <div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowRewrite(!showRewrite) }}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                  >
                    {showRewrite ? 'Hide' : 'Show'} Suggested Rewrite
                  </button>
                  <AnimatePresence>
                    {showRewrite && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 bg-slate-800 rounded-xl p-4 relative"
                      >
                        <p className="text-sm text-slate-200 pr-8">{feedback.rewritten}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); copy(feedback.rewritten!) }}
                          className="absolute top-3 right-3 text-slate-400 hover:text-white"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
