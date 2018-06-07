var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var transferSchema = new Schema({
  url: { type: String, required: false},
  author: { type: String, required: false},
  created: { type: Date, required: false},
});

module.exports = mongoose.model('Link', transferSchema);