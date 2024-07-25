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
    update,
    givingTimeToTask,
    forContractBatalyonns,
    search,
    importExcelData,
    updateContractsInfo,
    searchByNumber,
    searchByClientName,
    searchByAddress
} = require('../controller/contract.controller')

const upload = require('multer')()

router.post("/create", protect, create)
router.get("/get", protect, getAllcontracts)
router.get('/get/contract/:id', protect, getContractAndTasks)
router.get('/to/print/:id', protect,  toPrint )
router.delete('/delete/:id', protect, deleteContract)
router.get('/print/task/worker/:id', protect, taskOfWorker)
router.post('/filter/by/date', protect, filterByDate)
router.get('/payment/contract/:id', protect, paymentContract)
router.put('/update/:id', protect, update)
router.post('/giving/time/to/task/:id', protect, givingTimeToTask)
router.get('/get/all/batalyon', protect, forContractBatalyonns)
router.post("/search", protect, search)
router.post('/import/excel/data', upload.single("file"), protect, importExcelData)
router.put('/update/info/:id', protect, updateContractsInfo)
router.post('/search/by/number', protect, searchByNumber)
router.post('/search/by/client/name', protect, searchByClientName)
router.post('/search/by/address', protect, searchByAddress)



module.exports = router