const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const {
    login,
    createBatalyon,
    update,
    getProfile,
    updateBatalyons
} = require('../controller/auth.controller')

router.post('/login', login)
router.post("/create", protect, createBatalyon)
router.put('/update', protect, update)
router.get("/get", protect, getProfile)
router.put('/update/batalyon/:id', protect, updateBatalyons)

module.exports = router