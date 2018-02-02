var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var informationSchema = new Schema({
  powerup: { type: Number, required: false},
  payment: { type: Number, required: false},
  trees: { type: Number, required: false},
  created: { type: Date, required: false},
});
informationSchema.pre('save', function(next) {
  var currentDate = new Date();
  this.created = currentDate;
  next();
  console.log('Information created!');
});

module.exports = mongoose.model('Information', informationSchema);