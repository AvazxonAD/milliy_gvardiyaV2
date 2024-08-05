const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const {
    createFileTask,
    getAllTasks,
    getAdminFile
} = require('../controller/file.task.controller')

const upload = require('multer')()

router.post('/create/task', protect, upload.single("file"), createFileTask)
router.get('/get/all/task', protect, getAllTasks)
router.get('/get/admin/file/:id', protect, getAdminFile)

module.exports = router