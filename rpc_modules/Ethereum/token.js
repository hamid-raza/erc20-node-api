const config = require('../../config');
const axios = require('axios');

const Web3 = require("web3");
const ethUtil = require("ethereumjs-util");
const ethereum_address = require("ethereum-address");
const InputDataDecoder = require("ethereum-input-data-decoder");
const { getEtherscanApiUrl } = require("../../controllers/Ethereum/global");

var web3 = new Web3(new Web3.providers.HttpProvider(config.daemons.eth.provider));
var abi = require("human-standard-token-abi");
const decoder = new InputDataDecoder(abi);

function getTransaction(hash) {
    return new Promise(function (resolve, reject) {
        try {
            web3.eth.getTransaction(hash, async function (err, transaction) {
                if (transaction !== undefined) {
                    let inputdecode = await decoder.decodeData(transaction.input);
                    var confirmation = (await web3.eth.getBlockNumber()) - transaction.blockNumber;
                    let time = await web3.eth.getBlock(transaction.blockNumber);
                    let info = await getTokenInfo(transaction.to);
                    let decimals = parseInt(inputdecode.inputs[1].toString()) / 10 ** info.decimals;

                    var ResponseData = {
                        name: info.name,
                        symbol: info.symbol,
                        decimal: info.decimals,
                        from: transaction.from,
                        to: transaction.toAddress,
                        value: decimals,
                        gas_price: transaction.gasPrice,
                        hash: transaction.hash,
                        confirmations: confirmation,
                        timestamp: time.timestamp,
                    };
                    resolve(ResponseData);
                } else {
                    reject("Invalid Hash or contract address");
                }
            });
        } catch (e) {
            reject(e);
        }
    });
}
  
function getTokenInfo(contractAddress) {
    return new Promise(async function (resolve, reject) {
        try {
            const contractInstance = await new web3.eth.Contract( abi, contractAddress);
    
            const name = await contractInstance.methods.name().call();
            const symbol = await contractInstance.methods.symbol().call();
            const decimals = await contractInstance.methods.decimals().call();
            var ResponseData = {
                name: name,
                symbol: symbol,
                decimals: decimals,
            };
            resolve(ResponseData);
        } catch (e) {
            reject(e);
        }
    });
}

function isString(s) {
    return (typeof s === 'string' || s instanceof String)
}
  
function toBaseUnit(value, decimals, BN) {
    if (!isString(value)) {
        throw new Error('Pass strings to prevent floating point precision issues.')
    }
    const ten = new BN(10);
    const base = ten.pow(new BN(decimals));
  
    // Is it negative?
    let negative = (value.substring(0, 1) === '-');
    if (negative) {
        value = value.substring(1);
    }
  
    if (value === '.') {
        throw new Error(
            `Invalid value ${value} cannot be converted to` +
            ` base unit with ${decimals} decimals.`);
    }
  
    // Split it into a whole and fractional part
    let comps = value.split('.');
    if (comps.length > 2) {
        throw new Error('Too many decimal points');
    }
  
    let whole = comps[0],
      fraction = comps[1];
  
    if (!whole) whole = '0';
    if (!fraction) fraction = '0';
    if (fraction.length > decimals) {
      throw new Error('Too many decimal places');
    }
  
    while (fraction.length < decimals) {
      fraction += '0';
    }
  
    whole = new BN(whole);
    fraction = new BN(fraction);
    let wei = (whole.mul(base)).add(fraction);
  
    if (negative) {
      wei = wei.neg();
    }
  
    return new BN(wei.toString(10), 10);
}
  

// var contractAddress = "0xdac17f958d2ee523a2206206994597c13d831ec7"; // Tether USD
const erc20_rpc = {
    token_getInfo: async function(args, callback) {
        if(args.length == 0) {
            callback({
                code: 400, 
                message: "Missing params. ('params': ['contract_address'])"
            });
            return;
        }

        let contractAddress = args[0];
        if (!ethereum_address.isAddress(contractAddress)) {
            callback({
                code: 400, 
                message: "Invalid contract addresses"
            });
            return;
        }

        try {
            const instance = await new web3.eth.Contract(abi, contractAddress);
            const name = await instance.methods.name().call();
            const symbol = await instance.methods.symbol().call();
            const decimals = await instance.methods.decimals().call();
            const totalSupply = await instance.methods.totalSupply().call();
            
            callback(null, {
                contractAddress: contractAddress,
                name: name,
                symbol: symbol,
                decimals: parseInt(decimals),
                totalSupply: totalSupply / 10 ** decimals,
            });
        } catch (e) {
            callback({
                code: 400, 
                message: "Invalid contract addresses"
            });
        }
    },

    token_getBalance: async function(args, callback) {
        if(args.length < 2) {
            callback({
                code: 400, 
                message: "Missing params. ('params': ['address', 'contract_address'])"
            });
            return;
        }

        let walletAddress = args[0];
        let contractAddress = args[1];
        if ( !ethereum_address.isAddress(walletAddress) || !ethereum_address.isAddress(contractAddress)) {
            callback({
                code: 400, 
                message: "Invalid addresses"
            });
            return;
        }

        try {
            const instance = await new web3.eth.Contract(abi, contractAddress);
            var balance = await instance.methods.balanceOf(walletAddress).call();
            let info = await getTokenInfo(contractAddress);

            balance = balance / 10 ** info.decimals;
            callback(null, balance);
        } catch (e) {
            callback({
                code: 400, 
                message: "invalid contract address"
            });
        }
    },

    token_transfer: async function(args, callback) {
        if(args.length < 5) {
            callback({
                code: 400, 
                message: "Missing params. ('params': ['from_address', 'from_private_key', 'to_address', amount, 'contract_address', 'gas_limit(optional)'])"
            });
            return;
        }

        let fromAddress = args[0];
        let privateKey = args[1];
        let toAddress = args[2];
        let tokenValue = args[3];
        let contractAddress = args[4];

        if (!privateKey.startsWith('0x')) privateKey = '0x' + privateKey;
        let bufferedKey = ethUtil.toBuffer(privateKey);

        if ( !ethereum_address.isAddress(fromAddress) || !ethereum_address.isAddress(toAddress) || !ethereum_address.isAddress(contractAddress)) {
            callback({
                code: 400, 
                message: "Invalid addresses"
            });
            return;
        }

        if(!ethUtil.isValidPrivate(bufferedKey)) {
            callback({
                code: 400, 
                message: "Invalid private key"
            });
            return;
        }

        if(isNaN(tokenValue) || parseFloat(tokenValue) <= 0) {
            callback({
                code: 400, 
                message: "Invalid amount"
            });
            return;
        }

        try {
            const contract = await new web3.eth.Contract(abi, contractAddress);

            let decimals = await contract.methods.decimals().call();
            decimals = await web3.utils.toBN(decimals);


            web3.eth.defaultAccount = fromAddress;
            let count = await web3.eth.getTransactionCount(fromAddress);

            let gasPrice = await web3.eth.getGasPrice();
            console.log("gas price : ", gasPrice)

            let gasLimit = (args.length > 5 && !isNaN(args[5])) ? args[5] : 900000;

            let balance = await web3.eth.getBalance(fromAddress);
            let weiBalance = web3.utils.fromWei(balance, "ether");

            let txFee = gasPrice * gasLimit/1e18;
            console.log(`ether fee: ${txFee}, balance: ${weiBalance}`);
            if(weiBalance < txFee) {
                callback({
                    code: 400, 
                    message: `Insufficient balance. transaction fee is ${weiBalance} ETH.`,
                });
                return;
            }

            balance = await contract.methods.balanceOf(fromAddress).call();
            balance = balance / 10 ** decimals;
            if(balance < tokenValue) {
                callback({
                    code: 400, 
                    message: `Insufficient balance. token balance is ${balance}.`,
                });
                return;
            }

            tokenAmount = toBaseUnit(tokenValue.toString(), decimals, web3.utils.BN);
            let transactionObject = {
                nonce: web3.utils.toHex(count),
                from: fromAddress,
                gasPrice: web3.utils.toHex(gasPrice),
                gasLimit: web3.utils.toHex(gasLimit),
                to: contractAddress,
                value: 0x0,
                data: contract.methods.transfer(toAddress, tokenAmount).encodeABI(),
                chainId: config.daemons.eth.chainId,
            };

            web3.eth.accounts
                .signTransaction(transactionObject, privateKey)
                .then((signedTx) => {
                    web3.eth.sendSignedTransaction(
                        signedTx.rawTransaction,
                        function (err, hash) {
                            if (!err) {
                                console.log("hash is : ", hash);
                                callback(null, hash);
                            } else {
                                callback({
                                    code: 400, 
                                    message: `Bad Request ${err}`
                                });
                            }
                        }
                    );
            }).catch(err => {
                callback({
                    code: 400, 
                    message: `Transfer failed. Error is ${err}`
                });
            })
        } catch(e) {
            callback({
                code: 400, 
                message: `Your private or public address is not correct`
            });
        }
    },

    token_trackAddress: async function(args, callback) {
        if(args.length < 2) {
            callback({
                code: 400, 
                message: "Missing params. ('params': ['address', 'contract_address'])"
            });
            return;
        }

        let walletAddress = args[0];
        let contractAddress = args[1];
        if ( !ethereum_address.isAddress(walletAddress) || !ethereum_address.isAddress(contractAddress)) {
            callback({
                code: 400, 
                message: "Invalid addresses"
            });
            return;
        }

        var transactions = [];
        try {
            let tx = await axios.get(
                `${getEtherscanApiUrl(config.daemons.eth.chainId)}/api?module=account&action=tokentx&contractaddress=${contractAddress}&address=${walletAddress}&sort=asc&apikey=R3NZBT5BV4WK3VER42TJ3B5UK4WYEDZENH`
            );
            tx.data.result.map(async (itemApi) => {
                var unixtimestamp = itemApi.timeStamp;
                var date = new Date(unixtimestamp * 1000)
                    .toISOString()
                    .slice(0, 19)
                    .replace("T", " ");

                let obj = {
                    from: itemApi.from,
                    to: itemApi.to,
                    hash: itemApi.hash,
                    value: itemApi.value / 10 ** itemApi.tokenDecimal,
                    date: date,
                    timestamp: itemApi.timeStamp,
                    nonce: itemApi.nonce,
                    confirmations: itemApi.blockNumber,
                    block: itemApi.blockNumber,
                    gas_price: itemApi.gasPrice,
                    gas_used: itemApi.gas,
                    name: itemApi.tokenName,
                    symbol: itemApi.tokenSymbol,
                    decimal: itemApi.tokenDecimal,
                };

                transactions.push(obj);
            });

            callback(null, {
                _data: transactions,
            });
        } catch (error) {
            console.log(error)
            callback({
                code: 400, 
                message: error
            });
        }
    },

    token_fetchTx: async function(args, callback) {
        if(args.length == 0) {
            callback({
                code: 400, 
                message: "Missing params. ('params': ['hash'])"
            });
            return;
        } 

        var finalResponse = null;
        try {
            var hash = args[0];

            if (hash.length == 66) {
                finalResponse = await getTransaction(hash);
                if (finalResponse == null) {
                    callback({
                        code: 400, 
                        message: "Tx not found on network"
                    });
                } else {
                    callback(null, finalResponse);
                }
            } else {
                callback({
                    code: 400, 
                    message: "Invalid Hash"
                });
            }
        } catch (error) {
            callback({
                code: 400, 
                message: `Transaction signing stops with the error ${error}`
            });
        }
    }
}

module.exports = erc20_rpc;