const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')

const { 
    createSpecial,
    getAllSpecial,
    getIibBatalyonAndContracts,
    getAllSpecialFilterByDate,
    deleteCommands
} = require('../controller/special.result.controller')

router.post("/create/commands", protect, createSpecial)
router.get("/get/command", protect, getAllSpecial)
router.get("/get/batalyon/and/contracts/:id", protect, getIibBatalyonAndContracts)
router.post("/filter/by/date", protect, getAllSpecialFilterByDate)
router.delete("/delete/:id", protect, deleteCommands)

module.exports = router