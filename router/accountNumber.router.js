const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const {
    create,
    getAllAccountNumbers,
    update,
    deleteAccountNumber,
} = require('../controller/accountNumber.controller')

router.post("/create", protect, create)
router.get('/get/all', protect, getAllAccountNumbers)
router.put("/update/:id", protect, update)
router.delete("/delete/:id", protect, deleteAccountNumber)

module.exports = router