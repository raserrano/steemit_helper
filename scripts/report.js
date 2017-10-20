const
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/dev'),
  steem_api = require('../model/steem_api');
// Generates a report for the not voted posts of account
wait.launchFiber(function(){
  var max = 20000;
  var limit = 10000;
  var results = wait.for(steem_api.getTransfers,'treeplanter',max,limit);
  utils.getTransfersToVoteReport(
    'treeplanter',
    results,
    conf.env.MIN_DONATION(),
    conf.env.MAX_DONATION()
  );
  process.exit();
});