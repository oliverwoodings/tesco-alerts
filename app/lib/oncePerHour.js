const cache = require('./cache')
const twilio = require('./twilio')
const log = require('./log')('once-per-day')

const ONE_HOUR = 1000 * 60 * 60

module.exports = async function oncePerHour (to, body) {
  const key = `last-sent:${to}`
  const lastSent = await cache.get(key)
  if (!lastSent || Date.now() - lastSent >= ONE_HOUR) {
    await twilio.send(to, body)
    await cache.set(key, Date.now())
  } else {
    log.info(`Skipping text to ${to}, already sent in the last 24 hours`)
  }
}

module.exports.invalidate = async function invalidate (to) {
  await cache.set(`last-sent:${to}`, null)
}
