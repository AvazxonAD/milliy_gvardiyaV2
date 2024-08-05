const express = require('express')
const app = express()
const cors = require('cors')
const path = require('path')

app.use(express.json())
app.use(express.urlencoded({extended: false}))

require('dotenv').config()
require('colors')
app.use(cors())

require('./utils/createAdmin')()
require('./utils/create.storage')()

app.use(express.static(path.join(__dirname, 'public')))

app.use('/auth', require('./router/auth.router'))
app.use('/worker', require('./router/worker.router'))
app.use('/bxm', require('./router/bxm.router'))
app.use('/contract', require("./router/contract.router"))
app.use('/task', require('./router/task.router'))
app.use('/worker_task', require('./router/worker.task.router'))
app.use("/result", require('./router/result.router'))
app.use('/special', require("./router/special.router"))
app.use('/account/number', require('./router/accountNumber.router'))
app.use('/executors', require('./router/executors.router'))
app.use('/leaders', require('./router/leaders.router'))
app.use('/address', require('./router/address.router'))
app.use('/banks', require('./router/banks.router'))
app.use('/mfo', require('./router/mfo.router'))
app.use('/str', require('./router/str.router'))
app.use('/file', require('./router/file.task.router'))


app.use(require('./middleware/errorHandler'))

const PORT = process.env.PORT || 3002

app.listen(PORT, () => {
    console.log(`server runing on port: ${PORT}`.bgBlue)
})