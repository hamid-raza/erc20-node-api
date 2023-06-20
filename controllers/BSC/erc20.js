//This module help to listen request
var express = require("express");
var router = express.Router();
var axios = require("axios");

const config = require('../../config');

const Web3 = require("web3");
const ethUtil = require("ethereumjs-util");
const ethereum_address = require("ethereum-address");
const InputDataDecoder = require("ethereum-input-data-decoder");

var web3 = new Web3(new Web3.providers.HttpProvider(config.daemons.bsc.provider));
var abi = require("human-standard-token-abi");
const { getEtherscanApiUrl } = require("./global");

const decoder = new InputDataDecoder(abi);

// var contractAddress = "0xdac17f958d2ee523a2206206994597c13d831ec7"; // Tether USD
//----------------------------------Send Tokens----------------------------------------------
router.post("/transfer", async function (request, response) {
  try {
  
  let fromAddress = request.body.from_address;
  let privateKey = request.body.from_private_key;
  let toAddress = request.body.to_address;
  let tokenValue = request.body.value;
  let contractAddress = request.body.contract_address;

  
  if (!privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey;
  }
  let bufferedKey = ethUtil.toBuffer(privateKey);

  if ( !ethereum_address.isAddress(fromAddress) || !ethereum_address.isAddress(toAddress) || !ethereum_address.isAddress(contractAddress)) {
    return response.status(400).json({
      msg: `Invalid addresses`,
    });
  }
 
  if(!ethUtil.isValidPrivate(bufferedKey)) {
    return response.status(400).json({
      msg: `Invalid private key`,
    });
  }
  
  if(isNaN(tokenValue) || parseFloat(tokenValue) <= 0) {
    return response.status(400).json({
      msg: `Invalid amount`,
    });
  }

  const contract = await new web3.eth.Contract(abi, contractAddress);
 
  let decimals = await contract.methods.decimals().call();
  decimals = await web3.utils.toBN(decimals);
  web3.eth.defaultAccount = fromAddress;
  
  let count;
  if (request.body.nonce) {
    count = request.body.nonce;
  } else {
    count = await web3.eth.getTransactionCount(fromAddress);
  }

  let gasPrice;
  if (request.body.gasPrice) {
    gasPrice = request.body.gasPrice;
  } else {
    gasPrice = await web3.eth.getGasPrice();
  }
  console.log("gas price : ", gasPrice)
  
  let gasLimit;
  if (request.body.gasLimit && !isNaN(request.body.gasLimit)) {
    gasLimit = request.body.gasLimit;
  } else {
    gasLimit = 900000;
  }

  let balance = await web3.eth.getBalance(fromAddress);
  let weiBalance = web3.utils.fromWei(balance, "ether");

  let txFee = gasPrice * gasLimit/1e18;
  console.log(`BNB fee: ${txFee}, balance: ${weiBalance}`);
  if(weiBalance < txFee) {
    return response.status(400).json({
      msg: `Insufficient balance. transaction fee is ${weiBalance} BNB.`,
    });
  }

  balance = await contract.methods.balanceOf(fromAddress).call();
  balance = balance / 10 ** decimals;
  if(balance < tokenValue) {
    return response.status(400).json({
      msg: `Insufficient balance. token balance is ${balance}.`
    });
  }

  tokenAmount = toBaseUnit(tokenValue.toString(), decimals, web3.utils.BN);
  let transactionObject = {
    nonce: web3.utils.toHex(count),
    from: fromAddress,
    gasPrice: web3.utils.toHex(gasPrice),
    gasLimit: web3.utils.toHex(gasLimit),
    to: contractAddress,
    data: contract.methods.transfer(toAddress, tokenAmount).encodeABI(),
    chainId: config.daemons.bsc.provider.chainId,
  };

  // console.log('transaction ', transactionObject)
  web3.eth.accounts
    .signTransaction(transactionObject, privateKey)
    .then((signedTx) => {
      web3.eth.sendSignedTransaction(
        signedTx.rawTransaction,
        async function (err, hash) {
          if (!err) {
            console.log("hash is : ", hash);
            return response.status(200).json({
              msg: "Transaction is in mining state. For more info please watch transaction hash on bscscan explorer",
              hash: hash,
            });
          } else {
            return response.status(400).json({
              msg: `Bad Request ${err}`,
            });
          }
        }
      );
    }).catch(err => {
      return response.status(400).json({
        msg: `Your private or public address is not correct`,
      });
    })
  }
    catch (e) {
      return response.status(400).json({
        msg: "Error occured 102",
        error: e,
        statuscode: 4,
      });
    }
});

router.get("/address/:wallet_address/:contract_address",
  async (req, response) => {
    let walletAddress = req.params.wallet_address;
    let contractAddress = req.params.contract_address;

    if ( !ethereum_address.isAddress(walletAddress) || !ethereum_address.isAddress(contractAddress)) {
      return response.status(400).json({
        msg: "Invalid addresses",
        statuscode: 4,
      });
    }

    try {
      const instance = await new web3.eth.Contract(abi, contractAddress);
      let info = await getTokenInfo(contractAddress);

      var balance = await instance.methods.balanceOf(walletAddress).call();
      balance = balance / 10 ** info.decimals;

      return response.status(200).json({
        balance,
      });
    } catch (e) {
      return response.status(400).json({
        msg: "invalid wallet or contract address",
        e,
        statuscode: 4,
      });
    }
  }
);

router.get("/getinfo/:contract_address", async (req, response) => {
  let data = [];
  let contractAddress = req.params.contract_address;
  try {
    const instance = await new web3.eth.Contract(abi, contractAddress);
    const name = await instance.methods.name().call();
    const symbol = await instance.methods.symbol().call();
    const decimals = await instance.methods.decimals().call();
    const totalSupply = await instance.methods.totalSupply().call();
    
    response.json({
      contractAddress: contractAddress,
      name: name,
      symbol: symbol,
      decimals: parseInt(decimals),
      totalSupply: totalSupply / 10 ** decimals,
    });
  } catch (e) {
    return response.status(400).json({
      msg: "invalid contract address",
      e,
      statuscode: 4,
    });
  }
});

router.get("/fetchtx/:hash", async function (req, response) {
  var finalResponse = null;
  try {
    if (req.params) {
      if (!req.params.hash) {
        ResponseMessage = "hash is missing \n";
        ResponseCode = 206;
      } else {
        let hash = req.params.hash;

        if (hash.length == 66) {
          ResponseCode = 200;
          finalResponse = await getTransaction(hash);
          ResponseMessage = "Completed";
        } else {
          ResponseMessage = "Invalid Hash";
          ResponseCode = 400;
        }
      }
    } else {
      ResponseMessage =
        "Transaction cannot proceeds as request params is empty";
      ResponseCode = 204;
    }
  } catch (error) {
    ResponseMessage = `Transaction signing stops with the error ${error}`;
    ResponseCode = 400;
  } finally {
    if (finalResponse == null) {
      return response.status(400).json({
        meta: "Tx not found on network",
      });
    } else {
      return response.status(200).json({
        payload: finalResponse,
      });
    }
  }
});

function getTransaction(hash) {
  var ResponseData;

  return new Promise(function (resolve, reject) {
    try {
      web3.eth.getTransaction(hash, async function (err, transaction) {
        if (transaction !== undefined) {
          let inputdecode = await decoder.decodeData(transaction.input);
          var confirmation =
            (await web3.eth.getBlockNumber()) - transaction.blockNumber;
          let time = await web3.eth.getBlock(transaction.blockNumber);
          let info = await getTokenInfo(transaction.to);
          let decimals =
            parseInt(inputdecode.inputs[1].toString()) / 10 ** info.decimals;
          ResponseData = {
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
  var ResponseData;

  return new Promise(async function (resolve, reject) {
    try {
      const contractInstance = await new web3.eth.Contract(
        abi,
        contractAddress
      );

      const name = await contractInstance.methods.name().call();
      const symbol = await contractInstance.methods.symbol().call();
      const decimals = await contractInstance.methods.decimals().call();

      ResponseData = {
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

router.get("/track/:wallet_address/:contract_address", async function (
  req,
  res
) {
  var transactions = [];
  try {
    let tx = await axios.get(
      `${getEtherscanApiUrl(config.daemons.bsc.chainId)}/api?module=account&action=tokentx&contractaddress=${req.params.contract_address}&address=${req.params.wallet_address}&sort=asc&apikey=R3NZBT5BV4WK3VER42TJ3B5UK4WYEDZENH`
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

    return res.status(200).json({
      _data: transactions,
    });
  } catch (error) {
    let errors = {
      error: {
        code: 1,
        message: `General error: ` + error,
      },
    };
    return res.status(500).json(errors);
  }
});

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

  if (!whole) {
    whole = '0';
  }
  if (!fraction) {
    fraction = '0';
  }
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

module.exports = router;