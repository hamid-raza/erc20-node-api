const axios = require("axios");
const BitcoinCore = require('bitcoin-core');
const {checkIfExist} = require('../../utils');

const config = require("../../config");

const AddressModel = require('../../database/address');

const bitcoin_rpc = {
    ping: function(args, callback) {
        callback(null, "pong");
    },

    btc_createwallet: async function(args, callback) {
        if(args.length == 0) {
            callback({
                code: 400, 
                message: "wallet_name is required. ('params': ['wallet_name'])"
            });
            return;
        } 

        var wallet_name = args[0];
        if(wallet_name == "") {
            callback({
                code: 400, 
                message: "wallet_name is empty. ('params': ['wallet_name'])"
            });
        } else {
            try {
                var wallet_config = {
                  username: config.daemons.btc.username,
                  password: config.daemons.btc.password,
                  wallet: 'default'
                }
                var bitcoinClient = new BitcoinCore(wallet_config);
                if(!checkIfExist(wallet_name)) await bitcoinClient.createWallet(wallet_name);

                callback(null, {
                    "name": wallet_name,
                    "warning": ""
                });
            } catch(error) {
                callback({
                    code: 400, 
                    message: `Creating wallet stops with the error ${error}`
                });
            }
        }
    },
    btc_getbalance: async function(args, callback) {
        var wallet_name = args.length > 0 ? args[0] : "default";
        
        var wallet_config = {
            username: config.daemons.btc.username,
            password: config.daemons.btc.password,
            wallet: 'default'
        }
        wallet_config["wallet"] = wallet_name;

        try {
            var bitcoinClient = new BitcoinCore(wallet_config);
            var balance = await bitcoinClient.getBalance("*");

            callback(null, {
                name: wallet_name,
                balance: balance
            });
        } catch(error) {
            callback({
                code: 400, 
                message: `Checking wallet balance with the error ${error}`
            });
        }
    },

    btc_getnewaddress: async function(args, callback) {
        var wallet_name = args.length > 0 ? args[0] : "default";
        var callback_url = args.length > 1 ? args[1] : null;
        
        var wallet_config = {
            username: config.daemons.btc.username,
            password: config.daemons.btc.password,
            wallet: 'default'
        }
        wallet_config["wallet"] = wallet_name;

        try {
            var bitcoinClient = new BitcoinCore(wallet_config);
            var address = await bitcoinClient.getNewAddress();
            var privateKey = await bitcoinClient.dumpPrivKey(address);

            // store address to db
            await AddressModel.collection.insertOne({
                currency: 'btc',
                address: address,
                wallet: wallet_name,
                callback_url: callback_url,
                created_at: new Date(),
            });

            callback(null, {
                private: privateKey,
                public: address,
                address: address,
                wallet: wallet_name,
                callback_url: callback_url,
                currency: "BTC",
                balance: 0,
                sent: 0,
                received: 0,
                link: `https://www.blockchain.com/btc/address/${address}`,
                create_date: new Date(),
            });
        } catch(error) {
            callback({
                code: 400, 
                message: `Creating a address stops with the error ${error}`
            });
        }
    },

    btc_sendtoaddress: async function(args, callback) {
        if(args.length < 2) {
            callback({
                code: 400, 
                message: "Missing params. ('params': ['to_address', amount, 'wallet_name(optional)'])"
            });
            return;
        }

        var wallet_name = args.length > 3 ? args[2] : "default";
        if(!checkIfExist(wallet_name)) {
            callback({
                code: 400, 
                message: "Wallet does not exist"
            });
            return;
        }
    
        var toAddress = args[0];
        
        var wallet_config = {
            username: config.daemons.btc.username,
            password: config.daemons.btc.password,
            wallet: 'default'
        }
        wallet_config["wallet"] = wallet_name;
        const bitcoinClient = new BitcoinCore(wallet_config);
        
        const {isvalid} = await bitcoinClient.validateAddress(toAddress);
        if(!isvalid) {
            callback({
                code: 400, 
                message: "Invalid address"
            });
            return;
        }

        var amount = args[1];
        if(isNaN(amount) || parseFloat(amount) < 0) {
            callback({
                code: 400, 
                message: "Invalid amount"
            });
            return;
        }
        amount = Math.floor(parseFloat(amount) * Math.pow(10, 8))/Math.pow(10, 8);

        try{
            let hash = await bitcoinClient.sendToAddress(toAddress, amount);
            callback(null, hash);
        } catch (e) {
            callback({
                code: 400, 
                message: `transfer failed. ${e}`
            });
        }
    },

    btc_nonce: async function(args, callback) {
        if(args.length == 0) {
            callback({
                code: 400, 
                message: "address is required. ('params': ['address'])"
            });
            return;
        }

        var address = args[0];        
        
        var wallet_config = {
            username: config.daemons.btc.username,
            password: config.daemons.btc.password,
            wallet: 'default'
        }
        const bitcoinClient = new BitcoinCore(wallet_config);
        try {
            const {isvalid} = await bitcoinClient.validateAddress(address);
            if(!isvalid) {
                callback({
                    code: 400, 
                    message: "Invalid address"
                });
            } else {
                const result = await axios.get("https://explorer.api.bitcoin.com/btc/v1/addr/" + address);
                const parsed = result.data;
                
                if (!parsed || parsed.balance === undefined) {
                    callback({
                        code: 400, 
                        message: "Invalid address"
                    });
                } else {

                    callback(null, {
                        nonce: parsed.transactions.length,
                        address: parsed.addrStr,
                        currency: "BTC"
                    });
                };
            }
        } catch (e) {
            callback({
                code: 400, 
                message: "Invalid address"
            });
        }
    },

    btc_trackaddress: async function(args, callback) {
        if(args.length == 0) {
            callback({
                code: 400, 
                message: "Missing params. ('params': ['address'])"
            });
            return;
        }

        var address = args[0];
        try {
            const result = await axios.get( "https://explorer.api.bitcoin.com/btc/v1/txs/?address=" + address);
            const parsed = result.data;
            if (parsed == "") {
                callback({
                    code: 400, 
                    message: "No transactions"
                });
            } else {
                callback(null, parsed);
            }
        } catch (e) {
            callback({
                code: 400, 
                message: e
            });
        }
    },

    btc_fetchtx: async function(args, callback) {
        if(args.length == 0) {
            callback({
                code: 400, 
                message: "Missing params. ('params': ['hash'])"
            });
            return;
        }

        var hash = args[0];
        try {
            const result = await axios.get( "https://chain.api.btc.com/v3/tx/" + hash);
            const parsed = result.data;
            if (!parsed || !parsed.data) {
                callback({
                    code: 400, 
                    message: "No transactions"
                });
            } else {
                callback(null, parsed.data);
            }
        } catch (e) {
            callback({
                code: 400, 
                message: `invalid transaction reciept. ${e}`
            });
        }
    }
}

module.exports = bitcoin_rpc;