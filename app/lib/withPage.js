const puppeteer = require('puppeteer')
const config = require('config')
const pTimeout = require('p-timeout')
const path = require('path')
const fs = require('fs-extra')
const log = require('./log')('with-page')

const SCREENSHOT_DIR = path.resolve(__dirname, '../../screenshots')

module.exports = function withPage (fn) {
  return async (...args) => {
    const browser = await puppeteer.launch(config.puppeteer.options)
    const page = await browser.newPage()
    try {
      const result = await pTimeout(fn(page, ...args), config.puppeteer.timeout)
      await browser.close()
      return result
    } catch (e) {
      try {
        await fs.mkdirp(SCREENSHOT_DIR)
        await page.screenshot({
          path: path.resolve(SCREENSHOT_DIR, new Date().toJSON() + '.png'),
          fullPage: true
        })
      } catch (e) {
        log.error('Unable to take screenshot:', e)
      }
      if (config.puppeteer.closeOnError) {
        await browser.close()
      }
      throw e
    }
  }
}
