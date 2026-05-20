import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Layers, MessageSquare, Clock, Trash2, MoreVertical, FileText } from 'lucide-react'

function formatDate(dateString) {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now   = new Date()
  const days  = Math.floor((now - date) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function WorkspaceCard({ workspace, chatCount = 0, onDelete }) {
  const navigate   = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fileCount  = workspace.files?.length || 0
  const isMulti    = fileCount > 1

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (deleting) return
    setDeleting(true)
    setMenuOpen(false)
    await onDelete(workspace._id)
    setDeleting(false)
  }

  return (
    <div
      onClick={() => navigate(`/study/${workspace._id}`)}
      className="group relative bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200"
    >
      {/* Icon */}
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors group-hover:bg-indigo-500/20 ${
          isMulti ? 'bg-purple-500/10' : 'bg-indigo-500/10'
        }`}>
          {isMulti
            ? <Layers className="w-5 h-5 text-purple-500" />
            : <FileText className="w-5 h-5 text-indigo-500" />
          }
        </div>

        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(p => !p) }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-card border border-border rounded-xl shadow-xl py-1 z-10 animate-fade-in">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Name */}
      <h3 className="text-sm font-medium text-foreground leading-snug mb-1 line-clamp-2 pr-1">
        {workspace.name}
      </h3>

      {/* File count badge for multi-PDF workspaces */}
      {isMulti && (
        <div className="flex flex-wrap gap-1 mb-2">
          <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full">
            {fileCount} PDFs
          </span>
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 mt-2">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageSquare className="w-3 h-3" />
          {chatCount} {chatCount === 1 ? 'message' : 'messages'}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {formatDate(workspace.createdAt)}
        </span>
      </div>

      {/* Hover accent line */}
      <div className={`absolute inset-x-0 bottom-0 h-0.5 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity ${
        isMulti
          ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
          : 'bg-gradient-to-r from-indigo-500 to-purple-500'
      }`} />
    </div>
  )
}