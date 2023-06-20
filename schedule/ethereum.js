const mongoose = require('mongoose');
const axios = require('axios');
const schedule = require('node-schedule');
const Web3 = require("web3");

const AddressModel = require('../database/address');
const TransactionModel = require('../database/transaction');

const config = require("../config");
var web3 = new Web3(new Web3.providers.HttpProvider(config.daemons.eth.provider));

var old_block_number = 0;
mongoose.connect('mongodb://' + config.db.host + ':' + config.db.dbport + '/' + config.db.dbname,
    {
        useUnifiedTopology: true,
        useNewUrlParser: true,
        useFindAndModify: true,
        useCreateIndex: true,
    }, 
    async function (err, db) {
        schedule.scheduleJob("*/1 * * * *", function(){
            check_block();
        });
    }
);

function check_block() {
    web3.eth.getBlock("latest", false, async function(err, latestBlock){
        if(err) return;
        if( latestBlock == undefined || latestBlock == null ) return;
        
        if(old_block_number == 0) {
            var lastItem = TransactionModel.find({block_number: {$ne: null}}).sort({block_number: -1}).limit(1);
            if(lastItem.length > 0)  old_block_number = lastItem[0].block_number;
        }

        var blockNum = latestBlock.number;
        if(old_block_number == 0) old_block_number = blockNum-1;
        if(blockNum - old_block_number > 20) blockNum = old_block_number + 20;

        for( var i = old_block_number + 1; i <= blockNum; i++ ){
            let block = await web3.eth.getBlock(i);
            if(!block || !block.transactions) return;
            console.log(`Current block: ${block.number} #################`)

            for(let txHash of block.transactions) {
                var ethtrans = await TransactionModel.findOne({txHash: txHash});
                if(ethtrans) continue;

                let tx = await web3.eth.getTransaction(txHash);
                if( tx == null ) continue;
                if( tx.to == null || tx.from == null ) continue;

                var toAddr = tx.to.toLowerCase();
                var fromAddr = tx.from.toLowerCase();
                var amount = web3.utils.fromWei(tx.value, "ether");
                amount = parseFloat(amount);

                if(tx.input == "0x") {
                    // processing for eth transaction
                    if(amount == 0) continue;
                    
                    let addressItem = await AddressModel.findOne({address: toAddr});
                    if(!addressItem) continue;

                    await TransactionModel.collection.insertOne({
                        currency: 'eth',
                        from: fromAddr,
                        to: toAddr,
                        amount: amount,
                        txHash: txHash,
                        block_number: block.number,
                        callback_url: addressItem.callback_url,
                        created_at: new Date(block.timestamp)
                    });

                    if(addressItem.callback_url) {
                        axios.post(addressItem.callback_url, {
                            currency: 'eth',
                            from: fromAddr,
                            to: toAddr,
                            amount: amount,
                            txHash: txHash,
                            block_number: block.number,
                            callback_url: addressItem.callback_url,
                            created_at: new Date(block.timestamp)
                        });
                    }
                } else {
                    // processing for token transaction 
                    var receipt = await web3.eth.getTransactionReceipt(tx.hash);
                    if( receipt == null  || receipt.status == false) continue;

                    let contract_address = toAddr;

                    let hexString = tx.input;
                    let inputData = [];
                    inputData.push(hexString.substr(2, 8));
                    for(var k = 0; k < hexString.length; k += 64) {
                        inputData.push(hexString.substr(10 + k, 64));
                    }
                    if(inputData.length < 2) continue;
                    
                    let transferMethod = inputData[0];
                    if (transferMethod == 'a9059cbb') { 
                        // "transfer"
                        toAddr = '0x' + inputData[1].substr(-40);
                        amount = inputData[2].replace(/^0+/, '');
                    } else if (transferMethod == '23b872dd') { 
                        // "transferFrom"
                        fromAddr = '0x' + inputData[1].substr(-40);
                        toAddr = '0x' + inputData[2].substr(-40);
                        amount = inputData[3].replace(/^0+/, '');
                    } else continue;

                    let addressItem = await AddressModel.findOne({address: toAddr});
                    if(!addressItem) continue;
                                        
                    await TransactionModel.collection.insertOne({
                        currency: 'token',
                        contract_address: contract_address,
                        from: fromAddr,
                        to: toAddr,
                        amount: amount,
                        txHash: txHash,
                        block_number: block.number,
                        callback_url: addressItem.callback_url,
                        created_at: new Date(block.timestamp)
                    });

                    if(addressItem.callback_url) {
                        axios.post(addressItem.callback_url, {
                            currency: 'token',
                            contract_address: contract_address,
                            from: fromAddr,
                            to: toAddr,
                            amount: amount,
                            txHash: txHash,
                            block_number: block.number,
                            callback_url: addressItem.callback_url,
                            created_at: new Date(block.timestamp)
                        });
                    }

                }
            }
        }
        old_block_number = blockNum;
    })
}