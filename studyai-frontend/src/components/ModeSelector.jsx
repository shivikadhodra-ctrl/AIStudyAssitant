const MODES = [
  {
    id: 'normal',
    label: 'Normal',
    emoji: '💬',
    description: 'Balanced responses',
  },
  {
    id: 'beginner',
    label: 'Beginner',
    emoji: '🌱',
    description: 'Simple language, real-life examples',
  },
  {
    id: 'exam',
    label: 'Exam',
    emoji: '📋',
    description: 'Structured, bullet points',
  },
  {
    id: 'quick',
    label: 'Quick',
    emoji: '⚡',
    description: '3-5 lines only',
  },
  {
    id: 'deep',
    label: 'Deep',
    emoji: '🔬',
    description: 'In-depth with examples',
  },
]

export default function ModeSelector({ selected, onChange, disabled }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {MODES.map(mode => (
        <button
          key={mode.id}
          onClick={() => onChange(mode.id)}
          disabled={disabled}
          title={mode.description}
          className={`
            flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150
            disabled:opacity-50 disabled:cursor-not-allowed
            ${selected === mode.id
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
              : 'bg-accent text-muted-foreground hover:text-foreground hover:bg-accent/80'
            }
          `}
        >
          <span>{mode.emoji}</span>
          <span>{mode.label}</span>
        </button>
      ))}
    </div>
  )
}