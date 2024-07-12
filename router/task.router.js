const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const {
    getAllTasks,
} = require('../controller/task.controller')

router.get('/get/tasks/', protect, getAllTasks)

module.exports = router