import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts'
import { Trophy, TrendingUp, BookOpen, Loader2 } from 'lucide-react'
import Navbar from '../components/Navbar'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-3xl font-display text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

function ScoreLabel({ score }) {
  const color = score >= 80 ? 'text-emerald-400 bg-emerald-500/10'
    : score >= 50 ? 'text-amber-400 bg-amber-500/10'
    : 'text-red-400 bg-red-500/10'
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {score}%
    </span>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium text-foreground">{payload[0].value}%</p>
    </div>
  )
}

export default function Analytics() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [allQuizzes, setAllQuizzes] = useState([])
  const [docScores, setDocScores] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const docsRes = await api.get('/api/workspaces')
        const docs = docsRes.data.data || []

        const quizList = []
        const docScoreMap = []

        await Promise.allSettled(
          docs
            .filter(doc => doc && doc._id)
            .map(async (doc) => {
              try {
                const r = await api.get(`/api/ai/${doc._id}/data`)
                const quizzes = r.data.data?.quizzes || []
                const attempted = quizzes.filter(q => q.score != null)
                attempted.forEach(q => {
                  quizList.push({
                    name: doc.name,
                    score: q.score,
                    total: q.total,
                    pct: Math.round((q.score / q.total) * 100),
                    attemptedAt: q.attemptedAt,
                  })
                })
                if (attempted.length > 0) {
                  const avg = Math.round(
                    attempted.reduce((s, q) => s + (q.score / q.total) * 100, 0) / attempted.length
                  )
                  docScoreMap.push({
                    name: doc.name.slice(0, 20),
                    avg,
                  })
                }
              } catch {}
            })
        )

        quizList.sort((a, b) => new Date(b.attemptedAt) - new Date(a.attemptedAt))
        setAllQuizzes(quizList)

        docScoreMap.sort((a, b) => b.avg - a.avg)
        setDocScores(docScoreMap)
      } catch {
        toast.error('Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totalAttempts = allQuizzes.length
  const bestScore = allQuizzes.length > 0 ? Math.max(...allQuizzes.map(q => q.pct)) : 0
  const avgScore = allQuizzes.length > 0
    ? Math.round(allQuizzes.reduce((s, q) => s + q.pct, 0) / allQuizzes.length)
    : 0

  const timelineData = [...allQuizzes].reverse().slice(-10).map((q, i) => ({
    name: `#${i + 1}`,
    score: q.pct,
  }))

  const barColor = (val) => val >= 80 ? '#34d399' : val >= 50 ? '#fbbf24' : '#f87171'

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your quiz performance over time</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard icon={BookOpen} label="Quizzes taken"  value={totalAttempts}                        color="bg-indigo-500/10 text-indigo-500" />
          <StatCard icon={Trophy}   label="Best score"     value={bestScore > 0 ? `${bestScore}%` : '—'} color="bg-emerald-500/10 text-emerald-500" />
          <StatCard icon={TrendingUp} label="Average score" value={avgScore > 0 ? `${avgScore}%` : '—'}  color="bg-amber-500/10 text-amber-500" />
        </div>

        {allQuizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-4">
              <BarChart className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No quiz data yet</p>
            <p className="text-xs text-muted-foreground mt-1">Take quizzes on your documents to see analytics here</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="text-sm font-medium text-foreground mb-4">Score over time</h2>
                {timelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={timelineData} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))' }} />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                        {timelineData.map((entry, i) => (
                          <Cell key={i} fill={barColor(entry.score)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground py-8 text-center">No data</p>
                )}
              </div>

              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="text-sm font-medium text-foreground mb-4">Score by workspace</h2>
                {docScores.length > 0 ? (
                  <div className="space-y-3">
                    {docScores.map((d, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-foreground truncate max-w-[180px]">{d.name}</span>
                          <ScoreLabel score={d.avg} />
                        </div>
                        <div className="w-full bg-accent rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${d.avg}%`, backgroundColor: barColor(d.avg) }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-8 text-center">No data</p>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-medium text-foreground">Attempt history</h2>
              </div>
              <div className="divide-y divide-border">
                {allQuizzes.map((q, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-accent/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{q.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {q.score}/{q.total} correct ·{' '}
                        {q.attemptedAt
                          ? new Date(q.attemptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : 'Unknown date'
                        }
                      </p>
                    </div>
                    <ScoreLabel score={q.pct} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}