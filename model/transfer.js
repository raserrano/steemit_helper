var mongoose = require('mongoose');

var Schema = mongoose.Schema;

// Obj = {number,payer,memo,amount,donation,currency,author,post,created};

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
  created: { type: Date, required: false},
  created_at: Date,
  updated_at: Date,
});

transferSchema.pre('save', function(next) {
  var currentDate = new Date();
  this.updated_at = currentDate;
  if (!this.created_at) {
    this.created_at = currentDate;
  }
  if (!this.donation) {
    this.donation = 0;
  }
  this.created = new Date(this.created);
  next();
});

module.exports = mongoose.model('Transfer', transferSchema);