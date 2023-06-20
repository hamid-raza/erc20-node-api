const mongoose = require('mongoose');
const axios = require('axios');
const BitcoinCore = require('bitcoin-core');
const schedule = require('node-schedule');

const { readdirSync } = require('fs');

const AddressModel = require('../database/address');
const TransactionModel = require('../database/transaction');

const config = require("../config");

const getDirectories = source =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

    mongoose.connect('mongodb://' + config.db.host + ':' + config.db.dbport + '/' + config.db.dbname,
    {
        useUnifiedTopology: true,
        useNewUrlParser: true,
        useFindAndModify: true,
        useCreateIndex: true,
    }, 
    async function (err, db) {
        schedule.scheduleJob("*/3 * * * *", function(){
            check_transactions();
        });
    }
);

function check_transactions() {
    var wallets = getDirectories(config.daemons.btc.path);
    wallets = wallets.filter(wallet => ["blocks", "chainstate", "database", "testnet3"].indexOf(wallet) == -1);

    wallets.forEach(async wallet_name => {
        var wallet_config = config.daemons.btc;
        wallet_config["wallet"] = wallet_name;
        var bitcoinClient = new BitcoinCore(wallet_config);

        var transactions = await bitcoinClient.listTransactions();
        emit_transaction_event(wallet_name, transactions);
    });

}

async function emit_transaction_event(wallet, transactions) {
    if(transactions.length == 0) return;

    transactions.filter(tx => tx.category == 'receive').forEach(async tx => {
        var addressItem = await AddressModel.findOne({address: tx.address, wallet: wallet, callback_url: {$ne: null}});
        if(addressItem) {
            var txItem = await TransactionModel.findOne({txHash: tx.txid});
            if(!txItem) {
                await TransactionModel.collection.insertOne({
                    currency: 'btc',
                    to: tx.address,
                    wallet: wallet,
                    amount: tx.amount,
                    txHash: tx.txid,
                    confirmations: tx.confirmations,
                    callback_url: addressItem.callback_url,
                    created_at: new Date(tx.timereceived * 1000)
                });

                axios.post(addressItem.callback_url, tx);
            } else {
                if(txItem.confirmations < 2) {
                    txItem.confirmations = tx.confirmations;
                    await txItem.save();

                    axios.post(addressItem.callback_url, tx);
                }
            }
        }
    });
}