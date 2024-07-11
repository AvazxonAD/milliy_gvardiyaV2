const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const { getBxm, updateBxm } = require('../controller/bxm.controller')

router.put('/update', protect, updateBxm)
router.get("/get", protect, getBxm)

module.exports = router