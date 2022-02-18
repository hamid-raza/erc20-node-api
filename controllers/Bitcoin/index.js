//This module help to listen request
var express = require("express");
const axios = require("axios");
var router = express.Router();

const {checkIfExist} = require('../../utils');

const config = require("../../config");
const BitcoinCore = require('bitcoin-core');
const AddressModel = require('../../database/address');


// ---------------------------------Create Account----------------------------------------------
router.get("/create_wallet", async function (request, response) {
  let wallet_name = request.query.name ? request.query.name : "";
  let callback_url = request.query.callback_url;
  if(!callback_url) callback_url = null;

  var ResponseCode = 200;
  var ResponseMessage = ``;
  var ResponseData = null;
  try {
    var date = new Date();
    var timestamp = date.getTime();
    
    var wallet_config = {
      username: config.daemons.btc.username,
      password: config.daemons.btc.password,
      wallet: 'default'
    }

    var bitcoinClient = new BitcoinCore(wallet_config);
    if(wallet_name != "") {
      if(!checkIfExist(wallet_name)) await bitcoinClient.createWallet(wallet_name);
    } else {
      wallet_name = "default";
    }

    wallet_config["wallet"] = wallet_name;
    bitcoinClient = new BitcoinCore(wallet_config);

    var address = await bitcoinClient.getNewAddress();
    var privateKey = await bitcoinClient.dumpPrivKey(address);

    await AddressModel.collection.insertOne({
      currency: 'btc',
      address: address,
      wallet: wallet_name,
      callback_url: callback_url,
      created_at: date,
    })

    ResponseData = {
        wallet: {
          private: privateKey,
          public: address,
          address: address,
          currency: "BTC",
          balance: 0,
          create_date: date,
          sent: 0,
          received: 0,
          link: `https://www.blockchain.com/btc/address/${address}`
        },
        message: "",
        timestamp: timestamp,
        status: 200,
        success: true
    };

    ResponseMessage = "Completed";
    ResponseCode = 200;
  } catch (error) {
    ResponseMessage = `Address creating stops with the error ${error}`;
    ResponseCode = 400;
  } finally {
    return response.status(200).json({
      code: ResponseCode,
      data: ResponseData,
      msg: ResponseMessage
    });
  }
});

//-----------------------------Get Balance of Account----------------------------------------------
router.get("/address/:walletAddress", async function (request, response) {
  try {
    var wallet_config = config.daemons.btc;
    wallet_config["wallet"] = "default";
    const bitcoinClient = new BitcoinCore(wallet_config);

    const {isvalid} = await bitcoinClient.validateAddress(request.params.walletAddress);
    if(!isvalid) {
        response.status(400).json({
            invalidrequest: "Your wallet Invalid address"
          });
    } else {
        const result = await axios.get(
            "https://explorer.api.bitcoin.com/btc/v1/addr/" +
            request.params.walletAddress
          );
          const parsed = result.data;
          
          if (parsed.balance === undefined) {
            response.status(404).json({
              notfound: "Your wallet Invalid address"
            });
          } else {
            response.json({
                balance: parsed.balance,
                address: parsed.addrStr,
                currency: "BTC"
              });
          };
    }
  } catch (e) {
    response.status(400).json({
      invalidrequest: "Your wallet Invalid address"
    });
  }
});

router.get("/nonce/:walletAddress", async function (request, response) {
  try {
    var wallet_config = {
      username: config.daemons.btc.username,
      password: config.daemons.btc.password,
      wallet: 'default'
    }

    const bitcoinClient = new BitcoinCore(wallet_config);
    
    const {isvalid} = await bitcoinClient.validateAddress(request.params.walletAddress);
    if(!isvalid) {
        response.status(400).json({
            invalidrequest: "Your wallet Invalid address"
          });
    } else {
        const result = await axios.get(
            "https://explorer.api.bitcoin.com/btc/v1/addr/" +
            request.params.walletAddress
          );
          const parsed = result.data;
          
          if (!parsed || parsed.balance === undefined) {
            response.status(404).json({
              notfound: "Your wallet Invalid address"
            });
          } else {
            response.json({
                nonce: parsed.transactions.length,
                address: parsed.addrStr,
                currency: "BTC"
              });
          };
    }
  } catch (e) {
    response.status(400).json({
      invalidrequest: "Your wallet Invalid address"
    });
  }
});

//----------------------------------Send Bitcoins----------------------------------------------
router.post("/transfer", async function (request, response) {
    let wallet_name = request.body.wallet_name;
    let toAddress = request.body.to_address;
    let amount = request.body.value;
    let errors = {};
    
    if (!toAddress) {
        return response
        .status(400)
        .json((errors.toAddress = "To address or recipient address is required"));
    } else if (!amount) {
        return response.status(400).json((errors.value = "transfer value is required"));
    } 

    if (!wallet_name) {
      wallet_name = "default";
    } else {
      if(!checkIfExist(wallet_name)) {
        return response
          .status(400)
          .json((errors.wallet_name = "Wallet does not exist"));
      }
    }

    var wallet_config = {
      username: config.daemons.btc.username,
      password: config.daemons.btc.password,
      wallet: 'default'
    }
    wallet_config["wallet"] = wallet_name;
    const bitcoinClient = new BitcoinCore(wallet_config);

    const {isvalid} = await bitcoinClient.validateAddress(toAddress);
    if(!isvalid) {
        response.status(400).json({
            invalidrequest: "sYour wallet Invalid addres"
          });
    }

    try{
        let hash = await bitcoinClient.sendToAddress(toAddress, amount);
        return response.status(200).json({
            msg: "Transaction is in mining state. For more info please watch transaction hash on bitcoin explorer",
            hash: hash
          });
    } catch (e) {
        return response.status(400).json({
            msg: "transfering failed",
            e,
            statuscode: 4
        });
    }
});

router.get("/track/:wallet_address", async (req, res) => {
  try {
    const result = await axios.get(
      "https://explorer.api.bitcoin.com/btc/v1/txs/?address=" +
      req.params.wallet_address
    );

    const parsed = result.data;
    if (parsed == "") {
      res.status(404).json({
        notfound: "No transactions"
      });
    } else res.json(parsed);
  } catch (e) {
    res.status(400).json(e);
  }
});

router.get("/fetchtx/:hash", async (req, res) => {
  try {
    const result = await axios.get(
      "https://chain.api.btc.com/v3/tx/" +
      req.params.hash
    );

    const parsed = result.data;
    if (!parsed || !parsed.data) {
      res.status(404).json({
        notfound: "No transactions"
      });
    } else res.json(parsed.data);
  } catch (e) {
    return res.status(200).json({
      msg: "invalid transaction reciept",
      e,
      statuscode: 4
    });
  }
});
module.exports = router;