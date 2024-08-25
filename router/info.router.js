const {Router} = require('express') 
const router = Router()

const protect = require('../middleware/auth')
const protect_video = require('../utils/protect.file')

const {
    postVideoInfo,
    getAllInfos,
    deleteVideo,
    getElementById,
    getElementByIdInfo
} = require('../controller/info.controller')

router.post("/post/video", protect, protect_video.single('video'), postVideoInfo)
router.get('/get/all', protect, getAllInfos)
router.delete('/delete/video/:id', protect, deleteVideo)
router.get('/get/:id', protect, getElementById)
router.get('/get/info/:id', protect, getElementByIdInfo)

module.exports = router