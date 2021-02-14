const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')

const Functions = require('./functions')

// ============================
// console.log('============ index.js - START')
const app = express()
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.get('/v1/ping', (req, res) => { res.status(200).send('pong.') })
app.post('/v1/webhook-message-sent', Functions.postWebhookMessageSent)

app.use(express.static('src/public'))

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`Server is up and running on port number ${port}`)
})
