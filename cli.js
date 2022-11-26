#!/usr/bin/env node

import { createInterface } from 'readline'
import { debuglog } from 'util'
import events from 'events'
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()
const debug = debuglog('cli')
class _events extends events {}
const e = new _events()

// Instantiate the cli module object
const cli = {}

let userLoggedIn = {}

// Input handlers
e.on('help', function (str) {
  cli.responders.help(str)
})

e.on('login', function (str) {
  cli.responders.login(str)
})

e.on('deposit', function (str) {
  cli.responders.deposit(str)
})

e.on('withdraw', function (str) {
  cli.responders.withdraw(str)
})

e.on('transfer', function (str) {
  cli.responders.transfer(str)
})

e.on('logout', function (str) {
  cli.responders.logout(str)
})

e.on('exit', function (str) {
  cli.responders.exit(str)
})

//! Delete later
e.on('test', function (str) {
  cli.responders.test(str)
})

//** Responders object */
cli.responders = {}

// Help
cli.responders.help = function (str) {
  console.log(`
  Commands:

    help [command...]             Provides help for a given command.
    exit                          Exits application.
    login [username] [password]   Login as the costumer, create if not exist.   
    deposit [amount]              Deposits this amount to the logged in costumer
    transfer [target] [amount]    Transfers this amount to the logged in costumer to the target costumer
    withdraw [amount]             Withdraws this amount to the logged in costumer
    logout                        Logout the current costumer
`)
  clearScreen()
}

cli.responders.login = async function (str) {
  const input = str.split(' ')
  // Input Validation
  if (input[1] === undefined || input[2] === undefined) {
    console.log('username and password is required')
  } else {
    const user = await prisma.user.findUnique({
      where: {
        name: input[1],
      },
    })

    if (user) {
      // found User
      userLoggedIn = user
      const checkPassword = input[2] === user.password
      if (checkPassword) {
        console.log(`Hallo ${user.name}! Your balance is $ ${user.balance}`)
      } else {
        console.log('Invalid Username or Password')
      }
    } else {
      // User not found and Create new User
      const createdUser = await prisma.user.create({
        data: {
          name: input[1],
          password: input[2],
        },
      })
      userLoggedIn = createdUser
      console.log(
        `Hallo ${userLoggedIn.name}! Your balance is $ ${userLoggedIn.balance}`
      )
    }
  }
  clearScreen()
}

cli.responders.deposit = async function (str) {
  const input = str.split(' ')
  // Input Validation
  if (
    input[1] === undefined ||
    userLoggedIn.id === undefined ||
    isNaN(parseInt(input[1]))
  ) {
    if (userLoggedIn.id === undefined) {
      console.log('You need to login first')
    } else if (isNaN(parseInt(input[1]))) {
      console.log('Please input amount in number')
    } else {
      console.log('Amount is required')
    }
  } else {
    const user = await prisma.user.update({
      where: {
        id: userLoggedIn.id,
      },
      data: {
        balance: userLoggedIn.balance + Number(input[1]),
      },
    })
    userLoggedIn = user
    console.log(`Your balance is $${userLoggedIn.balance}`)
  }
  clearScreen()
}

cli.responders.withdraw = function () {
  console.log('You asked for withdraw')
}

cli.responders.transfer = function () {
  console.log('You asked for transfer')
}

cli.responders.logout = function () {
  console.log(`Goodbye! ${userLoggedIn.name}`)
  userLoggedIn = {}
  clearScreen()
}

// Exit
cli.responders.exit = function () {
  console.log('exit')
  process.exit(0)
}

cli.responders.test = async function (str) {
  const input = str.split(' ')
  clearScreen()
}

const clearScreen = function () {
  process.stdout.write('ATM->')
}

// Input processor
cli.processInput = function (str) {
  str = typeof str == 'string' && str.trim().length > 0 ? str.trim() : false
  // Only process the input if the user actually wrote something, otherwise ignore it
  if (str) {
    // Codify the unique strings that identify the different unique questions allowed be the asked
    const uniqueInputs = [
      'help',
      'login',
      'deposit',
      'withdraw',
      'transfer',
      'logout',
      'exit',
      'test',
    ]

    // Go through the possible inputs, emit event when a match is found
    let matchFound = false
    let counter = 0
    uniqueInputs.some(function (input) {
      if (str.toLowerCase().indexOf(input) > -1) {
        matchFound = true
        // Emit event matching the unique input, and include the full string given
        e.emit(input, str)
        return true
      }
    })

    // If no match is found, tell the user to try again
    if (!matchFound) {
      console.log(`Sorry, try again`)
    }
  }
}

// Init script
cli.init = function () {
  // Send to console, in dark blue
  console.log('\x1b[34m%s\x1b[0m', 'The CLI is running')

  // Start the interface
  const _interface = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'ATM->',
  })

  // Create an initial prompt
  _interface.prompt()

  // Handle each line of input separately
  _interface.on('line', function (str) {
    // Send to the input processor
    cli.processInput(str)

    // Re-initialize the prompt afterwards
    _interface.prompt()
  })

  // If the user stops the CLI, kill the associated process
  _interface.on('close', function () {
    process.exit(0)
  })
}

// Export the module
export default cli
