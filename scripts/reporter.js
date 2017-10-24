const
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/dev');
// Generates a report for the not voted posts of account
wait.launchFiber(function() {
  var data = wait.for(utils.getReport,700000000,true);
  console.log(data.length);
  for (var i = 0; i < data.length;i++) {
    console.log(data[i]);
  }
  console.log('Finish report');
  process.exit();
});