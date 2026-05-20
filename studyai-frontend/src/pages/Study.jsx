import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  MessageSquare, HelpCircle, Layers, FileText, Loader2, AlertCircle
} from 'lucide-react'
import Navbar         from '../components/Navbar'
import ChatWindow     from '../components/ChatWindow'
import QuizPanel      from '../components/QuizPanel'
import FlashcardPanel from '../components/FlashcardPanel'
import SummaryPanel   from '../components/SummaryPanel'
import api            from '../api/axios'
import { useToast }   from '../context/ToastContext'

pdfjs.GlobalWorkerOptions.workerSrc =
  `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const TABS = [
  { id: 'chat',       label: 'Chat',    icon: MessageSquare },
  { id: 'quiz',       label: 'Quiz',    icon: HelpCircle    },
  { id: 'flashcards', label: 'Cards',   icon: Layers        },
  { id: 'summary',    label: 'Summary', icon: FileText      },
]

export default function Study() {
  const { workspaceId } = useParams()
  const toast           = useToast()

  const [workspace,  setWorkspace]  = useState(null)
  const [wsData,     setWsData]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [activeTab,  setActiveTab]  = useState('chat')

  const [activeFileIndex, setActiveFileIndex] = useState(0)

  const [numPages, setNumPages] = useState(null)
  const [pageNum,  setPageNum]  = useState(1)
  const [scale,    setScale]    = useState(1.0)

  useEffect(() => {
    if (!workspaceId) return

    const load = async () => {
      try {
        const [wsRes, dataRes] = await Promise.all([
          api.get('/api/workspaces').then(r =>
            (r.data.data || []).find(w => w._id === workspaceId)
          ),
          api.get(`/api/ai/${workspaceId}/data`),
        ])
        setWorkspace(wsRes)
        setWsData(dataRes.data.data)
      } catch {
        toast.error('Failed to load workspace')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [workspaceId])

  const switchFile = (index) => {
    setActiveFileIndex(index)
    setPageNum(1)
    setNumPages(null)
  }

  const activeFile = workspace?.files?.[activeFileIndex]

  const pdfUrl = useMemo(() => (
    activeFile
      ? `http://localhost:5000/api/workspaces/${workspaceId}/files/${activeFile._id}`
      : null
  ), [activeFile, workspaceId])

  const pdfFile = useMemo(() => (
    pdfUrl ? {
      url:         pdfUrl,
      httpHeaders: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    } : null
  ), [pdfUrl])

  const prevPage = () => setPageNum(p => Math.max(1, p - 1))
  const nextPage = () => setPageNum(p => Math.min(numPages || p, p + 1))
  const zoomIn   = () => setScale(s => Math.min(2, +(s + 0.2).toFixed(1)))
  const zoomOut  = () => setScale(s => Math.max(0.5, +(s - 0.2).toFixed(1)))

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar backTo="/dashboard" backLabel="Dashboard" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      </div>
    )
  }

  const isMultiFile = (workspace?.files?.length || 0) > 1

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar backTo="/dashboard" backLabel="Dashboard" />

      {workspace && (
        <div className="border-b border-border px-4 py-2 flex items-center gap-2">
          {isMultiFile
            ? <Layers className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            : <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          }
          <span className="text-sm text-foreground truncate max-w-md">{workspace.name}</span>
          {isMultiFile && (
            <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full ml-1">
              {workspace.files.length} PDFs · shared session
            </span>
          )}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 112px)' }}>

        {/* ── Left: PDF Viewer ─────────────────────────────────────────── */}
        <div className="w-1/2 flex flex-col border-r border-border bg-accent/20 overflow-hidden">

          {isMultiFile && (
            <div className="flex gap-0.5 px-2 pt-2 overflow-x-auto border-b border-border bg-background/60">
              {workspace.files.map((file, i) => (
                <button
                  key={file._id || i}
                  onClick={() => switchFile(i)}
                  title={file.fileName}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs whitespace-nowrap transition-colors shrink-0
                    ${activeFileIndex === i
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  <FileText className="w-3 h-3" />
                  {file.fileName.replace(/\.pdf$/i, '').slice(0, 20)}
                  {activeFileIndex === i && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background/70 gap-2">
            <div className="flex items-center gap-1">
              <button onClick={prevPage} disabled={pageNum <= 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground font-mono px-2">
                {pageNum} / {numPages || '—'}
              </span>
              <button onClick={nextPage} disabled={!numPages || pageNum >= numPages}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={zoomOut}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground font-mono w-10 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button onClick={zoomIn}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto flex flex-col items-center py-4">
            {pdfFile ? (
              <Document
                key={pdfUrl}
                file={pdfFile}
                onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPageNum(1) }}
                onLoadError={() => toast.error('Failed to load PDF')}
                loading={
                  <div className="flex flex-col items-center gap-2 py-12">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    <p className="text-xs text-muted-foreground">Loading PDF...</p>
                  </div>
                }
                error={
                  <div className="flex flex-col items-center gap-2 py-12">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                    <p className="text-xs text-muted-foreground">Failed to load PDF</p>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNum}
                  scale={scale}
                  renderTextLayer
                  renderAnnotationLayer
                  className="shadow-xl rounded-sm overflow-hidden"
                />
              </Document>
            ) : (
              <div className="flex flex-col items-center gap-2 py-12">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Tabs ──────────────────────────────────────────────── */}
        <div className="w-1/2 flex flex-col overflow-hidden bg-background">
          <div className="flex border-b border-border px-4 pt-2 gap-0.5 bg-background/80">
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors
                    ${activeTab === tab.id
                      ? 'text-indigo-500 bg-accent/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' && (
              <ChatWindow
                workspaceId={workspaceId}
                initialHistory={wsData?.chatHistory || []}
              />
            )}
            {activeTab === 'quiz' && (
              <QuizPanel workspaceId={workspaceId} />
            )}
            {activeTab === 'flashcards' && (
              <FlashcardPanel
                workspaceId={workspaceId}
                initialFlashcards={wsData?.flashcards || []}
              />
            )}
            {activeTab === 'summary' && (
              <SummaryPanel
                workspaceId={workspaceId}
                initialSummary={wsData?.summary || ''}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}