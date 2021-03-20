# Transaction reader from Etherscan API

Proof of concept to read and save incoming transactions for a given address

posix-semaphore is used to allow concurrent executions doing the same job for the same address, notice that you will have to use apikeys to avoid 1/5sec etherscan non-apikey restriction if you want to use several executions with same address input parameter.

pm2 is used to auto-recover from application crashes

For recover from server crashes and/or reboots configure cron daemon as follow:

crontab -e
add next line:
@reboot cd [path/to/project]; pm2 start dist/app.js -- [eth_address]
ctrl+x to exit cron and save changes

## Install

git clone https://github.com/cmayorga/tx-etherscan-reader.git
cd tx-reader-etherscan
npm install

cp .env.development .env  (For Ropsten network)
cp .env.production .env (For Mainnet netowrk)
configure .env constants properly

npm run build

Note: for running test you should to provide a valid ethereum address and its private key to make an automatic transaction of 0.001 ETH, and configure a node or gateway provider

For Ropsten you can send to yourself paper ETHs from https://faucet.dimensions.network/

## How to use

pm2 start dist/app.js -- [eth_address_to_read_transactions]

## Runnig test

Method 1)
tail -f OUTPUT.txt to observe file changes
You can use Metamask or any other Wallet to send a transaction to address being listened

Method 2)
You need to configure address and private key to send a signed transaction
Run the app as above step, you should to use TEST_DESTINATION_WALLET_ADDRESS at .env file as parameter to listen for transactions
Run the test "npm run test"
