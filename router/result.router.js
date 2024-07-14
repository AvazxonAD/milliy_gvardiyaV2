const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const { 
    resultCreate,
    getAllCommand
} = require('../controller/result.controller')

router.post("/create", protect, resultCreate)
router.get('/get/command', protect, getAllCommand)

module.exports = router