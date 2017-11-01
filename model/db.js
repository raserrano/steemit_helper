var config = require('../config/current'),
  mongoose = require('mongoose');

mongoose.Promise = global.Promise;

console.log(config.database.conn(config.database.options));

var db = mongoose.connect(
  config.database.conn(
    config.database.options
    ),
  {useMongoClient: true}
  );

// CONNECTION EVENTS
// When successfully connected
mongoose.connection.on('connected', function() {
  console.log('Mongoose default connection open to ' +
    config.database.conn(config.database.options));
});

// If the connection throws an error
mongoose.connection.on('error',function(err) {
  console.log('Mongoose default connection error: ' + err);
});

// When the connection is disconnected
mongoose.connection.on('disconnected', function() {
  console.log('Mongoose default connection disconnected');
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', function() {
  mongoose.connection.close(function() {
    console.log('Mongoose default connection disconnected app termination');
    process.exit(0);
  });
});

// Models
require('../model/transfer');

module.exports = db;