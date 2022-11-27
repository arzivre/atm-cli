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

//! Delete later
e.on('test', function (str) {
  cli.responders.test(str)
})

//** Responders object */
cli.responders = {}
cli.output = ''

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
      include: {
        debt: true,
        creditor: true,
      },
    })
    if (user) {
      // found User
      const checkPassword = input[2] === user.password
      if (checkPassword) {
        userLoggedIn = user
        userLoggedIn.totaldebt = user.debt.reduce(
          (acc, data) => acc + parseInt(data.value),
          0
        )
        userLoggedIn.totalcreditor = user.creditor.reduce(
          (acc, data) => acc + parseInt(data.value),
          0
        )
        // total balance
        userLoggedIn.balance =
          user.balance + userLoggedIn.totalcreditor - userLoggedIn.totaldebt

        cli.output = `Hallo ${userLoggedIn.name}! Your balance is $ ${
          Math.sign(userLoggedIn.balance) === -1 ? '0' : userLoggedIn.balance
        }, you owe ${user.debt[0].value} to ${user.debt[0].creditor}`
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
      })
      cli.output = `Hallo ${userLoggedIn.name}! Your balance is $ ${userLoggedIn.balance}`
      console.log(cli.output)
    }
  }
  clearScreen()
}

cli.responders.deposit = async function (str) {
  const input = str.split(' ')
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
    if (userLoggedIn.totaldebt > 0) {
      const target = await prisma.user.findUnique({
        where: {
          name: userLoggedIn.debt[1].creditor,
        },
      })

      //* if deposite more than enought to pay debt save the return
      if (input[1] - userLoggedIn.debt[0].value > 0) {
        // increase user balance added from return value
        userLoggedIn = await prisma.user.update({
          where: {
            id: userLoggedIn.id,
          },
          data: {
            balance: Number(input[1]) - Number(userLoggedIn.debt[0].value),
          },
        })

        // increase target balance
        await prisma.user.update({
          where: {
            id: target.id,
          },
          data: {
            balance: target.balance + Number(userLoggedIn.debt[0].value),
            creditor: {
              update: {
                where: {
                  debtor: userLoggedIn.name,
                },
                data: {
                  isPaid: true,
                },
              },
            },
          },
        })
        // delete user debt
        await prisma.creditor.delete({
          where: {
            id: userLoggedIn.debt[0].id,
          },
        })

        console.log(
          `Transferred to ${target.name}, your balance is $${userLoggedIn.balance}`
        )
      } else {
        // increase target balance
        await prisma.user.update({
          where: {
            id: target.id,
          },
          data: {
            balance:
              Number(target.balance) + Number(userLoggedIn.debt[0].value),
            creditor: {
              update: {
                where: {
                  debtor: userLoggedIn.name,
                },
                data: {
                  value: Number(userLoggedIn.debt[0].value) - Number(input[1]),
                },
              },
            },
          },
        })
        console.log(
          `Transferred to ${target.name}, your balance is $${
            userLoggedIn.balance
          }, you owe ${userLoggedIn.debt[0].value - Number(input[1])} to ${
            target.name
          }`
        )
      }
    } else {
      //* user doesnt have debt
      userLoggedIn = await prisma.user.update({
        where: {
          id: userLoggedIn.id,
        },
        data: {
          balance: userLoggedIn.balance + Number(input[1]),
        },
      })
      console.log(`Your balance is $${userLoggedIn.balance}`)
    }
  }
  clearScreen()
}

cli.responders.withdraw = async function (str) {
  const input = str.split(' ')
  // Input Validation
  if (
    input[1] === undefined ||
    userLoggedIn.id === undefined ||
    isNaN(parseInt(input[1])) ||
    Math.sign(userLoggedIn.balance - Number(input[1])) === -1
  ) {
    // Print action errors
    if (userLoggedIn.id === undefined) {
      console.log('You need to login first')
    } else if (isNaN(parseInt(input[1]))) {
      console.log('Please input amount in number')
    } else if (Math.sign(userLoggedIn.balance - Number(input[1])) === -1) {
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
        balance: userLoggedIn.balance - Number(input[1]),
      },
    })
    console.log(`Withdraw success, your balance is $${userLoggedIn.balance}`)
  }
  clearScreen()
}

cli.responders.transfer = async function (str) {
  const input = str.split(' ')

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
        name: input[1],
      },
    })
    // check if target is on database
    if (target === null) {
      console.log('Trarget is not registered')
    } else {
      //** user balance is not enough will generate debt */
      if (Math.sign(userLoggedIn.balance - Number(input[2])) === -1) {
        const debtValue = Math.abs(userLoggedIn.balance - Number(input[2]))
        // get target data
        // Decrease user balance and generate debt
        const updateUser = prisma.user.update({
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
                creditor: target.name,
              },
            },
          },
          include: { debt: true, creditor: true },
        })

        // increase target balance and generate creditor
        const updateTarget = prisma.user.update({
          where: {
            id: target.id,
          },
          data: {
            balance: userLoggedIn.balance + Number(input[2]),
            creditor: {
              create: {
                isPaid: false,
                debtor: userLoggedIn.name,
                value: debtValue,
                creditor: target.name,
              },
            },
          },
          include: { debt: true, creditor: true },
        })

        // if there is any fail transaction, will cancel all transaction
        await prisma.$transaction([updateUser, updateTarget])

        console.log(
          `Transferred ${input[2]} to ${input[1]}, your balance is $ 0, Owed ${debtValue} to ${input[1]}`
        )
      } else {
        //** user balance is enough, doesn't generate debt */

        // Decrease user balance
        const updateUser = prisma.user.update({
          where: {
            id: userLoggedIn.id,
          },
          data: {
            balance: userLoggedIn.balance - Number(input[2]),
          },
        })

        // increase target balance
        const updateTarget = prisma.user.update({
          where: {
            id: target.id,
          },
          data: {
            balance: userLoggedIn.balance + Number(input[2]),
          },
        })

        // if there is any fail transaction, will cancel all transaction
        await prisma.$transaction([updateUser, updateTarget])
        // update user balance
        userLoggedIn.balance = userLoggedIn.balance - Number(input[2])
        // print output
        console.log(
          `Transferred ${input[2]} to ${input[1]}, your balance is $${userLoggedIn.balance}`
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
//! Delete later
cli.responders.test = async function (str) {
  const input = str.split(' ')
  const debtValue = Math.abs(userLoggedIn.balance - Number(input[1]))
  console.log(debtValue)
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
