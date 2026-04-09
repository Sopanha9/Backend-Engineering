const express = require('express')
const app = express()
app.use(express.json())

// Email service (uses nodemailer pattern)
const emailService = {
  async send({ to, subject, html, text }) {
    // In production: use nodemailer with SMTP or SendGrid/Resend API
    console.log(`📧 Sending email to: ${to}`)
    console.log(`   Subject: ${subject}`)
    console.log(`   Body: ${text || html}`)
    return { messageId: `msg-${Date.now()}`, to, subject }
  },

  async sendWelcome(user) {
    return this.send({
      to: user.email,
      subject: 'Welcome to our platform!',
      html: `<h1>Hi ${user.name}!</h1><p>Your account is ready.</p>`,
      text: `Hi ${user.name}! Your account is ready.`
    })
  },

  async sendPasswordReset(user, token) {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`
    return this.send({
      to: user.email,
      subject: 'Password Reset Request',
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Expires in 1 hour.</p>`,
      text: `Reset your password: ${resetUrl}`
    })
  },

  async sendOrderConfirmation(user, order) {
    return this.send({
      to: user.email,
      subject: `Order #${order.id} Confirmed`,
      html: `<h2>Order confirmed!</h2><p>Total: $${order.total}</p>`,
      text: `Order #${order.id} confirmed. Total: $${order.total}`
    })
  }
}

const users = [{ id: 1, name: 'Alice', email: 'alice@example.com' }]

app.post('/users', async (req, res) => {
  const user = { id: Date.now(), ...req.body }
  users.push(user)
  await emailService.sendWelcome(user)
  res.status(201).json({ data: user })
})

app.post('/auth/forgot-password', async (req, res) => {
  const user = users.find(u => u.email === req.body.email)
  if (!user) return res.status(200).json({ message: 'If email exists, reset link sent' })
  const token = require('crypto').randomBytes(32).toString('hex')
  await emailService.sendPasswordReset(user, token)
  res.json({ message: 'Reset link sent', token }) // don't return token in production!
})

app.listen(3000, () => console.log('EP10 running on :3000'))
