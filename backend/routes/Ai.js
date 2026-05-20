const express = require('express')
const {
  getWorkspaceData,
  chat,
  chatStream,
  generateSummary,
  generateFlashcards,
  generateQuiz,
  saveQuizScore,
} = require('../controllers/aiController')
const protect = require('../middleware/auth')

const router = express.Router()

router.get( '/:workspaceId/data',                    protect, getWorkspaceData)
router.post('/:workspaceId/chat',                    protect, chat)
router.post('/:workspaceId/chat-stream',             protect, chatStream)
router.post('/:workspaceId/summary',                 protect, generateSummary)
router.post('/:workspaceId/flashcards',              protect, generateFlashcards)
router.post('/:workspaceId/quiz',                    protect, generateQuiz)
router.post('/:workspaceId/quiz/:quizIndex/score',   protect, saveQuizScore)

module.exports = router