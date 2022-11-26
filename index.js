import cli from './cli.js'

// Declare the app
const app = {}

// Init function
app.init = async function () {
  cli.init()
}

// Self executing
app.init()
