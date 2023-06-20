const { readdirSync } = require('fs')
const config = require('../config');

const getDirectories = source =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

const checkIfExist = wallet_name => {
  var wallets = getDirectories(config.daemons.btc.path);
  wallets = wallets.filter(wallet => ["blocks", "chainstate", "database", "testnet3"].indexOf(wallet) == -1);

  return wallets.indexOf(wallet_name) != -1;
}

module.exports = {
    getDirectories,
    checkIfExist,
}