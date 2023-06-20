var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AddressSchema = new Schema({
	currency: String,
    address: String,
    wallet: String,
    callback_url: String,
	created_at: Date,
});
AddressSchema.index({ currency: 1, address: 1, wallet_name: 1 });

module.exports = mongoose.model('address', AddressSchema);