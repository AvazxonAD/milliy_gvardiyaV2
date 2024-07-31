const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const {
    pushWorker,
    getAlltasksOfWorker,
    filterByDate,
} = require('../controller/worker.task.controller')

router.post('/push/worker/:id', protect, pushWorker)
router.get("/tasks/of/worker/:id", protect, getAlltasksOfWorker)
router.post('/filter/by/date/:id', protect, filterByDate)
//router.get('/excel/create', protect, excelCreate)
//router.get("/for/excel/create/page", protect, forExcelCreatePage)

module.exports = router  