import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import ModeSelector from './ModeSelector'
import { useToast } from '../context/ToastContext'

function ChatMessage({ role, message, isStreaming }) {
  const isUser = role === 'user'

  // Restore escaped newlines from SSE transport
  const text = message.replace(/\\n/g, '\n')

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        isUser ? 'bg-indigo-600' : 'bg-accent border border-border'
      }`}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-white" />
          : <Bot  className="w-3.5 h-3.5 text-indigo-500" />
        }
      </div>
      <div className={`max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`
          px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-accent text-foreground rounded-tl-sm'
          }
          ${isStreaming ? 'streaming-cursor' : ''}
        `}>
          {text}
        </div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-accent border border-border">
        <Bot className="w-3.5 h-3.5 text-indigo-500" />
      </div>
      <div className="bg-accent rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

export default function ChatWindow({ workspaceId, initialHistory = [] }) {
  const toast = useToast()
  const [messages,      setMessages]      = useState(initialHistory)
  const [input,         setInput]         = useState('')
  const [mode,          setMode]          = useState('normal')
  const [isStreaming,   setIsStreaming]   = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)

  useEffect(() => { setMessages(initialHistory) }, [workspaceId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const sendMessage = async () => {
    const question = input.trim()
    if (!question || isStreaming) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', message: question }])
    setStreamingText('')
    setIsStreaming(true)

    try {
      const token = localStorage.getItem('token')

      const response = await fetch(
        `http://localhost:5000/api/ai/${workspaceId}/chat-stream`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ question, mode }),
        }
      )

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.message || `HTTP ${response.status}`)
      }

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText  = ''
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE lines from the buffer
        // SSE format: "data: token\n\n"
        const lines = buffer.split('\n')
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          const token = line.slice(6) // strip "data: "

          if (token === '[DONE]') {
            // Stream complete
            break
          }
          if (token.startsWith('[ERROR]')) {
            toast.error(token.replace('[ERROR]', '').trim() || 'AI error')
            break
          }

          // Restore newlines escaped for SSE transport
          const restored = token.replace(/\\n/g, '\n')
          fullText += restored
          setStreamingText(fullText)
        }
      }

      // Commit the complete message
      if (fullText) {
        setMessages(prev => [...prev, { role: 'ai', message: fullText }])
      }
      setStreamingText('')
    } catch (err) {
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/auth'
        return
      }
      toast.error(err.message || 'Failed to get response')
      setStreamingText('')
    } finally {
      setIsStreaming(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Mode selector */}
      <div className="px-4 py-2 border-b border-border bg-background/50">
        <ModeSelector selected={mode} onChange={setMode} disabled={isStreaming} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-3">
              <Bot className="w-6 h-6 text-indigo-500" />
            </div>
            <p className="text-sm font-medium text-foreground">Ask anything about this workspace</p>
            <p className="text-xs text-muted-foreground mt-1">
              AI searches across all PDFs in this session
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} message={msg.message} />
        ))}

        {isStreaming && streamingText && (
          <ChatMessage role="ai" message={streamingText} isStreaming />
        )}
        {isStreaming && !streamingText && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-border bg-background/50">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
            disabled={isStreaming}
            rows={1}
            className="flex-1 resize-none px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all disabled:opacity-50 overflow-hidden"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm shadow-indigo-500/20"
          >
            {isStreaming
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send    className="w-4 h-4" />
            }
          </button>
        </div>
        {isStreaming && (
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Generating response...
          </p>
        )}
      </div>
    </div>
  )
}