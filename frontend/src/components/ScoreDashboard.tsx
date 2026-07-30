import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ProfileAnalysis } from '../types/profile'
import GaugeChart from './GaugeChart'
import { motion } from 'framer-motion'

interface Props {
  analysis: ProfileAnalysis
}

function barColor(score: number) {
  if (score >= 80) return '#10b981'
  if (score >= 55) return '#f59e0b'
  return '#ef4444'
}

export default function ScoreDashboard({ analysis }: Props) {
  const chartData = analysis.sections.map((s) => ({
    name: s.section.charAt(0).toUpperCase() + s.section.slice(1),
    score: s.score,
  }))

  return (
    <motion.div
      className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="card flex flex-col items-center justify-center lg:col-span-1">
        <GaugeChart score={analysis.overall_score} grade={analysis.letter_grade} />
        {analysis.keyword_match_before !== null && analysis.keyword_match_before !== undefined && (
          <div className="mt-4 grid grid-cols-2 gap-3 w-full">
            <div className="bg-slate-800 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">Keyword Match (Before)</p>
              <p className="text-xl font-bold text-amber-400">{analysis.keyword_match_before}%</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">Keyword Match (After)</p>
              <p className="text-xl font-bold text-emerald-400">{analysis.keyword_match_after}%</p>
            </div>
          </div>
        )}
      </div>

      <div className="card lg:col-span-2">
        <h3 className="font-semibold text-slate-300 mb-4">Section Scores</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Bar dataKey="score" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={barColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
