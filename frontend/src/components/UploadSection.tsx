import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { analyzeFromPDF, analyzeFromText } from '../api/client'
import { ProfileAnalysis, InputMethod } from '../types/profile'
import toast from 'react-hot-toast'

interface Props {
  onResult: (analysis: ProfileAnalysis, targetRole?: string) => void
}

export default function UploadSection({ onResult }: Props) {
  const [method, setMethod] = useState<InputMethod>('upload')
  const [text, setText] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [targetJd, setTargetJd] = useState('')
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  })

  const handleSubmit = async () => {
    setLoading(true)
    try {
      let analysis: ProfileAnalysis
      if (method === 'upload') {
        if (!file) { toast.error('Please select a PDF file'); setLoading(false); return }
        analysis = await analyzeFromPDF(file, targetRole || undefined, targetJd || undefined)
      } else {
        if (!text.trim()) { toast.error('Please paste your profile text'); setLoading(false); return }
        analysis = await analyzeFromText(text, targetRole || undefined, targetJd || undefined)
      }
      onResult(analysis, targetRole || undefined)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(message || 'Analysis failed -- please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div className="card max-w-5xl mx-auto" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">

        {/* Left: input area */}
        <div className="flex flex-col gap-4">
          <div className="flex bg-slate-800 rounded-xl p-1">
            {(['upload', 'text'] as InputMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${method === m ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {m === 'upload' ? 'Upload PDF' : 'Paste Text'}
              </button>
            ))}
          </div>

          {method === 'upload' ? (
            <div
              {...getRootProps()}
              className={`flex-1 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-950' : file ? 'border-emerald-600 bg-emerald-950' : 'border-slate-700 hover:border-blue-600'}`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="text-emerald-400 w-10 h-10" />
                  <p className="text-emerald-400 font-semibold">{file.name}</p>
                  <p className="text-slate-500 text-sm">{(file.size / 1024).toFixed(1)} KB — click to replace</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="text-slate-500 w-10 h-10" />
                  <p className="text-slate-300 font-medium">Drop your LinkedIn PDF here</p>
                  <p className="text-slate-500 text-sm">or click to browse — export from LinkedIn › Save to PDF</p>
                </div>
              )}
            </div>
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your LinkedIn profile here — headline, About, Experience, Skills sections..."
              className="flex-1 min-h-[180px] bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-600 resize-none"
            />
          )}
        </div>

        {/* Right: options + CTA */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">Target Role</label>
            <input
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Product Manager"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex-1 flex flex-col">
            <label className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">Job Description</label>
            <textarea
              value={targetJd}
              onChange={(e) => setTargetJd(e.target.value)}
              placeholder="Paste JD for keyword match analysis..."
              className="flex-1 min-h-[100px] bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-600 resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-auto"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze Profile'
            )}
          </button>
        </div>

      </div>
    </motion.div>
  )
}
