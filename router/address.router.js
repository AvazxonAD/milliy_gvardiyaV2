const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const {
    create,
    getAll,
    update,
    deleteaddresses,
} = require('../controller/addresses.controller')

router.post("/create", protect, create)
router.get('/get/all', protect, getAll)
router.put("/update/:id", protect, update)
router.delete("/delete/:id", protect, deleteaddresses)

module.exports = router