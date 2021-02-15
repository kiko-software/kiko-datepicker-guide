const express = require('express')
const cors = require('cors')
const compress = require('compression')
const favicon = require('serve-favicon')
const bodyParser = require('body-parser')

const Functions = require('./functions')

// ============================
// console.log('============ index.js - START')
const app = express()
app.use(cors())
app.use(compress())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(favicon('./public/favicon.png'))
app.use(express.static('./public'))

app.post('/v1/webhook-message-sent', Functions.postWebhookMessageSent)

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`Server is up and running on port number ${port}`)
})
