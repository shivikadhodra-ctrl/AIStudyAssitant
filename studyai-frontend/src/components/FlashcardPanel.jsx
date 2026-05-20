import { useState } from 'react'
import { Loader2, ChevronLeft, ChevronRight, Layers, RotateCcw } from 'lucide-react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'

export default function FlashcardPanel({ workspaceId, initialFlashcards }) {
  const toast = useToast()
  const [cards, setCards] = useState(initialFlashcards || [])
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await api.post(`/api/ai/${workspaceId}/flashcards`, { num_cards: 10 })
      const newCards = res.data.data.flashcards || []
      setCards(newCards)
      setCurrent(0)
      setFlipped(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate flashcards')
    } finally {
      setLoading(false)
    }
  }

  const prev = () => {
    setFlipped(false)
    setTimeout(() => setCurrent(c => Math.max(0, c - 1)), 150)
  }

  const next = () => {
    setFlipped(false)
    setTimeout(() => setCurrent(c => Math.min(cards.length - 1, c + 1)), 150)
  }

  const handleFlip = () => setFlipped(f => !f)

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 px-6 py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center">
          <Layers className="w-7 h-7 text-purple-500" />
        </div>
        <div>
          <h3 className="text-base font-medium text-foreground">Flashcard review</h3>
          <p className="text-sm text-muted-foreground mt-1">Generate key term cards from your PDF</p>
        </div>
        {loading ? (
          <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
        ) : (
          <button
            onClick={generate}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors shadow-sm shadow-purple-500/20"
          >
            Generate Flashcards
          </button>
        )}
      </div>
    )
  }

  const card = cards[current]

  return (
    <div className="flex flex-col h-full px-4 py-4 gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {current + 1} / {cards.length} cards
        </span>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Regenerate
        </button>
      </div>

      <div className="flex gap-1 flex-wrap">
        {cards.map((_, i) => (
          <div
            key={i}
            onClick={() => { setFlipped(false); setCurrent(i) }}
            className={`h-1 flex-1 rounded-full cursor-pointer transition-colors ${
              i === current ? 'bg-indigo-500' : i < current ? 'bg-indigo-500/40' : 'bg-accent'
            }`}
            style={{ minWidth: '6px', maxWidth: '24px' }}
          />
        ))}
      </div>

      <div className="flex-1 flip-card-container cursor-pointer" onClick={handleFlip}>
        <div className={`flip-card-inner w-full h-full ${flipped ? 'flipped' : ''}`}>
          <div className="flip-card-front bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 rounded-2xl flex flex-col items-center justify-center p-6 text-center gap-3">
            <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider">Term</span>
            <p className="text-base font-medium text-foreground leading-snug">{card.front}</p>
            <span className="text-xs text-muted-foreground mt-2">Tap to reveal</span>
          </div>

          <div className="flip-card-back bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center justify-center p-6 text-center gap-3">
            <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Definition</span>
            <p className="text-sm text-foreground leading-relaxed">{card.back}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={prev}
          disabled={current === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent/80 text-foreground text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Prev
        </button>
        <button
          onClick={handleFlip}
          className="px-4 py-2 rounded-xl bg-accent hover:bg-accent/80 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {flipped ? 'Show term' : 'Flip'}
        </button>
        <button
          onClick={next}
          disabled={current === cards.length - 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent/80 text-foreground text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}