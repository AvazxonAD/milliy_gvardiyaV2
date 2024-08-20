const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const { 
    getAllContracts,
    filterByDate,
    importToExcel
} = require('../controller/not.pay.contracts')


router.get('/get/all', protect, getAllContracts)
router.post('/filter/by/date', protect, filterByDate)
router.post('/import/to/excel', protect, importToExcel)

module.exports = router