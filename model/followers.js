var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var followerSchema = new Schema({
  username: {
    type: String,
    index: {unique: true,dropDups: true},
    required: true,
  },
  reputation: { type: Number, required: false},
  tier: { type: Object, required: false},
  created: { type: Date, required: false},
  active: { type: Boolean, required: false},
  deleted: { type: Boolean, required: false},

});

module.exports = mongoose.model('Follower', followerSchema);