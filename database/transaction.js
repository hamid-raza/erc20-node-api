var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TransactionSchema = new Schema({
	currency: String,
    contract_address: String,
    from: String,
    to: String,
    wallet: String,
    amount: { 
        type: String, 
        default: "0"
    },
    txHash: String,
    confirmations: Number,
    block_number: Number,
    callback_url: String,
	created_at: Date,
});

TransactionSchema.index({ currency: 1, contract_address: 1, from: 1, to: 1, txid: 1, created_at: -1 });

module.exports = mongoose.model('transaction', TransactionSchema);