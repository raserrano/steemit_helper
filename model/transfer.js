var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var transferSchema = new Schema({
  number: { type: Number, index: {unique: true,dropDups: true}, required: true},
  payer: { type: String, required: true},
  memo: { type: String, required: false},
  amount: { type: Number, required: true},
  donation: { type: Number, required: false},
  currency: { type: String, required: false},
  author: { type: String, required: false},
  post: { type: String, required: false},
  voted: { type: Boolean, required: false},
  processed: { type: Boolean, required: false},
  created: { type: Date, required: false},
});

module.exports = mongoose.model('Transfer', transferSchema);