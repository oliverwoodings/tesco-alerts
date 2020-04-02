const config = require('config')
const { CronJob } = require('cron')
const log = require('./lib/log')
const sentry = require('./lib/sentry')
const checkForSlots = require('./checkForSlots')

log.info(`Running on schedule: ${config.schedule}`)
new CronJob(config.schedule, runAll, null, true, null, null, config.runOnStart)

async function runAll () {
  for (const tescoConfig of config.tesco) {
    try {
      log.info(`Checking for slots for ${tescoConfig.username}`)
      await checkForSlots(tescoConfig)
    } catch (e) {
      log.error(e)
      sentry.captureException(e)
    }
  }
}
