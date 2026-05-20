const mongoose = require('mongoose')

const workspaceDataSchema = new mongoose.Schema({
  workspaceId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Workspace',
    required: true,
    unique:   true,
  },
  chatHistory: [{
    role:      { type: String, enum: ['user', 'ai'] },
    message:   { type: String },
    timestamp: { type: Date, default: Date.now },
  }],
  chatUpdatedAt:       Date,
  summary:             String,
  summaryGeneratedAt:  Date,
  flashcards:          [{ front: String, back: String }],
  flashcardsGeneratedAt: Date,
  quizzes: [{
    questions:   { type: mongoose.Schema.Types.Mixed },
    score:       Number,
    total:       Number,
    attemptedAt: Date,
  }],
})

module.exports = mongoose.model('WorkspaceData', workspaceDataSchema)