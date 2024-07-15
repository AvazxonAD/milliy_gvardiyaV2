const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const { 
    resultCreate,
    getAllCommand,
    getBattalionAndWorkers,
    createSpecial
} = require('../controller/result.controller')

router.get('/get/command/', protect, getAllCommand)
router.post("/create", protect, resultCreate)
router.get('/get/battalion/workers/:id', protect, getBattalionAndWorkers)
router.post("/create/special", protect, createSpecial)

module.exports = router