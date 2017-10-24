const
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/dev');
// Generates a report for the not voted posts of account
wait.launchFiber(function() {

  // Report types
  // Full
  var options_full = {};
  // Not voted
  var options_notvoted = {
    voted: false,
  };
  // Trees
  var options_trees = {
    rate: 0.93,
    trees:true
  };
  // Period
  var options_period = {
    period: 6,
    voted:false
  };

  var data = wait.for(utils.getReport,options_period);
  console.log(data.length);
  for (var i = 0; i < data.length;i++) {
    console.log(JSON.stringify(data[i]));
  }
  console.log('Finish report');
  process.exit();
});