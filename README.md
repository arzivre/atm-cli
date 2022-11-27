# ATM CLI

Install dependencies with   npm

```bash
  npm i
```

Start the CLI

```bash
  npm start
  // or
  node index.js
```


## Environment Variables

No need  to change .env since we use **sqlite** as database to run this project

`DATABASE_URL`

## Command

Commands:

    help [command...]             Provides help for a given command.
    exit                          Exits application.
    login [username] [password]   Login as the costumer, create if not exist.   
    deposit [amount]              Deposits this amount to the logged in costumer
    transfer [target] [amount]    Transfers this amount to the logged in costumer to the target costumer
    withdraw [amount]             Withdraws this amount to the logged in costumer
    logout                        Logout the current costumer