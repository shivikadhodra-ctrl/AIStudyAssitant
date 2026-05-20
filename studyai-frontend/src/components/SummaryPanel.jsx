import { useState } from 'react'
import { Loader2, FileText, Copy, Check } from 'lucide-react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'

export default function SummaryPanel({ workspaceId, initialSummary }) {
  const toast = useToast()
  const [summary, setSummary] = useState(initialSummary || '')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await api.post(`/api/ai/${workspaceId}/summary`)
      setSummary(res.data.data.summary || '')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate summary')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard')
  }

  if (!summary && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 px-6 py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
          <FileText className="w-7 h-7 text-amber-500" />
        </div>
        <div>
          <h3 className="text-base font-medium text-foreground">Document summary</h3>
          <p className="text-sm text-muted-foreground mt-1">Get a concise AI overview of your PDF</p>
        </div>
        <button
          onClick={generate}
          className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors shadow-sm shadow-amber-500/20"
        >
          Generate Summary
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
        <p className="text-sm text-muted-foreground">Summarizing document...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full px-4 py-4 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Summary</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={generate}
            disabled={loading}
            className="text-xs text-indigo-500 hover:text-indigo-400 transition-colors"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* Summary text */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-accent/40 rounded-xl p-4">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{summary}</p>
        </div>
      </div>
    </div>
  )
}