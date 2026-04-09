# EP 10 — Transactional Emails

> Send reliable, templated emails from your backend.

---

## What you will learn
- Transactional vs marketing emails
- Nodemailer setup
- Email templates
- SendGrid / Resend integration
- Email best practices

---

## 1. Transactional vs marketing

```
Transactional → triggered by user action
  - Welcome email
  - Password reset
  - Order confirmation
  - Invoice

Marketing → sent in bulk
  - Newsletter
  - Promotions
```

---

## 2. Nodemailer setup

```bash
npm install nodemailer
```

```js
const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,       // smtp.gmail.com
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  }
})

await transporter.sendMail({
  from: '"My App" <noreply@myapp.com>',
  to: user.email,
  subject: 'Welcome!',
  html: '<h1>Welcome!</h1>',
  text: 'Welcome!'
})
```

---

## 3. Resend (modern, recommended)

```bash
npm install resend
```

```js
const { Resend } = require('resend')
const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: user.email,
  subject: 'Welcome!',
  html: '<h1>Welcome!</h1>'
})
```

---

## 4. Email service pattern

```js
// services/email.service.js
class EmailService {
  async sendWelcome(user) { ... }
  async sendPasswordReset(user, token) {
    const url = `${APP_URL}/reset?token=${token}`
    // token expires in 1 hour — store in DB with expiry
    await this.send({ to: user.email, subject: 'Reset password', html: template(url) })
  }
}
```

---

## 5. Security — password reset flow

```js
// 1. Generate secure token
const token = crypto.randomBytes(32).toString('hex')
const expires = new Date(Date.now() + 3600 * 1000) // 1 hour

// 2. Store hashed token in DB (never store raw tokens)
await db.passwordReset.create({ userId, tokenHash: hash(token), expires })

// 3. Send reset link
await emailService.sendPasswordReset(user, token)

// 4. On reset — verify token, check expiry, delete after use
```

---

## Run it

```bash
npm install && npm start
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Bob","email":"bob@example.com"}'
```

## Next → EP 11: Task Queuing & Scheduling
