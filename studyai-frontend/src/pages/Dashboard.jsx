import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, MessageSquare, BarChart2, Loader2, CloudUpload, X, Layers } from 'lucide-react'
import Navbar from '../components/Navbar'
import WorkspaceCard from '../components/WorkspaceCard'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import api from '../api/axios'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-3xl font-display text-foreground">{value}</p>
    </div>
  )
}

export default function Dashboard() {
  const { user }  = useAuth()
  const toast     = useToast()
  const [workspaces,   setWorkspaces]   = useState([])
  const [wsData,       setWsData]       = useState({})
  const [loading,      setLoading]      = useState(true)
  const [uploading,    setUploading]    = useState(false)
  const [stagedFiles,  setStagedFiles]  = useState([])

  const loadWorkspaces = useCallback(async () => {
    try {
      const res = await api.get('/api/workspaces')
      const ws  = res.data.data || []
      console.log("WORKSPACES FROM API:", ws)
      setWorkspaces(ws)

      const dataMap = {}

      await Promise.allSettled(
        ws
          .filter(w => w && w._id)
          .map(async (w) => {
            try {
              const r = await api.get(`/api/ai/${w._id}/data`)
              dataMap[w._id] = r.data.data
            } catch (err) {
              console.log("AI DATA ERROR:", w._id, err.message)
            }
          })
      )

      setWsData(dataMap)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load workspaces')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadWorkspaces() }, [loadWorkspaces])

  const onDrop = useCallback((acceptedFiles) => {
    const pdfs    = acceptedFiles.filter(f => f.type === 'application/pdf')
    const invalid = acceptedFiles.filter(f => f.type !== 'application/pdf')

    if (invalid.length > 0) toast.error('Only PDF files are supported')

    const oversized = pdfs.filter(f => f.size > 50 * 1024 * 1024)
    if (oversized.length > 0) {
      toast.error(`${oversized.map(f => f.name).join(', ')} exceeds 50MB`)
    }

    const ok = pdfs.filter(f => f.size <= 50 * 1024 * 1024)
    setStagedFiles(prev => {
      const existing = new Set(prev.map(f => f.name))
      return [...prev, ...ok.filter(f => !existing.has(f.name))]
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:   { 'application/pdf': ['.pdf'] },
    maxFiles: 10,
    disabled: uploading,
  })

  const handleUpload = async () => {
    if (stagedFiles.length === 0) return
    setUploading(true)

    const formData = new FormData()
    for (const file of stagedFiles) formData.append('files', file)

    try {
      await api.post('/api/workspaces/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000,
      })
      const label = stagedFiles.length === 1
        ? `"${stagedFiles[0].name}" uploaded`
        : `${stagedFiles.length} PDFs uploaded as one workspace`
      toast.success(label)
      setStagedFiles([])
      await loadWorkspaces()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (wsId) => {
    try {
      await api.delete(`/api/workspaces/${wsId}`)
      setWorkspaces(prev => prev.filter(w => w._id !== wsId))
      toast.success('Workspace deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete')
    }
  }

  const totalWs       = workspaces.length
  const totalMessages = Object.values(wsData).reduce((s, d) => s + (d?.chatHistory?.length || 0), 0)
  const allQuizzes    = Object.values(wsData).flatMap(d => d?.quizzes || []).filter(q => q.score != null)
  const avgScore      = allQuizzes.length > 0
    ? Math.round(allQuizzes.reduce((s, q) => s + (q.score / q.total) * 100, 0) / allQuizzes.length)
    : 0

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">

        <div className="mb-8">
          <h1 className="font-display text-2xl text-foreground">
            Good day, {user?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload one or more PDFs to create a study workspace
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard icon={Layers}        label="Workspaces"      value={totalWs}       color="bg-indigo-500/10 text-indigo-500" />
          <StatCard icon={MessageSquare} label="Questions asked"  value={totalMessages}  color="bg-purple-500/10 text-purple-500" />
          <StatCard icon={BarChart2}     label="Avg quiz score"   value={avgScore > 0 ? `${avgScore}%` : '—'} color="bg-emerald-500/10 text-emerald-500" />
        </div>

        <div className="mb-8">
          <div
            {...getRootProps()}
            className={`
              relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
              ${isDragActive ? 'border-indigo-500 bg-indigo-500/5' : 'border-border hover:border-indigo-500/50 hover:bg-accent/50'}
              ${uploading ? 'pointer-events-none opacity-60' : ''}
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isDragActive ? 'bg-indigo-500/20' : 'bg-accent'}`}>
                <CloudUpload className={`w-6 h-6 ${isDragActive ? 'text-indigo-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isDragActive ? 'Drop PDFs here' : 'Drag & drop PDFs here'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Drop multiple PDFs to study them together · max 50MB each
                </p>
              </div>
            </div>
          </div>

          {stagedFiles.length > 0 && (
            <div className="mt-4 bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-foreground">
                  {stagedFiles.length === 1 ? '1 file ready' : `${stagedFiles.length} files — will be one shared workspace`}
                </p>
                {stagedFiles.length > 1 && (
                  <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                    cross-search enabled
                  </span>
                )}
              </div>

              <div className="space-y-2 mb-4">
                {stagedFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 bg-background rounded-xl border border-border">
                    <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="text-sm text-foreground flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                    <button
                      onClick={() => setStagedFiles(prev => prev.filter(f => f.name !== file.name))}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Create workspace</>
                  )}
                </button>
                <button
                  onClick={() => setStagedFiles([])}
                  disabled={uploading}
                  className="px-4 py-2.5 border border-border text-sm text-muted-foreground hover:text-foreground rounded-xl transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-foreground">Your workspaces</h2>
            <span className="text-xs text-muted-foreground">{totalWs} {totalWs === 1 ? 'workspace' : 'workspaces'}</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-4 h-36 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-muted mb-3" />
                  <div className="h-3 rounded bg-muted w-3/4 mb-2" />
                  <div className="h-3 rounded bg-muted w-1/2" />
                </div>
              ))}
            </div>
          ) : workspaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
                <Layers className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No workspaces yet</p>
              <p className="text-xs text-muted-foreground mt-1">Upload PDFs above to create your first workspace</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {workspaces.map(ws => (
                <WorkspaceCard
                  key={ws._id}
                  workspace={ws}
                  chatCount={wsData[ws._id]?.chatHistory?.length || 0}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}