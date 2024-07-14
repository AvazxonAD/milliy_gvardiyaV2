const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const { 
    getForResultPageWorkers,

} = require('../controller/result.controller')

router.post("/get/for/workers", protect, getForResultPageWorkers)

module.exports = router