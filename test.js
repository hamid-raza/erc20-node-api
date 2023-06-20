const { readdirSync } = require('fs')
const getDirectories = source =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

test();
async function test() {
  var wallets = getDirectories("/root/.bitcoin");
  wallets = wallets.filter(wallet => ["blocks", "chainstate", "database", "testnet3"].indexOf(wallet) == -1);
  console.log(wallets);  
console.log(wallets.indexOf("default") != -1); 
}