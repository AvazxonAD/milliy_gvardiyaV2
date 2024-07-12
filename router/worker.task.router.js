const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const {
    pushWorker,
    getAlltasksOfWorker
} = require('../controller/worker_task.controller')

router.post('/push/worker/:id', protect, pushWorker)
router.get("/tasks/of/worker/:id", protect, getAlltasksOfWorker)

module.exports = router