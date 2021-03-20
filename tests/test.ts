	
require('dotenv').config()
const Web3 = require('web3')
const EthereumTx = require('ethereumjs-tx').Transaction;
var expect = require('chai').expect;

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.ETHEREUM_RPC));
web3.eth.defaultAccount = process.env.WALLET_ADDRESS;


it('Send transaction and check if is appended to OUTPUT file', async function (done) {
  
  let nonce = await web3.eth.getTransactionCount(web3.eth.defaultAccount);
    
  let details = {
    "from": process.env.WALLET_ADDRESS,
    "to": process.env.TEST_DESTINATION_WALLET_ADDRESS,
    "value": await web3.utils.toHex(1000000000000000),
    "gas": 21000,
    "gasPrice": 60 * 1000000000,
    "nonce": nonce,
    "chainId": 3 // EIP 155 chainId - mainnet: 1, rinkeby: 4, ropsten - 3
  }

  console.log(details);
  //const transaction = new EthereumTx(details);
  //var hash = web3.utils.soliditySha3(details);
  //var sigObj = web3.eth.accounts.sign(hash, process.env.WALLET_PRIVATE_KEY); 

  const signPromise = await web3.eth.accounts.signTransaction(details, process.env.WALLET_PRIVATE_KEY).then((signedTx) => {
    // raw transaction string may be available in .raw or 
    // .rawTransaction depending on which signTransaction
    // function was called
    return new Promise(async resolve => {
      const sentTx = web3.eth.sendSignedTransaction(signedTx.raw || signedTx.rawTransaction);
      sentTx.on("receipt", receipt => {
        console.log("Tx Receipt:" + receipt);
        done();
      });
      sentTx.on("error", err => {
        console.log("Tx Error:" + err);
        done();
      });
    })
  }).catch((err) => {
    console.log("Error Fail:" + err);
    done();
  });
});