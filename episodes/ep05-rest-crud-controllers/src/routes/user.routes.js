const { Router } = require('express')
const router = Router()
const ctrl = require('../controllers/user.controller')
router.get('/', ctrl.getAll)
router.post('/', ctrl.create)
router.get('/:id', ctrl.getOne)
router.patch('/:id', ctrl.update)
router.delete('/:id', ctrl.remove)
module.exports = router
