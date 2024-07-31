const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const {
    create,
    getAll,
    update,
    deletestrs,
} = require('../controller/strs.controller')

router.post("/create", protect, create)
router.get('/get/all', protect, getAll)
router.put("/update/:id", protect, update)
router.delete("/delete/:id", protect, deletestrs)

module.exports = router