const { Router } = require('express')
const router = Router()
const userRoutes = require('./user.routes')
router.use('/users', userRoutes)
module.exports = router
