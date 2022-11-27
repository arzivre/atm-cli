/*
 * Unit Tests
 *
 */

import cli from '../cli.js'
import assert from 'assert'

// Holder for Tests
let unit = {}

// Assert that the getANumber function is returning a number
unit['cli login should return a Hallo [username]! Your balance is $ [amount]'] =
  function (done) {
    ;async () => {
      await cli.responders.login('login sony 1234qwer')
    }
    assert.equal(cli.output, 'Hallo sony! Your balance is $ 1000')
    done()
  }

unit['cli login should return a fail test'] = function (done) {
  ;async () => {
    await cli.responders.login('login sony 1234qwer')
  }
  assert.equal(cli.output, 'Hallo sony!')
  done()
}
  
export default unit
