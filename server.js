const express = require('express')
const app = express()


app.use(express.json())
app.use(express.urlencoded({extended: false}))

require('dotenv').config()
require('colors')

require('./utils/createAdmin')()

app.use('/auth', require('./router/auth.router'))
app.use('/worker', require('./router/worker.router'))

app.use(require('./middleware/errorHandler'))

const PORT = process.env.PORT || 3002

app.listen(PORT, () => {
    console.log(`server runing on port: ${PORT}`.bgBlue)
})