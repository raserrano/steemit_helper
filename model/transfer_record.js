var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var transferSchema = new Schema({
  number: { type: Number, index: {unique: true,dropDups: true}, required: true},
  from: { type: String, required: true},
  to: { type: String, required: false},
  amount: { type: String, required: true},
  memo: { type: String, required: false},
  timestamp: { type: String, required: false},
});

module.exports = mongoose.model('TransferRecord', transferSchema);