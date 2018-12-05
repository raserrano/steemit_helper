var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var delegatorsSchema = new Schema({
  username: {
    type: String,
    index: {unique: true,dropDups: true},
    required: true,
  },
  sp: { type: Number, required: true},

});

module.exports = mongoose.model('Delegator', delegatorsSchema);