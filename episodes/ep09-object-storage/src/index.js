const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const app = express()
app.use(express.json())

// Local storage (swap for S3 in production)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads'
    if (!fs.existsSync(dir)) fs.mkdirSync(dir)
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${unique}${path.extname(file.originalname)}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('File type not allowed'))
  }
})

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  res.status(201).json({
    data: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: `/files/${req.file.filename}`
    }
  })
})

app.get('/files/:filename', (req, res) => {
  const filepath = path.join('./uploads', req.params.filename)
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'File not found' })
  res.sendFile(path.resolve(filepath))
})

app.listen(3000, () => console.log('EP09 running on :3000'))
