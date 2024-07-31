const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const {
    create,
    getAll,
    update,
    deletemfos,
} = require('../controller/mfos.controller')

router.post("/create", protect, create)
router.get('/get/all', protect, getAll)
router.put("/update/:id", protect, update)
router.delete("/delete/:id", protect, deletemfos)

module.exports = router