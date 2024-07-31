const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const {
    create,
    getAll,
    update,
    deletebanks,
} = require('../controller/banks.controller')

router.post("/create", protect, create)
router.get('/get/all', protect, getAll)
router.put("/update/:id", protect, update)
router.delete("/delete/:id", protect, deletebanks)

module.exports = router