const createError = require('http-errors')
const debug = require('debug')('date-guide:debug')
const KikoAnswerService = require('./services/kiko-answer-service')
const KikoFormSession = require('./models/kiko-form-session')
const sessionsCollectionName = 'kiko-form-sessions'

/**
 * 
 */
async function getAnyQuestionMessages (parameter) {
  return [
    {
      type: 'message',
      data: {
        content: parameter.question,
        type: 'text/plain'
      }
    }
  ]
}

/**
 * 
 */
async function getDateQuestionMessages (parameter) {
  const dateElementId = 'mydatepicker'
  const selectedDate = '14.2.2021'
  return [
    {
      type: 'message',
      data: {
        content: parameter.question,
        type: 'text/plain'
      }
    },
    {
      type: 'message',
      data: {
        content: `
        <div id="${dateElementId}" data-date="${selectedDate}"></div>            
        `,
        type: 'text/html'
      }
    }
  ]
}

/**
 *
 *
 * @param {*} options
 */
async function runDatePickerDialog (options) {
  const { endpointBaseUrl, conversationId, messages } = options

  const kikoBotService = new KikoAnswerService({ endpointBaseUrl, conversationId })
  const kikoFormSession = new KikoFormSession(sessionsCollectionName)

  let metadata = messages[0].metaData
  let formSessionData

  if (metadata) {
    // cleanup existing old session data
    await kikoFormSession.removeData(conversationId)
  } else {
    formSessionData = await kikoFormSession.readData(conversationId)
    if (!formSessionData) throw createError(400, 'Missing metadata or formSessionData.')
    metadata = formSessionData.metadata
    if (!metadata) { throw createError(400, 'Missing metadata.') }
  }

  if (!metadata.parameters) { throw createError(400, 'Missing parameters in metadata.') }

  const newFormSessionData = formSessionData ? Object.assign({}, formSessionData) : { metadata: metadata }
  const lastParameterPos = formSessionData ? formSessionData.lastParameterPos : null
  const lastParameter = lastParameterPos !== null ? metadata.parameters[lastParameterPos] : null
  if (lastParameter) {
    // save form parameter input data if necessary
    const fieldInputContent = messages[0].data ? messages[0].data.content : undefined
    newFormSessionData.content = newFormSessionData.content || {}
    newFormSessionData.content[lastParameter.name] = fieldInputContent
  }
  const pos = (lastParameterPos === null ? 0 : lastParameterPos + 1)
  const parameter = metadata.parameters[pos] ? metadata.parameters[pos] : null

  if (parameter === null) {
    debug('SOLVED FORM QUESTIONS ================== ', newFormSessionData.content)
    const outputMessages = metadata.intent.output
    // form session ends here - remove session data
    await kikoFormSession.removeData(conversationId)
    // send the form content to somewhere
    // ... newFormSessionData.content

    // send the result to the chat
    await kikoBotService.sendMessage(outputMessages, true)
      .catch((err) => { throw createError(500, 'sendMessage: ' + err.message) })
  } else {
    // next parameter ... question
    newFormSessionData.lastParameterPos = pos
    // save session data
    await kikoFormSession.saveData(conversationId, newFormSessionData)
    // output the next form parameter question to the chat
    const typeToFunctionMapping = {
      '@sys.any': getAnyQuestionMessages,
      '@sys.date': getDateQuestionMessages
    }
    const myFunction = typeToFunctionMapping[parameter.dataType] || getAnyQuestionMessages
    const questionMessages = await myFunction.call(this, parameter)
    await kikoBotService.sendMessage(questionMessages, false)
      .catch((err) => { throw createError(500, 'sendMessage: ' + err.message) })
  }
}

/**
 * Kiko subbot action router for import actions
 *
 * @param {*} req
 * @param {*} res
 */
async function postWebhookMessageSent (req, res) {
  const { conversationId, messages } = req.body
  const referer = req.get('referer') || req.query.referer
  if (!referer) throw createError(400, 'Missing referer.')
  const endpointBaseUrl = referer.replace(/\/\//g, 'https://')
  await runDatePickerDialog({ endpointBaseUrl, conversationId, messages })
  res.status(200).json({ success: true })
}

module.exports = {
  postWebhookMessageSent
}
