const express = require('express');
const jayson = require('jayson');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const config = require('./config');

// routes
const { routes } = require('./app');
const rpc_routes = require('./rpc_modules');

const app = express();
app.use(cors());
app.use(helmet())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/', routes);
app.post('/rpc', jayson.server(rpc_routes).middleware());

app.use("/*", function (req, res) {
  return res.json({
    code: 404,
    data: null,
    msg: "Invalid Request 2 {URL Not Found}",
  });
});

if (module === require.main) {
    mongoose.connect(config.mongodb,
    {
        useUnifiedTopology: true,
        useNewUrlParser: true,
        useFindAndModify: true,
        useCreateIndex: true,
    }, 
    async function (err, db) {
        if (err) {
            console.log('[' + new Date() + ']', 'Sorry, there is no mongo db server running.');
        } else {
            var server = app.listen(process.env.PORT || config.port, function () {
                var port = server.address().port;
                console.log("App listening on port %s", port);
            });
        }
    });
}