const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const {
    create,
    getAllcontracts,
    getContractAndTasks,
} = require('../controller/contract.controller')

router.post("/create", protect, create)
router.get("/get", protect, getAllcontracts)
router.get('/get/contract/:id', protect, getContractAndTasks)

module.exports = router