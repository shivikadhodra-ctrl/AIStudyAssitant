const express = require('express')
const multer  = require('multer')
const {
  createWorkspace,
  getWorkspaces,
  deleteWorkspace,
  serveFile,
} = require('../controllers/workspaceController')
const protect = require('../middleware/auth')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Only PDF files are allowed'), false)
  },
  limits: { fileSize: 50 * 1024 * 1024 },
})

const safeUpload = (req, res, next) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message })
    next()
  })
}

router.post('/upload', protect, safeUpload, createWorkspace)
router.get('/', protect, getWorkspaces)
router.delete('/:id', protect, deleteWorkspace)
router.get('/:id/files/:fileId', protect, serveFile)

module.exports = router