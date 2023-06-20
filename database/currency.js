var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CurrencySchema = new Schema({
	currency: String,
    type: String,
    contract_address: String,
});
CurrencySchema.index({ currency: 1, type: 1, contract_address: 1 });

module.exports = mongoose.model('currency', CurrencySchema);