var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var accountSchema = new Schema({
  username: {
    type: String,
    index: {unique: true,dropDups: true},
    required: true,
  },
  followers: { type: Number, required: false},
  sp: { type: Number, required: false},
  reputation: { type: Number, required: false},
  vote: { type: Number, required: false},
  created: { type: Date, required: false},
});

module.exports = mongoose.model('Account', accountSchema);