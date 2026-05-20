const Workspace     = require('../models/Workspace')
const WorkspaceData = require('../models/WorkspaceData')
const asyncHandler  = require('../utils/asyncHandler')
const axios         = require('axios')

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

async function resolveWorkspace(workspaceId, userId) {
  const workspace = await Workspace
    .findById(workspaceId)
    .select('-files.fileData')
  if (!workspace) throw Object.assign(new Error('Workspace not found'), { status: 404 })
  if (workspace.userId.toString() !== userId.toString()) {
    throw Object.assign(new Error('Not authorized'), { status: 403 })
  }
  return workspace
}

const getWorkspaceData = asyncHandler(async (req, res) => {
  await resolveWorkspace(req.params.workspaceId, req.user._id)
  const data = await WorkspaceData.findOne({ workspaceId: req.params.workspaceId })
  res.json({ success: true, data })
})

const chat = asyncHandler(async (req, res) => {
  const workspace = await resolveWorkspace(req.params.workspaceId, req.user._id)
  const { question } = req.body
  if (!question?.trim()) {
    return res.status(400).json({ success: false, message: 'Question is required' })
  }

  const aiRes = await axios.post(`${AI_SERVICE_URL}/api/chat/ask`, {
    session_id: workspace.sessionId,
    question,
  })

  const answer = aiRes.data.answer

  await WorkspaceData.findOneAndUpdate(
    { workspaceId: workspace._id },
    {
      $push: {
        chatHistory: [
          { role: 'user', message: question },
          { role: 'ai',   message: answer   },
        ],
      },
      $set: { chatUpdatedAt: new Date() },
    }
  )

  res.json({ success: true, data: { answer } })
})

const chatStream = asyncHandler(async (req, res) => {
  const workspace = await resolveWorkspace(req.params.workspaceId, req.user._id)
  const { question, mode = 'normal' } = req.body

  if (!question?.trim()) {
    return res.status(400).json({ success: false, message: 'Question is required' })
  }

  const wsData = await WorkspaceData.findOne({ workspaceId: workspace._id })
  const chatHistory = (wsData?.chatHistory || []).slice(-12).map(m => ({
    role:    m.role,
    message: m.message,
  }))

  res.setHeader('Content-Type',      'text/event-stream')
  res.setHeader('Cache-Control',     'no-cache')
  res.setHeader('Connection',        'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.setHeader('Access-Control-Allow-Origin', '*')           // ← add this
res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')  // ← add this

  res.flushHeaders()

  let fullText = ''

  try {
    const url       = new URL(`${AI_SERVICE_URL}/api/chat/ask-stream`)
    const isHttps   = url.protocol === 'https:'
    const transport = isHttps ? require('https') : require('http')

    const payload = JSON.stringify({
      session_id:   workspace.sessionId,
      question,
      mode,
      chat_history: chatHistory,
    })

    await new Promise((resolve) => {
      const aiReq = transport.request(
        {
          hostname: url.hostname,
          port:     url.port || (isHttps ? 443 : 80),
          path:     url.pathname,
          method:   'POST',
          headers:  {
            'Content-Type':   'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (aiRes) => {
          aiRes.on('data', (chunk) => {
            const raw = chunk.toString()
            res.write(raw)

            raw.split('\n').forEach(line => {
              if (line.startsWith('data: ')) {
                const token = line.slice(6)
                if (token !== '[DONE]') fullText += token.replace(/\\n/g, '\n')
              }
            })
          })

          aiRes.on('end', async () => {
            if (fullText) {
              await WorkspaceData.findOneAndUpdate(
                { workspaceId: workspace._id },
                {
                  $push: {
                    chatHistory: [
                      { role: 'user', message: question },
                      { role: 'ai',   message: fullText  },
                    ],
                  },
                  $set: { chatUpdatedAt: new Date() },
                }
              )
            }
            res.end()
            resolve()
          })

          aiRes.on('error', () => {
            res.write('data: [ERROR]\n\n')
            res.end()
            resolve()
          })
        }
      )

      aiReq.on('error', () => {
        res.write('data: [ERROR]\n\n')
        res.end()
        resolve()
      })

      aiReq.write(payload)
      aiReq.end()
    })

  } catch (err) {
    res.write('data: [ERROR]\n\n')
    res.end()
  }
})

const generateSummary = asyncHandler(async (req, res) => {
  const workspace = await resolveWorkspace(req.params.workspaceId, req.user._id)
  const wsData    = await WorkspaceData.findOne({ workspaceId: workspace._id })

  if (wsData?.summary) {
    return res.json({ success: true, data: { summary: wsData.summary, cached: true } })
  }

  const aiRes = await axios.post(`${AI_SERVICE_URL}/api/summary/generate`, {
    session_id: workspace.sessionId,
  })

  const summary = aiRes.data.summary

  await WorkspaceData.findOneAndUpdate(
    { workspaceId: workspace._id },
    { $set: { summary, summaryGeneratedAt: new Date() } }
  )

  res.json({ success: true, data: { summary, cached: false } })
})

const generateFlashcards = asyncHandler(async (req, res) => {
  const workspace = await resolveWorkspace(req.params.workspaceId, req.user._id)
  const wsData    = await WorkspaceData.findOne({ workspaceId: workspace._id })

  if (wsData?.flashcards?.length > 0) {
    return res.json({ success: true, data: { flashcards: wsData.flashcards, cached: true } })
  }

  const { num_cards = 10 } = req.body

  const aiRes = await axios.post(`${AI_SERVICE_URL}/api/quiz/flashcards`, {
    session_id: workspace.sessionId,
    num_cards,
  })

  const flashcards = aiRes.data.flashcards

  await WorkspaceData.findOneAndUpdate(
    { workspaceId: workspace._id },
    { $set: { flashcards, flashcardsGeneratedAt: new Date() } }
  )

  res.json({ success: true, data: { flashcards, cached: false } })
})

const generateQuiz = asyncHandler(async (req, res) => {
  const workspace = await resolveWorkspace(req.params.workspaceId, req.user._id)
  const { num_questions = 5 } = req.body

  const aiRes = await axios.post(`${AI_SERVICE_URL}/api/quiz/generate`, {
    session_id:    workspace.sessionId,
    num_questions,
  })

  const questions = aiRes.data.questions

  const wsData = await WorkspaceData.findOneAndUpdate(
    { workspaceId: workspace._id },
    { $push: { quizzes: { questions, attemptedAt: new Date() } } },
    { new: true }
  )

  const quizIndex = wsData.quizzes.length - 1

  res.json({ success: true, data: { questions, quizIndex } })
})

const saveQuizScore = asyncHandler(async (req, res) => {
  const workspace = await resolveWorkspace(req.params.workspaceId, req.user._id)
  const { score, total } = req.body
  const index = parseInt(req.params.quizIndex)

  await WorkspaceData.findOneAndUpdate(
    { workspaceId: workspace._id },
    {
      $set: {
        [`quizzes.${index}.score`]      : score,
        [`quizzes.${index}.total`]      : total,
        [`quizzes.${index}.attemptedAt`]: new Date(),
      },
    }
  )

  res.json({ success: true, data: { score, total } })
})

module.exports = {
  getWorkspaceData,
  chat,
  chatStream,
  generateSummary,
  generateFlashcards,
  generateQuiz,
  saveQuizScore,
}