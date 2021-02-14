const createError = require('http-errors')
const debug = require('debug')('date-guide:debug')
const KikoAnswerService = require('./services/kiko-answer-service')
const KikoFormSession = require('./models/kiko-form-session')
const sessionsCollectionName = 'kiko-form-sessions'

/**
 *
 *
 * @param {*} options
 */
async function runDatePickerDialog (options) {
  const { endpointBaseUrl, conversationId, metadata, formSessionData, userMessages, kikoFormSession } = options
  if (!metadata.parameters) { throw createError(400, 'Missing parameters in metadata.') }

  const newFormSessionData = formSessionData ? Object.assign({}, formSessionData) : { metadata: metadata }
  const kikoBotService = new KikoAnswerService({ endpointBaseUrl, conversationId })
  const lastParameterPos = formSessionData ? formSessionData.lastParameterPos : null
  const lastParameter = lastParameterPos !== null ? metadata.parameters[lastParameterPos] : null

  if (lastParameter) {
    // validate and save form field input data if necessary
    const fieldInputContent = userMessages[0].data ? userMessages[0].data.content : undefined
    newFormSessionData.content = newFormSessionData.content ? newFormSessionData.content : {}
    newFormSessionData.content[lastParameter.name] = fieldInputContent
  }

  const pos = (lastParameterPos === null ? 0 : lastParameterPos + 1)
  const parameter = metadata.parameters[pos] ? metadata.parameters[pos] : null

  // ---
  if (parameter === null) {
    // ... ready
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
    // next field ... question
    newFormSessionData.lastParameterPos = pos
    // save session data
    await kikoFormSession.saveData(conversationId, newFormSessionData)
    // output the next form field question to the chat
    let questionMessages = parameter.question
    if (parameter.dataType === '@sys.date') {
      // custom datepicker handling ---
      const dateElementId = 'mydatepicker'
      const selectedDate = '14.2.2021'
      questionMessages = [
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
    await kikoBotService.sendMessage(questionMessages, false)
      .catch((err) => { throw createError(500, 'sendMessage: ' + err.message) })
  }
}

/**
 * 
 *
 * @param {*} options
 */
async function getKikoAnswerForEcho (options) {
  const { endpointBaseUrl, conversationId, metadata } = options
  debug('getKikoAnswerForEcho() --------')
  const kikoBotService = new KikoAnswerService({ endpointBaseUrl, conversationId })

  const outputMessages = metadata.intent.output
  await kikoBotService.sendMessage(outputMessages, true)
    .catch((err) => { throw createError(500, 'sendMessage: ' + err.message) })
}

/**
 * Kiko subbot action router for import actions
 *
 * @param {*} req
 * @param {*} res
 */
async function postWebhookMessageSent (req, res) {
  debug('postWebhookMessageSent ==============')
  req.setTimeout(6 * 60 * 60 * 1000)

  const actionToFunctionMapping = {
    echo: getKikoAnswerForEcho,
    'date-picker-dialog': runDatePickerDialog
  }

  const conversationId = (req.body.conversationId || req.query.conversationId)
  const referer = req.get('referer') || req.query.referer
  if (!referer) throw createError(400, 'Missing referer.')
  const endpointBaseUrl = referer.replace(/\/\//g, 'https://')
  const customData = req.body.custom
  const userMessages = req.body.messages

  // ---
  let metadata = req.body.messages[0].metaData
  let formSessionData

  const kikoFormSession = new KikoFormSession(sessionsCollectionName)
  if (metadata) {
    // cleanup unauthorised existing old session data
    await kikoFormSession.removeData(conversationId)
  } else {
    formSessionData = await kikoFormSession.readData(conversationId)
    // debug('formSessionData:', formSessionData)
    if (!formSessionData) throw createError(400, 'Missing metadata or formSessionData.')
    metadata = formSessionData.metadata
    // wie are in a form session or error
    if (!metadata) { throw createError(400, 'Missing metadata.') }
  }

  const action = metadata.action
  debug('postWebhookMessageSent - action:', action)
  const myFunction = actionToFunctionMapping[action] || getKikoAnswerForEcho // default function
  await myFunction.call(this, { endpointBaseUrl, conversationId, customData, metadata, formSessionData, userMessages, kikoFormSession })
  res.status(200).json({ success: true })
}

module.exports = {
  postWebhookMessageSent
}
