const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const {
    create,
    getAllworker,
    getElementById,
    getAllBatalyon,
    updateWorker,
    deleteWorker,
    searchWorker
} = require('../controller/worker.controller')

router.post("/create", protect, create)
router.get("/get/:id", protect, getAllworker )
router.get('/get/one/:id', protect, getElementById)
router.get('/get/all/batalyon', protect, getAllBatalyon)
router.put("/update/:id", protect, updateWorker)
router.delete("/delete/:id", protect, deleteWorker)
router.post('/search', protect, searchWorker)

module.exports = router