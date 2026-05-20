import { useState } from 'react'
import { Loader2, CheckCircle2, XCircle, Trophy, RotateCcw, ChevronRight } from 'lucide-react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'

function ScoreBar({ score, total }) {
  const pct = Math.round((score / total) * 100)
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="w-full bg-accent rounded-full h-2 overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function QuizPanel({ workspaceId }) {
  const toast = useToast()
  const [state, setState] = useState('idle') // idle | loading | active | done
  const [questions, setQuestions] = useState([])
  const [quizIndex, setQuizIndex] = useState(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [selected, setSelected] = useState(null) // selected option index
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [numQuestions, setNumQuestions] = useState(5)
  const [scoreSaved, setScoreSaved] = useState(false)

  const generateQuiz = async () => {
    setState('loading')
    setScore(0)
    setCurrentQ(0)
    setSelected(null)
    setAnswered(false)
    setScoreSaved(false)

    try {
      const res = await api.post(`/api/ai/${workspaceId}/quiz`, { num_questions: numQuestions })
      const { questions: qs, quizIndex: qi } = res.data.data
      setQuestions(qs)
      setQuizIndex(qi)
      setState('active')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate quiz')
      setState('idle')
    }
  }

  const handleSelect = (optionIndex) => {
    if (answered) return
    setSelected(optionIndex)
    setAnswered(true)
    if (optionIndex === questions[currentQ].answer) {
      setScore(s => s + 1)
    }
  }

  const nextQuestion = async () => {
    if (currentQ + 1 >= questions.length) {
      // Quiz done — save score
      const finalScore = score + (selected === questions[currentQ].answer ? 0 : 0) // score already updated
      setState('done')
      if (!scoreSaved && quizIndex != null) {
        try {
          await api.post(`/api/ai/${workspaceId}/quiz/${quizIndex}/score`, {
            score,
            total: questions.length,
          })
          setScoreSaved(true)
        } catch {}
      }
    } else {
      setCurrentQ(c => c + 1)
      setSelected(null)
      setAnswered(false)
    }
  }

  const optionLabels = ['A', 'B', 'C', 'D']

  // Idle state
  if (state === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 px-6 py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
          <Trophy className="w-7 h-7 text-indigo-500" />
        </div>
        <div>
          <h3 className="text-base font-medium text-foreground">Test your knowledge</h3>
          <p className="text-sm text-muted-foreground mt-1">AI-generated MCQs from your PDF</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Questions:</label>
          {[5, 10, 15].map(n => (
            <button
              key={n}
              onClick={() => setNumQuestions(n)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                numQuestions === n
                  ? 'bg-indigo-600 text-white'
                  : 'bg-accent text-muted-foreground hover:text-foreground'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={generateQuiz}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors shadow-sm shadow-indigo-500/20"
        >
          Generate Quiz
        </button>
      </div>
    )
  }

  // Loading
  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-sm text-muted-foreground">Generating {numQuestions} questions...</p>
      </div>
    )
  }

  // Done
  if (state === 'done') {
    const pct = Math.round((score / questions.length) * 100)
    const grade = pct >= 80 ? { label: 'Excellent!', color: 'text-emerald-400' }
      : pct >= 50 ? { label: 'Good effort!', color: 'text-amber-400' }
      : { label: 'Keep studying!', color: 'text-red-400' }

    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-3xl">
          {pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '📚'}
        </div>
        <div>
          <p className={`text-lg font-display font-bold ${grade.color}`}>{grade.label}</p>
          <p className="text-3xl font-display text-foreground mt-1">
            {score} / {questions.length}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{pct}% correct</p>
        </div>
        <div className="w-48">
          <ScoreBar score={score} total={questions.length} />
        </div>
        <button
          onClick={generateQuiz}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-accent hover:bg-accent/80 text-foreground text-sm font-medium transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Retake Quiz
        </button>
      </div>
    )
  }

  // Active
  const q = questions[currentQ]
  if (!q) return null

  return (
    <div className="flex flex-col h-full px-4 py-4 gap-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Question {currentQ + 1} of {questions.length}</span>
        <span className="font-medium text-foreground">Score: {score}</span>
      </div>
      <div className="w-full bg-accent rounded-full h-1 overflow-hidden">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="bg-accent/50 rounded-xl p-4">
        <p className="text-sm font-medium text-foreground leading-snug">{q.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-2 flex-1">
    {(Array.isArray(q.options) ? q.options : []).map((opt, i) => {
          const isCorrect = i === q.answer
          const isSelected = i === selected

          let style = 'bg-accent text-foreground hover:bg-accent/80 border border-transparent'
          if (answered) {
            if (isCorrect) style = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            else if (isSelected && !isCorrect) style = 'bg-red-500/15 text-red-400 border border-red-500/30'
            else style = 'bg-accent/40 text-muted-foreground border border-transparent'
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={answered}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all duration-150 ${style} disabled:cursor-default`}
            >
              <span className="w-6 h-6 rounded-full bg-background/60 flex items-center justify-center text-xs font-medium shrink-0">
                {optionLabels[i]}
              </span>
              <span className="flex-1">{opt}</span>
              {answered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {answered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
            </button>
          )
        })}
      </div>

      {/* Next button */}
      {answered && (
        <button
          onClick={nextQuestion}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors animate-fade-in"
        >
          {currentQ + 1 >= questions.length ? 'See Results' : 'Next'}
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}