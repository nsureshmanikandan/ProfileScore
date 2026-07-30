import { useState } from 'react'
import { Copy } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  label: string
  before: string
  after: string
}

export default function BeforeAfterToggle({ label, before, after }: Props) {
  const [view, setView] = useState<'before' | 'after'>('after')

  const copy = () => {
    navigator.clipboard.writeText(view === 'after' ? after : before)
    toast.success('Copied!')
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-200">{label}</h3>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setView('before')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${view === 'before' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Original
            </button>
            <button
              onClick={() => setView('after')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${view === 'after' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Suggested
            </button>
          </div>
          <button onClick={copy} className="text-slate-400 hover:text-white">
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className={`rounded-xl p-4 text-sm leading-relaxed transition-colors ${view === 'after' ? 'bg-blue-950 text-slate-200 border border-blue-800' : 'bg-slate-800 text-slate-400'}`}>
        {view === 'before' ? before : after}
      </div>
    </div>
  )
}
