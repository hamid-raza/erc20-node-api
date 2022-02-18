const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const config = require('../config');
var conn = mongoose.createConnection(config.mongodb, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: true,
    useCreateIndex: true,
});

// Create Schema
const QueriesSchema = new Schema({
    api: {
        type: String,
        required: true
    },
    apiCheck1: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },

    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = Queries = conn.model("keys", QueriesSchema);