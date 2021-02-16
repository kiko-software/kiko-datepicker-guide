const Firestore = require('@google-cloud/firestore')
const createError = require('http-errors')
const debug = require('debug')('date-guide:debug')
const db = new Firestore()

class KikoFormSession {
  /**
   * Constructor for Bot object
   * To be used in with WebhookClient class
   *
   * @param {Object} agent instance of WebhookClient class
   */
  constructor (sessionsCollectionName) {
    this.sessionsCollectionName = sessionsCollectionName
    return this
  }

  /**
   *
   *
   * @param {*} options
   */
  async saveData (conversationId, payload) {
    const sessionRef = db.collection(this.sessionsCollectionName).doc(conversationId)
    debug('saveData - formSessionData:', payload)
    const res = await sessionRef.set(payload).catch(error => {
      throw createError(500, 'saveData - ' + error.message)
    })
    await res
  }

  /**
   *
   *
   * @param {*} options
   */
  async readData (conversationId) {
    const sessionRef = db.collection(this.sessionsCollectionName).doc(conversationId)
    const doc = await sessionRef.get().catch(error => {
      throw createError(500, 'readData - ' + error.message)
    })
    return doc.exists ? doc.data() : undefined
  }

  /**
   *
   *
   * @param {*} options
   */
  async removeData (conversationId) {
    debug('sessionsCollectionName, conversationId:', this.sessionsCollectionName, conversationId)
    const res = await db.collection(this.sessionsCollectionName).doc(conversationId).delete().catch(error => {
      throw createError(500, 'removeData - ' + error.message)
    })
    return res
  }
}

module.exports = KikoFormSession
