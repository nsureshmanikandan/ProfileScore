import { useState } from 'react'
import { Copy, RefreshCw, Check, Linkedin } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { rewriteSection } from '../api/client'
import toast from 'react-hot-toast'

interface Props {
  sectionKey: string
  label: string
  icon: string
  initialContent: string
  rawContent: string
  targetRole?: string
  accentColor?: 'blue' | 'emerald' | 'violet' | 'amber'
}

const COLORS = {
  blue:    { badge: 'bg-blue-950 border-blue-800 text-blue-300',    btn: 'bg-blue-600 hover:bg-blue-500', icon: 'text-blue-400' },
  emerald: { badge: 'bg-emerald-950 border-emerald-800 text-emerald-300', btn: 'bg-emerald-600 hover:bg-emerald-500', icon: 'text-emerald-400' },
  violet:  { badge: 'bg-violet-950 border-violet-800 text-violet-300',  btn: 'bg-violet-600 hover:bg-violet-500', icon: 'text-violet-400' },
  amber:   { badge: 'bg-amber-950 border-amber-800 text-amber-300',    btn: 'bg-amber-600 hover:bg-amber-500', icon: 'text-amber-400' },
}

function renderContent(content: string, sectionKey: string) {
  if (sectionKey === 'experience') {
    const bullets = content.split('\n').filter(l => l.trim())
    return (
      <ul className="space-y-3">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-slate-200 leading-relaxed">
            <span className="text-blue-400 mt-1 shrink-0 font-bold">•</span>
            <span>{b.replace(/^[•\-*]\s*/, '')}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (sectionKey === 'skills') {
    const sections: { heading: string; items: string }[] = []
    const lines = content.split('\n')
    let current: { heading: string; items: string } | null = null
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      if (trimmed.endsWith(':') || (trimmed.toUpperCase() === trimmed && trimmed.length > 3)) {
        if (current) sections.push(current)
        current = { heading: trimmed.replace(/:$/, ''), items: '' }
      } else if (current) {
        current.items += (current.items ? ' ' : '') + trimmed
      } else {
        sections.push({ heading: '', items: trimmed })
      }
    }
    if (current) sections.push(current)

    return (
      <div className="space-y-4">
        {sections.map((s, i) => (
          <div key={i}>
            {s.heading && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{s.heading}</p>}
            <div className="flex flex-wrap gap-2">
              {s.items.split(',').map(skill => skill.trim()).filter(Boolean).map((skill, j) => (
                <span key={j} className="bg-slate-800 border border-slate-700 text-slate-200 text-xs px-3 py-1 rounded-full font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (sectionKey === 'headline') {
    const options = content.split('\n').filter(l => l.trim())
    return (
      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-start gap-3 bg-slate-800 rounded-xl p-3">
            <span className="text-violet-400 font-bold text-sm shrink-0 mt-0.5">{i + 1}.</span>
            <span className="text-sm text-slate-200 leading-relaxed">{opt.replace(/^\d+\.\s*/, '')}</span>
          </div>
        ))}
      </div>
    )
  }

  return <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{content}</p>
}

function toPlainText(content: string, sectionKey: string): string {
  if (sectionKey === 'experience') {
    return content.split('\n').filter(l => l.trim())
      .map(b => '• ' + b.replace(/^[•\-*]\s*/, '')).join('\n')
  }
  if (sectionKey === 'skills') {
    return content
  }
  return content
}

// localStorage key scoped to sectionKey + first 40 chars of raw content
// so a new PDF analysis invalidates the cache automatically
function storageKey(sectionKey: string, rawContent: string) {
  return `ps_suggestion_${sectionKey}_${rawContent.slice(0, 40).replace(/\s+/g, '_')}`
}

export default function SuggestionBlock({
  sectionKey, label, icon, initialContent, rawContent, targetRole,
  accentColor = 'blue',
}: Props) {
  const [content, setContent] = useState<string>(() => {
    try {
      return localStorage.getItem(storageKey(sectionKey, rawContent)) || initialContent
    } catch {
      return initialContent
    }
  })
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const colors = COLORS[accentColor]

  const persist = (text: string) => {
    try { localStorage.setItem(storageKey(sectionKey, rawContent), text) } catch { /* ignore */ }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(toPlainText(content, sectionKey))
    setCopied(true)
    toast.success('Copied — ready to paste into LinkedIn!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerate = async () => {
    setLoading(true)
    try {
      const fresh = await rewriteSection(sectionKey, rawContent, targetRole)
      setContent(fresh)
      persist(fresh)
      toast.success('New suggestion generated!')
    } catch {
      toast.error('Regeneration failed — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div>
            <h3 className="font-bold text-slate-100 text-base">{label}</h3>
            <div className="flex items-center gap-1 mt-0.5">
              <Linkedin className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-slate-500">Ready to paste into LinkedIn</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRegenerate}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Generating...' : 'Regenerate'}
          </button>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 text-xs font-semibold text-white rounded-lg px-3 py-1.5 transition-all ${colors.btn}`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={content.slice(0, 40)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`rounded-xl p-5 border ${colors.badge} min-h-[80px]`}
        >
          {loading ? (
            <div className="flex items-center gap-3 text-slate-400 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating fresh suggestion with AI...
            </div>
          ) : (
            renderContent(content, sectionKey)
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
