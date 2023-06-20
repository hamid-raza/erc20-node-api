//This module help to listen request
var express = require("express");
var router = express.Router();

const config = require("../../config");
const Web3 = require("web3");
const axios = require("axios");
const Web3EthAccounts = require("web3-eth-accounts");
const ethUtil = require("ethereumjs-util");
const ethereum_address = require("ethereum-address");
const { getEtherscanApiUrl } = require("./global");

const AddressModel = require('../../database/address');

var web3 = new Web3(new Web3.providers.HttpProvider(config.daemons.polygon.provider));

// ---------------------------------Create Account----------------------------------------------
router.get("/create_wallet", async function (request, response) {
  let callback_url = request.query.callback_url;
  if(!callback_url) callback_url = null;

  var ResponseCode = 200;
  var ResponseMessage = ``;
  var ResponseData = null;
  try {
    var account = new Web3EthAccounts(config.daemons);

    let wallet = account.create();
    let walletAddress = wallet.address;
    const balance = await web3.eth.getBalance(walletAddress);
    const weiBalance = web3.utils.fromWei(balance, "ether");
    const count = await web3.eth.getTransactionCount(walletAddress);
    var date = new Date();
    var timestamp = date.getTime();

    
    // store address to db
    await AddressModel.collection.insertOne({
      currency: 'polygon',
      address: walletAddress.toLowerCase(),
      callback_url: callback_url,
      created_at: date,
    });

    ResponseData = {
      wallet: {
        private: wallet.privateKey,
        public: wallet.address,
        currency: "MATIC",
        balance: weiBalance,
        create_date: date,
        sent: count,
        received: count,
        link: `https://www.polygonscan.io/address/${walletAddress}`
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
    const wallet = request.params.walletAddress;
    const balance = await web3.eth.getBalance(wallet);
    const weiBalance = web3.utils.fromWei(balance, "ether");
    if (weiBalance) {
      response.json({
        balance: weiBalance,
        address: wallet,
        currency: "MATIC"
      });
    }
  } catch (e) {
    response.status(400).json({
      invalidrequest: "Your wallet Invalid address"
    });
  }
});

router.get("/nonce/:walletAddress", async function (request, response) {
  try {
    const wallet = request.params.walletAddress;
    const count = await web3.eth.getTransactionCount(wallet);

    response.json({
      nonce: count,
      address: wallet,
      currency: "MATIC"
    });
  } catch (e) {
    response.status(400).json({
      invalidrequest: "Your wallet Invalid address"
    });
  }
});

//----------------------------------Send Ethers----------------------------------------------
router.post("/transfer", async function (request, response) {
  let fromAddress = request.body.from_address;
  let privateKey = request.body.from_private_key;
  let toAddress = request.body.to_address;
  let etherValue = request.body.value;

  let errors = {};

  if (fromAddress == "") {
    return response
      .status(400)
      .json(
        (errors.fromAddress = "From address or sender address is required")
      );
  } else if (toAddress == "") {
    return response
      .status(400)
      .json((errors.toAddress = "To address or recipient address is required"));
  } else if (!etherValue || etherValue == "") {
    return response
      .status(400)
      .json((errors.etherValue = "ether value is required"));
  } else if (privateKey == "") {
    return response
      .status(400)
      .json((errors.privateKey = "private key of sender is required"));
  }

  if ( !ethereum_address.isAddress(fromAddress) || !ethereum_address.isAddress(toAddress)) {
    return response
      .status(400)
      .json((errors.privateKey = "Invalid addresses"));
  }

  try {
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }

    let bufferedKey = ethUtil.toBuffer(privateKey);
    if(!ethUtil.isValidPrivate(bufferedKey)) {
      return response
        .status(400)
        .json((errors.privateKey = "Invalid private key"));
    }

    if(isNaN(etherValue) || parseFloat(etherValue) <= 0) {
      return response
        .status(400)
        .json((errors.privateKey = "Invalid amount"));
    }

    etherValue = web3.utils.toWei(etherValue.toString(), "ether");

    let count;
    if (request.body.nonce) {
      count = request.body.nonce;
    } else {
      count = await web3.eth.getTransactionCount(fromAddress);
    }

    web3.eth.defaultAccount = fromAddress;

    let gasPrice;
    if (request.body.gasPrice) {
      gasPrice = request.body.gasPrice;
    } else {
      gasPrice = await web3.eth.getGasPrice();
    }

    let gasLimit;
    if (request.body.gasLimit) {
      gasLimit = request.body.gasLimit;
    } else {
      gasLimit = 21000;
    }

    console.log("gasg limit : ", gasLimit);
    
    const balance = await web3.eth.getBalance(fromAddress);
    const weiBalance = web3.utils.fromWei(balance, "ether");

    let txFee = gasPrice * gasLimit/1e18;
    console.log(`matic fee: ${txFee}, balance: ${weiBalance}`);

    if(weiBalance < parseFloat(web3.utils.fromWei(etherValue, "ether")) + txFee) {
      return response
        .status(400)
        .json((errors.privateKey = "Insufficient balance. current balance is " + weiBalance));
    }

    let transactionObject = {
      nonce: web3.utils.toHex(count),
      from: fromAddress,
      gasPrice: web3.utils.toHex(gasPrice),
      gasLimit: web3.utils.toHex(gasLimit),
      to: toAddress,
      value: web3.utils.toHex(etherValue),
      chainId: config.daemons.polygon.chainId
    };
    
    web3.eth.accounts
      .signTransaction(transactionObject, privateKey)
      .then(signedTx => {
        web3.eth.sendSignedTransaction(
          signedTx.rawTransaction,
          async function (err, hash) {
            if (!err) {
              console.log("hash is : ", hash);
              return response.status(200).json({
                msg: "Transaction is in mining state. For more info please watch transaction hash on ftmscan explorer",
                hash: hash
              });
            } else {
              return response.status(400).json({
                msg: `Bad Request ${err}`
              });
            }
          }
        );
      }).catch(err => {
        return response.status(400).json({
          msg: `Your private or public address is not correct`,
        });
      })
    
  } catch (e) {
    return response.status(400).json({
      msg: "invalid transaction signing",
      e,
      statuscode: 4
    });
  }
});

router.get("/track/:wallet_address", async (req, res) => {
  try {
    const result = await axios.get(
      `${getEtherscanApiUrl(config.daemons.polygon.chainId)}/api?module=account&action=txlist&address=` +
      req.params.wallet_address
    );
    const parsed = result.data.result;
    if (parsed == "") {
      res.status(404).json({
        notfound: "No transactions"
      });
    } else res.json(parsed);
  } catch (e) {
    console.log(e);
    res.status(400).json(e);
  }
});

router.get("/fetchtx/:hash", async (req, res) => {
  try {
    const reciept = await web3.eth.getTransaction(req.params.hash);
    let transaction2 = await web3.eth.getTransactionReceipt(req.params.hash);

    if (reciept == null) {
      return res.status(200).json({
        msg: "Transaction is in mining state. For more info please watch transaction hash on polygonscan explorer",
        hash: req.params.hash,
        statuscode: 2
      });
    } else if (transaction2.status === false) {
      return res.status(200).json({
        reciept: reciept,
        statuscode: 0,
        message: "transaction failed",
        status: "failed"

      });
    } else if (transaction2.status == true) {
      return res.status(200).json({
        reciept: reciept,
        statuscode: 1,
        message: "transaction success",
        status: "success"
      });
    } else {
      return res.status(200).json({
        reciept,
        statuscode: 1
      });
    }
  } catch (e) {
    return res.status(200).json({
      msg: "invalid transaction reciept",
      e,
      statuscode: 4
    });
  }
});

// --------------------------------- Gas Price -----------------------------------------------


router.post("/gasPrice",
  async (req, response) => {
    try {
      let gasPrice = await web3.eth.estimateGas({
        from: req.body.from_address,
        to: req.body.to_address,
        value: web3.utils.toWei('1', 'ether')
      });
      return response.status(200).json({
        gasPrice
      });
    } catch (e) {
      return response.status(400).json({
        msg: "invalid request",
        e,
        statuscode: 4,
      });
    }
  }
);
module.exports = router;