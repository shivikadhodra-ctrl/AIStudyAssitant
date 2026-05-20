const mongoose = require('mongoose')

const fileSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileSize: { type: Number },
  fileData: { type: Buffer, required: true },
})

const workspaceSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:      { type: String, required: true },
  sessionId: { type: String, required: true },
  files:     [fileSchema],
  createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model('Workspace', workspaceSchema)