const express = require('express')
const app = express()


app.use(express.json())
app.use(express.urlencoded({extended: false}))

require('dotenv').config()
require('colors')

require('./utils/createAdmin')()
require("./utils/createBxm")()
require("./utils/createBattalions")()

app.use('/auth', require('./router/auth.router'))
app.use('/worker', require('./router/worker.router'))
app.use('/bxm', require('./router/bxm.router'))
app.use('/contract', require("./router/contract.router"))

app.use(require('./middleware/errorHandler'))

const PORT = process.env.PORT || 3002

app.listen(PORT, () => {
    console.log(`server runing on port: ${PORT}`.bgBlue)
})