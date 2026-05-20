const axios        = require('axios')
const FormData     = require('form-data')
const Workspace    = require('../models/Workspace')
const WorkspaceData = require('../models/WorkspaceData')
const asyncHandler = require('../utils/asyncHandler')

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

// ── POST /api/workspaces/upload ───────────────────────────────────────────
const createWorkspace = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'No PDF files uploaded' })
  }

  const form = new FormData()
  for (const file of req.files) {
    form.append('files', file.buffer, {
      filename:    file.originalname,
      contentType: file.mimetype,
    })
  }

  let aiResponse
  try {
    aiResponse = await axios.post(
      `${AI_SERVICE_URL}/api/chat/upload`,
      form,
      {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 180000,
      }
    )
  } catch (err) {
    console.error('🔥 AI SERVICE FAILED')
    console.error(err.response?.data || err.message)
    return res.status(500).json({
      success: false,
      message: 'AI service upload failed',
    })
  }

  const { session_id } = aiResponse.data

  const names = req.files.map(f => f.originalname.replace(/\.pdf$/i, ''))
  const workspaceName =
    names.length === 1 ? names[0]
    : names.length <= 3 ? names.join(' + ')
    : `${names[0]} + ${names.length - 1} more`

  const workspace = await Workspace.create({
    userId:    req.user._id,
    name:      workspaceName,
    sessionId: session_id,
    files:     req.files.map(f => ({
      fileName: f.originalname,
      fileSize: f.size,
      fileData: f.buffer,
    })),
  })

  await WorkspaceData.create({ workspaceId: workspace._id })

  const safe = workspace.toObject()
  safe.files = safe.files.map(({ fileData, ...rest }) => rest)

  res.status(201).json({ success: true, data: safe })
})

// ── GET /api/workspaces ───────────────────────────────────────────────────
const getWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await Workspace
    .find({ userId: req.user._id })
    .lean()
    .sort({ createdAt: -1 })

  const safe = workspaces.map(ws => ({
    ...ws,
    files: (ws.files || []).map(({ fileData, ...rest }) => rest)
  }))

  console.log("SENDING TO FRONTEND:", JSON.stringify(safe.map(w => ({ _id: w._id, name: w.name, filesCount: w.files?.length })), null, 2))

  res.json({ success: true, data: safe })
})

// ── DELETE /api/workspaces/:id ────────────────────────────────────────────
const deleteWorkspace = asyncHandler(async (req, res) => {
  const workspace = await Workspace
    .findById(req.params.id)
    .select('-files.fileData')

  if (!workspace) {
    return res.status(404).json({ success: false, message: 'Workspace not found' })
  }
  if (workspace.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized' })
  }

  await WorkspaceData.deleteOne({ workspaceId: workspace._id })
  await workspace.deleteOne()

  res.json({ success: true, message: 'Workspace deleted' })
})

// ── GET /api/workspaces/:id/files/:fileId ────────────────────────────────
const serveFile = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findOne({
    _id:    req.params.id,
    userId: req.user._id,
  })

  if (!workspace) {
    return res.status(404).json({ success: false, message: 'Workspace not found' })
  }

  const file = workspace.files.id(req.params.fileId)
  if (!file || !file.fileData) {
    return res.status(404).json({ success: false, message: 'File not found' })
  }

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${file.fileName}"`)
  res.send(file.fileData)
})

module.exports = { createWorkspace, getWorkspaces, deleteWorkspace, serveFile }