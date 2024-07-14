const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const {
    getAllTasks,
    filterByStatus,
    filterByDate
} = require('../controller/task.controller')

router.get('/get/tasks/', protect, getAllTasks)
router.get('/filter/by/status', protect, filterByStatus)
router.post('/filter/by/date', protect, filterByDate)

module.exports = router