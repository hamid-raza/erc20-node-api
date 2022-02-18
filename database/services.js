const queryServices = require("./queriesFunc");
const Queries = require("./Queries");
var express = require("express");
const {
  Query
} = require("mongoose");
var router = express.Router();

router.get("/getApi", async (req, response) => {
  const query = await queryServices.checkApiExist(req.headers["authorization"]);
  if(query[0] !== undefined) {
    return response.status(200).json({
      keyObject: query[0],
    });
  } else {
    return response.status(400).json({
      updated: false,
      msg: 'invalid api checks',
    });
  }
});

router.post("/updateApi", async (req, response) => {
  let accessApi = req.headers["authorization"];

  const query = await queryServices.checkApiExist(accessApi);
  const newApi = req.headers["newkey"];

  if (
    query[0].api == accessApi &&
    query[0].apiCheck1 == req.headers["apicheck1"] &&
    query[0].apiCheck2 == req.headers["apicheck2"]
  ) {
    const updateQuery = await queryServices.updateApi(accessApi, newApi);
    if (updateQuery) {
      return response.status(200).json({
        updated: true,
      });
    } else {
      return response.status(400).json({
        updated: false,
        msg: 'invalid api checks',
      });
    }
  } else {
    return response.status(400).json({
      updated: false,
      msg: 'invalid api checks',
    });
  }
});

function makeAuthKey(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * 
charactersLength));
 }
 return result;
}

router.post("/createApi", async (req, response) => {
  let accessApi = makeAuthKey(48);
  let apiCheck1 = makeAuthKey(18);
  let name = req.body['name'];

  const query = await queryServices.checkApiExist(accessApi);
  const query1 = await queryServices.checkApiExist(apiCheck1);
  const query2 = await queryServices.checkApiExist(name);

  if (
    !query[0] &&
    !query1[0] &&
    !query2[0]
  ) {
    const createQuery = await queryServices.createApi(accessApi, apiCheck1, name);
    if (createQuery) {
      return response.status(200).json({
        created: true,
        data: createQuery
      });
    } else {
      return response.status(400).json({
        created: false,
        msg: 'error occured',
        data: createQuery
      });
    }
  } else {
    return response.status(400).json({
      updated: false,
      msg: 'Query 403'
    });
  }
});

module.exports = router;