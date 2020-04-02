const config = require('config')
const log = require('./lib/log')
const checkForSlots = require('./checkForSlots')

runAll()

async function runAll () {
  for (const tescoConfig of config.tesco) {
    try {
      log.info(`Checking for slots for ${tescoConfig.username}`)
      await checkForSlots(tescoConfig)
    } catch (e) {
      log.error(e)
    }
  }
}
