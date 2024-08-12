const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const {
    getAllTasks,
    filterByDate,
    exportsToExcel,
    allTasks,
    allTasksExportsToExcel,
    allTasksFilterByDate,
} = require('../controller/batalon.tasks.controller')

router.get('/get/:id', protect, getAllTasks)
router.post('/filter/by/date/:id',protect, filterByDate )
router.post('/export/to/excel', protect, exportsToExcel)
router.get('/all/tasks', protect, allTasks)
router.post('/all/tasks/exports/to/excel', protect, allTasksExportsToExcel)
router.post('/all/tasks/filter/by/date', protect, allTasksFilterByDate)


module.exports = router