const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const { 
    resultCreate,
    getAllCommand,
    getBattalionAndWorkers,
    filterByDate,
    createExcel,
    deleteCommands
} = require('../controller/result.controller')


router.get('/get/command/', protect, getAllCommand)
router.post("/create", protect, resultCreate)
router.get('/get/battalion/workers/:id', protect, getBattalionAndWorkers)
router.post('/filter/by/date', protect, filterByDate)
router.post('/excel/create/:id', protect, createExcel)
router.delete('/delete/:id', protect, deleteCommands)

module.exports = router