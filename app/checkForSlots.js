const config = require('config')
const withPage = require('./lib/withPage')
const log = require('./lib/log')
const oncePerHour = require('./lib/oncePerHour')

module.exports = withPage(checkForSlots)

async function checkForSlots (page, tescoConfig) {
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.0 Safari/537.36'
  )

  log.info('Opening up groceries page')
  await page.goto('https://www.tesco.com/groceries/en-GB/')

  log.info('Going to sign in screen')
  await page.waitFor('.signin-register--signin-button', { visible: true })
  await page.click('.signin-register--signin-button')
  await page.waitForNavigation()

  log.info('Entering creds and signing in')
  await page.type('#username', tescoConfig.username)
  await page.type('#password', tescoConfig.password)
  await page.click('#sign-in-form button.ui-component__button')
  await page.waitFor('span[data-auto="user-greeting--message"]', {
    visible: true
  })

  log.info('Going to orders page')
  await page.goto('https://www.tesco.com/groceries/en-GB/orders')
  if (await exists('.my-orders.no-results')) {
    log.info('No pending orders')
  } else {
    const pendingOrders = await count(
      '.orders-list[data-auto="pending-order-list"] li'
    )

    log.info(`Pending orders: ${pendingOrders}`)
    if (pendingOrders >= 2) {
      log.warn(
        "Tesco won't let you book more than 2 orders in advance, aborting"
      )
      return
    }
  }

  let summary = []
  let hasSlots = false

  for (const type of ['delivery', 'collection']) {
    log.info(`Checking for ${type} slots`)
    await page.goto(`https://www.tesco.com/groceries/en-GB/slots/${type}`)

    await page.waitFor('#slot-matrix .tabs')
    const tabLinks = await page.$$eval(
      '#slot-matrix .tabs .tabs-header-container li a',
      tabs => tabs.map(tab => tab.getAttribute('href'))
    )

    const availableRanges = []
    for (const tabLink of tabLinks) {
      log.info(`Checking tab ${tabLink}`)
      await page.goto('https://www.tesco.com' + tabLink)
      await page.waitFor('.slot-list', { visible: true })
      const tabText = await getText('.slot-selector--week-tabheader.active')

      const noneAvailable = await exists('.slot-list--none-available')
      if (!noneAvailable) {
        await page.simpleScreenshot(
          `${tescoConfig.username}-${type}-${tabText}`
        )
        availableRanges.push(tabText)
      }
    }

    if (availableRanges.length) {
      hasSlots = true
      summary.push(
        `There are slots available for ${type} on ${availableRanges.join(
          ' and '
        )}`
      )
    } else {
      summary.push(`There are no slots available on any dates for ${type}`)
    }
  }

  log.info(summary.join('. '))
  for (const to of tescoConfig.phoneNumbers) {
    if (hasSlots || config.alwaysSendTexts) {
      await oncePerHour(to, `${tescoConfig.username} - ${summary.join('. ')}`)
    } else {
      await oncePerHour.invalidate(to)
    }
  }

  function count (sel) {
    return page.$$eval(sel, els => els.length)
  }

  async function exists (sel) {
    return (await count(sel)) > 0
  }

  async function getText (sel) {
    await page.waitFor(sel, { visible: true })
    const element = await page.$(sel)
    if (!element) {
      throw new Error(`Cannot find element for selector '${sel}'`)
    }
    const text = await page.evaluate(element => element.textContent, element)
    return text.trim()
  }
}
