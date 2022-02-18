const bitcoin_rpc = require('./Bitcoin');
const ethereum_rpc = require('./Ethereum/eth');
const erc20_rpc = require('./Ethereum/token');

const rpc = {
    ...bitcoin_rpc,
    ...ethereum_rpc,
    ...erc20_rpc
}

module.exports = rpc;