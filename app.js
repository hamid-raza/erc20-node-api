const {
  Router
} = require("express");

const mongoose = require("mongoose");
const queries = require("./database/queriesFunc");
const config = require('./config');

const app = Router();

// mainnet
var btcMain = require('./controllers/Bitcoin/index');
var ethMain = require("./controllers/Ethereum/eth");
var erc20Main = require("./controllers/Ethereum/erc20");
var apiServices = require("./database/services");

// testnet
var ethTest = require("./controllers/Testnet_Ethereum/eth");
var erc20Test = require("./controllers/Testnet_Ethereum/erc20");

// fantom
var fantomMainnet = require("./controllers/Fantom/eth");
var fantomERC20Mainnet = require("./controllers/Fantom/erc20");

// polygon
var polygonMainnet = require("./controllers/Polygon/eth");
var polygonERC20Mainnet = require("./controllers/Polygon/erc20");

// BSC
var bscMainnet = require("./controllers/BSC/eth");
var bscERC20Mainnet = require("./controllers/BSC/erc20");

// BSC
var avalancheMainnet = require("./controllers/Avalanche/eth");
var avalancheERC20Mainnet = require("./controllers/Avalanche/erc20");

// BSC
var cronosMainnet = require("./controllers/Cronos/eth");
var cronosERC20Mainnet = require("./controllers/Cronos/erc20");

app.use("/services", ensureWebToken, apiServices);

// mainnet server
app.use("/bitcoin/mainnet", ensureWebToken, btcMain);
app.use("/ether/mainnet", ensureWebToken, ethMain);
app.use("/token/mainnet", ensureWebToken, erc20Main);

// testnet
app.use("/ether/testnet", ensureWebToken, ethTest);
app.use("/token/testnet", ensureWebToken, erc20Test);

// Fantom Mainet
app.use("/fantom/mainnet", ensureWebToken, fantomMainnet);
app.use("/fantomToken/mainnet", ensureWebToken, fantomERC20Mainnet);

// Polygon Mainet
app.use("/polygon/mainnet", ensureWebToken, polygonMainnet);
app.use("/polygonToken/mainnet", ensureWebToken, polygonERC20Mainnet);

// BSC Mainet
app.use("/bsc/mainnet", ensureWebToken, bscMainnet);
app.use("/bscToken/mainnet", ensureWebToken, bscERC20Mainnet);

// Avalanche Mainet
app.use("/avalanche/mainnet", ensureWebToken, avalancheMainnet);
app.use("/avalancheToken/mainnet", ensureWebToken, avalancheERC20Mainnet);

// Cronos Mainet
app.use("/cronos/mainnet", ensureWebToken, cronosMainnet);
app.use("/cronosToken/mainnet", ensureWebToken, cronosERC20Mainnet);

app.get("/", async function (request, response) {
  response.contentType("application/json");
  response.end(JSON.stringify("Node is running"));
});

app.use("/*", function (req, res) {
  return res.json({
    code: 404,
    data: null,
    msg: "Invalid Request 1 {URL Not Found}",
  });
});

async function ensureWebToken(req, res, next) {
  if(req.path !== '/createApi') {
  const x_access_token = req.headers["authorization"];
  if (typeof x_access_token !== undefined) {
    const query = await queries.checkApiExist(x_access_token);
      if (query[0] != x_access_token && query.toString() != "") {
        next();
      } else {
        res.sendStatus(403);
      }
      
    } else {
      res.sendStatus(403);
    }
  } else {
    const admin_key = config.admin.auth_key;
    const admin_password = config.admin.auth_password;

    const auth_key = req.body['auth_key'];
    const auth_password = req.body['auth_password'];
    if(admin_key == auth_key && admin_password == auth_password)
    next();
    else
    res.sendStatus(403);
  }
}

module.exports.routes = app;