const
  wait = require('wait.for'),
  utils = require('../model/util'),
  steem_api = require('../model/steem_api');
// Generates a report for the not voted posts of account
wait.launchFiber(function(){
  var max = 20000;
  var limit = 10000;
  var globalData = wait.for(steem_api.steem_getSteemGlobaleProperties_wrapper);
  var conversionInfo = steem_api.init_conversion(globalData);
  var results = wait.for(steem_api.getTransfers,'treeplanter',max,limit);
  utils.getTransfersToVoteReport(['treeplanter'],results);
  console.log('Finish report');
  process.exit();
});