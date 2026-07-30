import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'

interface Props {
  score: number
  grade: string
}

function getColor(score: number) {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#f59e0b'
  return '#ef4444'
}

export default function GaugeChart({ score, grade }: Props) {
  const color = getColor(score)
  const data = [{ value: score, fill: color }]

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <RadialBarChart
          width={200}
          height={120}
          cx={100}
          cy={110}
          innerRadius={70}
          outerRadius={100}
          startAngle={180}
          endAngle={0}
          data={data}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#1e293b' }} />
        </RadialBarChart>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <span className="text-4xl font-black" style={{ color }}>{score}</span>
          <span className="text-lg font-bold text-slate-400">{grade}</span>
        </div>
      </div>
      <p className="text-sm text-slate-500 mt-1">Overall Score</p>
    </div>
  )
}
