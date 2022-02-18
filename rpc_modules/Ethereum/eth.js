const axios = require("axios");

const Web3 = require("web3");
const Web3EthAccounts = require("web3-eth-accounts");
const ethUtil = require("ethereumjs-util");
const ethereum_address = require("ethereum-address");

const config = require("../../config");
const { getEtherscanApiUrl } = require("../../controllers/Ethereum/global");

var web3 = new Web3(new Web3.providers.HttpProvider(config.daemons.eth.provider));

const AddressModel = require('../../database/address');

const ethereum_rpc = {
    eth_newAccount: async function(args, callback) {
        try {
            var account = new Web3EthAccounts(config.daemons);
            var callback_url = args.length > 0 ? args[0] : null;

            let wallet = account.create();
            let walletAddress = wallet.address;
            const balance = await web3.eth.getBalance(walletAddress);
            const weiBalance = web3.utils.fromWei(balance, "ether");
            const count = await web3.eth.getTransactionCount(walletAddress);
            var date = new Date();

            // store address to db
            await AddressModel.collection.insertOne({
                currency: 'eth',
                address: walletAddress.toLowerCase(),
                callback_url: callback_url,
                created_at: date,
            });

            callback(null, {
                private: wallet.privateKey,
                public: wallet.address,
                currency: "ETH",
                balance: weiBalance,
                callback_url: callback_url,
                create_date: date,
                sent: count,
                received: count,
                link: `https://www.etherscan.io/address/${walletAddress}`
            });
        } catch(e) {
            callback({
                code: 400, 
                message: `Address creating stops with the error. ${e}`
            });
        }
    }, 

    eth_getBalance: async function(args, callback) {
        if(args.length == 0) {
            callback({
                code: 400, 
                message: "Address is required. ('params': ['address'])"
            });
            return;
        } 

        try {
            const wallet = args[0];
            const balance = await web3.eth.getBalance(wallet);
            const weiBalance = web3.utils.fromWei(balance, "ether");
            if (weiBalance) {
                callback(null, {
                    balance: weiBalance,
                    address: wallet,
                    currency: "ETH"
                });
            }
        } catch (e) {
            callback({
                code: 400, 
                message: "Invalid address"
            });
        }
    },

    eth_nonce: async function(args, callback) {
        if(args.length == 0) {
            callback({
                code: 400, 
                message: "Address is required. ('params': ['address'])"
            });
            return;
        } 

        try {
            const wallet = args[0];
            const count = await web3.eth.getTransactionCount(wallet);
        
            callback(null, {
              nonce: count,
              address: wallet,
              currency: "ETH"
            });
        } catch (e) {
            callback({
                code: 400, 
                message: "Invalid address"
            });
        }
    },

    eth_send: async function(args, callback) {
        if(args.length < 4) {
            callback({
                code: 400, 
                message: "Missing params. ('params': ['from_address', 'from_private_key', 'to_address', amount])"
            });
            return;
        }

        let fromAddress = args[0];
        let privateKey = args[1];
        let toAddress = args[2];
        let etherValue = args[3];

        if (!privateKey.startsWith('0x')) privateKey = '0x' + privateKey;
        let bufferedKey = ethUtil.toBuffer(privateKey);

        if ( !ethereum_address.isAddress(fromAddress) || !ethereum_address.isAddress(toAddress)) {
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

        if(etherValue <= 0) {
            callback({
                code: 400, 
                message: "Invalid amount"
            });
            return;
        }

        try {
            etherValue = web3.utils.toWei(etherValue.toString(), "ether");
            let count = await web3.eth.getTransactionCount(fromAddress);           
            web3.eth.defaultAccount = fromAddress;
      
            let gasPrice = await web3.eth.getGasPrice();
            let gasLimit = 21000;
            
            const balance = await web3.eth.getBalance(fromAddress);
            const weiBalance = web3.utils.fromWei(balance, "ether");

            let txFee = gasPrice * gasLimit/1e18;
            console.log(`ether fee: ${txFee}, balance: ${weiBalance}`);
            if(weiBalance < parseFloat(web3.utils.fromWei(etherValue, "ether")) + txFee) {
                callback({
                    code: 400, 
                    message: "Insufficient balance. current balance is " + weiBalance,
                });
                return;
            }
      
            let transactionObject = {
                nonce: web3.utils.toHex(count),
                from: fromAddress,
                gasPrice: web3.utils.toHex(gasPrice),
                gasLimit: web3.utils.toHex(gasLimit),
                to: toAddress,
                value: web3.utils.toHex(etherValue),
                chainId: config.daemons.eth.chainId
            };
            
            web3.eth.accounts
              .signTransaction(transactionObject, privateKey)
              .then(signedTx => {
                web3.eth.sendSignedTransaction(
                  signedTx.rawTransaction,
                    async function (err, hash) {
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
                    message: "Your private or public address is not correct"
                });
            })
        } catch(e) {
            callback({
                code: 400, 
                message: `Invalid transaction signing. ${e}`
            });
        }
    },

    eth_trackAddress: async function(args, callback) {
        if(args.length == 0) {
            callback({
                code: 400, 
                message: "Address is required. ('params': ['address'])"
            });
            return;
        } 

        var address = args[0];
        try {
            const result = await axios.get(
              `${getEtherscanApiUrl(config.daemons.eth.chainId)}/api?module=account&action=txlist&address=` + address
            );
            const parsed = result.data.result;
            if (parsed == "") {
                callback({
                    code: 400, 
                    message: "No transactions"
                });
            } else callback(null, parsed);
        } catch (e) {
            callback({
                code: 400, 
                message: e
            });
        }
    },

    eth_fetchTx: async function(args, callback) {
        if(args.length == 0) {
            callback({
                code: 400, 
                message: "Missing params. ('params': ['hash'])"
            });
            return;
        } 

        var hash = args[0];
        try {
            const reciept = await web3.eth.getTransaction(hash);
            let transaction = await web3.eth.getTransactionReceipt(hash);
        
            if (reciept == null) {
                callback({
                    code: 400, 
                    message: "Transaction is in mining state. For more info please watch transaction hash on etherscan explorer"
                });
            } else {
                if (transaction.status === false) {
                    callback({
                        code: 400, 
                        message: "Transaction failed"
                    });
                } else callback(null, reciept);
            }
        } catch (e) {
            callback({
                code: 400, 
                message: "Invalid transaction hash"
            });
        }
    }
}

module.exports = ethereum_rpc;