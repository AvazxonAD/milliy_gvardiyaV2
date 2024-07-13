const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const {
    create,
    getAllcontracts,
    getContractAndTasks,
    toPrint,
    deleteContract,
    taskOfWorker,
    filterByDate,
    paymentContract,
    update
} = require('../controller/contract.controller')

router.post("/create", protect, create)
router.get("/get", protect, getAllcontracts)
router.get('/get/contract/:id', protect, getContractAndTasks)
router.get('/to/print/:id', protect,  toPrint )
router.delete('/delete/:id', protect, deleteContract)
router.get('/print/task/worker/:id', protect, taskOfWorker)
router.post('/filter/by/date', protect, filterByDate)
router.get('/payment/contract/:id', protect, paymentContract)
router.put('/update/:id', protect, update)

module.exports = router