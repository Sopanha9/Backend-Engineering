# EP 09 — Object Storage & Large Files

> Handle file uploads, cloud storage, and streaming efficiently.

---

## What you will learn
- File uploads with Multer
- File validation (type, size)
- AWS S3 integration
- Streaming large files
- Presigned URLs

---

## 1. File uploads with Multer

```bash
npm install multer
```

```js
const multer = require('multer')

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid type'))
  }
})

app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ filename: req.file.filename, size: req.file.size })
})
```

---

## 2. AWS S3 upload

```bash
npm install @aws-sdk/client-s3
```

```js
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

const s3 = new S3Client({ region: process.env.AWS_REGION })

// Upload
const upload = multer({ storage: multer.memoryStorage() })
app.post('/upload', upload.single('file'), async (req, res) => {
  const key = `uploads/${Date.now()}-${req.file.originalname}`
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
  }))
  res.json({ key, url: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}` })
})
```

---

## 3. Presigned URLs (let client upload directly)

```js
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

app.get('/upload-url', async (req, res) => {
  const key = `uploads/${Date.now()}-${req.query.filename}`
  const url = await getSignedUrl(s3, new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: req.query.contentType,
  }), { expiresIn: 300 }) // 5 min
  res.json({ uploadUrl: url, key })
})
// Client uploads directly to S3 — your server never touches the bytes
```

---

## Run it

```bash
npm install && npm start
curl -F "file=@/path/to/image.jpg" http://localhost:3000/upload
```

## Next → EP 10: Transactional Emails
