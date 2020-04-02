const cache = require('./cache')
const twilio = require('./twilio')
const log = require('./log')('once-per-day')

const ONE_DAY = 1000 * 60 * 60 * 24

module.exports = async function oncePerDay (to, body) {
  const key = `last-sent:${to}`
  const lastSent = await cache.get(key)
  if (!lastSent || Date.now() - lastSent >= ONE_DAY) {
    await twilio.send(to, body)
    await cache.set(key, Date.now())
  } else {
    log.info(`Skipping text to ${to}, already sent in the last 24 hours`)
  }
}
