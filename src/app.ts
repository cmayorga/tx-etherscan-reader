global.fetch = require("node-fetch");
require('dotenv').config()
const fs = require('fs');
const Semaphore = require('posix-semaphore')

if (process.argv.length != 3) {
  console.warn("Usage: pm2 start dist/app.js -- [eth_address]");
  process.exit(0);
}
const state_file_path = './.state';
const pfx = 'shm_';
const address = process.argv[2];

//Creates an unique semaphore for this proccess address
const sem = new Semaphore(pfx + address, {strict:false, closeOnExit:true})
var localsem = false;
var startblock = 0;
var lastts = 0;

function run() {
    //Maximum 5 times by second to fits 1/5 sec Etherscan throttle limit
    setInterval(getTransactionsByAccount, 200); 
};

export function getTransactionsByAccount() {
  if (!localsem) { //Guarantee to finish and proccess request
    localsem = true;
    sem.acquire();//Guarantee exclusive access to state and output files
    try {
      if (fs.existsSync(state_file_path)) {
        const state: string = fs.readFileSync(state_file_path, { encoding: 'utf8', flag: 'r' });
        console.log(state);
        startblock = Number(state.split(" ")[0]);
        lastts = Number(state.split(" ")[1]);
      } else {
        fs.closeSync(fs.openSync(state_file_path, 'w'));
        fs.chmodSync(state_file_path, 0o644); //Allow only current user to write, group and others only to read
      }
    } catch(err) {
      console.error(err);
      process.exit(1);
    }
    
    //Only fetch from last block processed in previous executions as saced state
    fetch('http://'+process.env.ETHERSCAN_API_ENDPOINT +'.etherscan.io/api?module=account&action=txlist&address=' + address + '&startblock=' + startblock + '&endblock=999999999&sort=asc&apikey=YourApiKeyToken')
      .then(function (response) {
        return response.json();
      })
      .then(function (txjson) {
        //console.log(txjson);
        let newlastts = lastts;
        for (var tx of txjson.result) {
          //We filter txs by:
          //    from last timestamp > last state saved transaction one
          //    input to avoid contract creation and other not normal transactions
          //    only error-free transactions
          //    only transactions > 0 amount
          if (Number(tx.timeStamp) > lastts && tx.input === "0x" && tx.isError === "0" && Number(tx.value) > 0) {
            const txt = "MINT " + tx.value + " " + tx.from;
            console.log(txt);
            try {
              if (fs.existsSync(state_file_path)) {
                const state: string = fs.readFileSync(state_file_path, { encoding: 'utf8', flag: 'r' });
                console.log(state);
                startblock = Number(state.split(" ")[0]);
                lastts = Number(state.split(" ")[1]);
              }
              fs.appendFileSync('OUTPUT.txt', txt + "\n");
              newlastts = tx.timeStamp;
              startblock = tx.blockNumber;              
            } catch(err) {
              console.error(err);
              process.exit(1);
            }            
          }
        }
        try {
          fs.writeFileSync(state_file_path, startblock + " " + newlastts);
        } catch(err) {
          console.error(err)
          process.exit(1);
        }  
        sem.release(); //Unblock other process executions with same address parameter to continue
        localsem = false; //Unblock loop to continue        
      });
  }
}

function exitHandler(options, exitCode) {
  if (options.cleanup) console.log('clean');
  if (exitCode || exitCode === 0) console.log(exitCode);
  sem.close();
  if (options.exit) process.exit();
}

//Handle app closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

//Catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

//Catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

//Catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));

run();