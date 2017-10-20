var mongoose = require('mongoose');

var Schema = mongoose.Schema;

// obj = {number,payer,memo,amount,donation,currency,author,post,created};

var transferSchema = new Schema({
  number: { type: Number, required: true},
  payer: { type: String, required: true},
  memo: { type: String, required: true},
  amount: { type: Number, required: true},
  donation: { type: Number, required: false},
  currency: { type: String, required: true},
  author: { type: String, required: true},
  post: { type: String, required: true},
  created: { type: String, required: true},
  created_at: Date,
  updated_at: Date,
});

transferSchema.pre('save', function(next) {
  var currentDate = new Date();
  this.updated_at = currentDate;
  if (!this.created_at) {
    this.created_at = currentDate;
  }
  next();
});

module.exports = mongoose.model('Transfer', transferSchema);