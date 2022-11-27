#!/usr/bin/env node

import { createInterface } from 'readline'
import events from 'events'
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()
class _events extends events {}
const e = new _events()

// Instantiate the cli module object
const cli = {}
// Instantiate User state
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

//! only for test
e.on('test', function (str) {
  cli.responders.test(str)
})

//** Responders object */
cli.responders = {}
cli.output = ''

// Help
cli.responders.help = function (str) {
  const input = str.split(' ')
  const command = input[1]
  if (input[1] === undefined) {
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
  } else {
    if (command === 'exit') {
      console.log('write command exit to Exits application.')
    }
    if (command === 'logout') {
      console.log('write logout to Logout the current costumer')
    }
    if (command === 'login') {
      console.log(
        'write login [username] [password] to Login as the costumer, create if not exist.'
      )
    }
    if (command === 'deposit') {
      console.log(
        'write deposit [amount] to Deposits this amount to the logged in costumer'
      )
    }
    if (command === 'withdraw') {
      console.log(
        'write withdraw [amount] to Withdraws this amount to the logged in costumer'
      )
    }
    if (command === 'transfer') {
      console.log(
        'write transfer [target] [amount] to Transfers this amount to the logged in costumer to the target costumer'
      )
    }
  }
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
      include: {
        debt: true,
      },
    })
    if (user) {
      // found User
      const checkPassword = input[2] === user.password
      if (checkPassword) {
        userLoggedIn = user

        if (user.debt.length > 0) {
          cli.output = `Hallo ${userLoggedIn.name}! Your balance is $ ${
            Math.sign(userLoggedIn.balance) === -1 ? '0' : userLoggedIn.balance
          }, you owe ${user.debt[0].value} to ${user.debt[0].creditor}`
        } else {
          cli.output = `Hallo ${userLoggedIn.name}! Your balance is $ ${userLoggedIn.balance}`
        }
        console.log(cli.output)
      } else {
        console.log('Invalid Username or Password')
      }
    } else {
      // User not found and Create new User
      userLoggedIn = await prisma.user.create({
        data: {
          name: input[1],
          password: input[2],
        },
        include: {
          debt: true,
        },
      })
      cli.output = `Hallo ${userLoggedIn.name}! Your balance is $ ${userLoggedIn.balance}`
      console.log(cli.output)
    }
  }
  clearScreen()
}

cli.responders.deposit = async function (str) {
  const input = str.split(' ')
  const amount = Number(input[1])
  // Input Validation
  if (
    userLoggedIn.id === undefined ||
    input[1] === undefined ||
    isNaN(parseInt(input[1]))
  ) {
    // Print action errors
    if (userLoggedIn.id === undefined) {
      console.log('You need to login first')
    } else if (isNaN(parseInt(input[1]))) {
      console.log('Please input amount in number')
    } else {
      console.log('Amount is required')
    }
  } else {
    //* Automatically transfer deposit to pay the first debt if have debt
    if (userLoggedIn.debt[0]) {
      const target = await prisma.user.findUnique({
        where: {
          name: userLoggedIn.debt[0].creditor,
        },
      })
      const debtValue = userLoggedIn.debt[0].value
      //* if deposite more than enought to pay debt save the return
      if (amount - userLoggedIn.debt[0].value > 0) {
        const oldDebt = userLoggedIn.debt[0].value
        // increase target balance
        await prisma.user.update({
          where: {
            id: target.id,
          },
          data: {
            balance: target.balance + debtValue,
          },
        })

        // delete debt
        await prisma.debt.delete({
          where: {
            id: userLoggedIn.debt[0].id,
          },
        })

        // increase user balance added from return value and delete debt
        const user = await prisma.user.update({
          where: {
            id: userLoggedIn.id,
          },
          data: {
            balance: userLoggedIn.balance + amount - debtValue,
          },
          include: { debt: true },
        })

        userLoggedIn = user
        console.log(
          `Transferred $${oldDebt} to ${target.name}, your balance is $${userLoggedIn.balance}`
        )
      } else {
        //* if deposite not enought to pay debt
        // increase target balance
        await prisma.user.update({
          where: {
            id: target.id,
          },
          data: {
            balance: target.balance + amount,
          },
        })

        // reduce debt value
        const updateDebt = await prisma.debt.update({
          where: {
            id: userLoggedIn.debt[0].id,
          },
          data: {
            value: debtValue - amount,
          },
        })

        userLoggedIn.debt[0] = updateDebt

        console.log(
          `Transferred ${amount} to ${
            target.name
          }, your balance is $${0}, you owe ${debtValue - amount} to ${
            target.name
          }`
        )
      }
    } else {
      //* user doesnt have debt
      const user = await prisma.user.update({
        where: {
          id: userLoggedIn.id,
        },
        data: {
          balance: userLoggedIn.balance + amount,
        },
      })
      userLoggedIn = user
      console.log(`Your balance is $${userLoggedIn.balance}`)
    }
  }
  clearScreen()
}

cli.responders.withdraw = async function (str) {
  const input = str.split(' ')
  const amount = Number(input[1])
  // Input Validation
  if (
    input[1] === undefined ||
    userLoggedIn.id === undefined ||
    isNaN(parseInt(input[1])) ||
    Math.sign(userLoggedIn.balance - amount) === -1
  ) {
    // Print action errors
    if (userLoggedIn.id === undefined) {
      console.log('You need to login first')
    } else if (isNaN(parseInt(input[1]))) {
      console.log('Please input amount in number')
    } else if (Math.sign(userLoggedIn.balance - amount) === -1) {
      console.log('Please reduce amount, amount exceeded the balance')
    } else {
      console.log('Amount is required')
    }
  } else {
    userLoggedIn = await prisma.user.update({
      where: {
        id: userLoggedIn.id,
      },
      data: {
        balance: userLoggedIn.balance - amount,
      },
    })
    console.log(`Withdraw success, your balance is $${userLoggedIn.balance}`)
  }
  clearScreen()
}

cli.responders.transfer = async function (str) {
  const input = str.split(' ')
  const targetName = input[1]
  const amount = Number(input[2])
  // Input Validation
  if (
    userLoggedIn.id === undefined ||
    input[1] === undefined ||
    input[2] === undefined ||
    isNaN(parseInt(input[2]))
  ) {
    // Print action errors
    if (userLoggedIn.id === undefined) {
      console.log('You need to login first')
    } else if (input[1] === undefined) {
      console.log('Please Target is required')
    } else if (isNaN(parseInt(input[2]))) {
      console.log('Please input amount in number')
    } else {
      console.log('Amount is required')
    }
  } else {
    // get target data
    const target = await prisma.user.findUnique({
      where: {
        name: targetName,
      },
    })
    // check if target is on database
    if (target === null) {
      console.log('Trarget is not registered')
    } else {
      //** user balance is not enough will generate debt */
      if (Math.sign(userLoggedIn.balance - amount) === -1) {
        const debtValue = Math.abs(userLoggedIn.balance - amount)

        // increase target balance and generate creditor
        await prisma.user.update({
          where: {
            id: target.id,
          },
          data: {
            balance: target.balance + amount,
          },
        })

        // Decrease user balance and generate debt
        const user = await prisma.user.update({
          where: {
            id: userLoggedIn.id,
          },
          data: {
            balance: 0,
            debt: {
              create: {
                isPaid: false,
                debtor: userLoggedIn.name,
                value: debtValue,
                creditor: targetName,
              },
            },
          },
          include: { debt: true },
        })

        userLoggedIn = user
        console.log(
          `Transferred ${amount} to ${targetName}, your balance is $ 0, Owed ${debtValue} to ${targetName}`
        )
      } else {
        //** user balance is enough, doesn't generate debt */

        // increase target balance
        prisma.user.update({
          where: {
            id: target.id,
          },
          data: {
            balance: target.balance + amount,
          },
        })

        // Decrease user balance
        const updateUser = await prisma.user.update({
          where: {
            id: userLoggedIn.id,
          },
          data: {
            balance: userLoggedIn.balance - amount,
          },
          include: { debt: true },
        })

        // update user
        userLoggedIn = updateUser
        // print output
        console.log(
          `Transferred ${amount} to ${targetName}, your balance is $${userLoggedIn.balance}`
        )
      }
    }
  }
  clearScreen()
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
//! only for test
cli.responders.test = async function (str) {
  const input = str.split(' ')
  await prisma.user.delete({
    where: {
      name: input[1],
    },
  })
  clearScreen()
}

const clearScreen = () => {
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
