const Queries = require("./Queries");

exports.checkApiExist = async function (api) {
  try {
    var exist = await Queries.find({
      api: api,
    });
    return exist;
  } catch (e) {
    // Log Errors
    console.log("Exception ::", e);
    throw e;
  }
};
exports.updateApi = async function (api, newApi) {
  try {
    var update = await Queries.updateOne(
      {
        api: api,
      },
      {
        api: newApi,
      }
    );
    return update;
  } catch (e) {
    // Log Errors
    console.log("Exception ::", e);
    throw e;
  }
};

exports.createApi = async function (api, apiCheck1, apiCheck2) {
  try {
    var create = await Queries.insertMany([
      {
        api: api,
        apiCheck1: apiCheck1,
        name: apiCheck2
      }
    ]);
    return create;
  } catch (e) {
    // Log Errors
    console.log("Exception ::", e);
    throw e;
  }
};