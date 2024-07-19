const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const {
    create,
    getAllAccountNumber,
    update,
    deleteAccountNumber,
} = require('../controller/accountNumber.controller')

router.post("/create", protect, create)
router.get('/get/all', protect, getAllAccountNumber)
router.put("/update/:id", protect, update)
router.delete("/delete/:id", protect, deleteAccountNumber)

module.exports = router