const
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/dev'),
  steem_api = require('../model/steem_api');

// Voting for high bids
wait.launchFiber(function(){
  var max = 10000000;
  var limit = 100;
  var globalData = wait.for(steem_api.steem_getSteemGlobaleProperties_wrapper);
  var conversionInfo = steem_api.init_conversion(globalData);
  var accounts = wait.for(
    steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
  );
  
  var weight = steem_api.calculateVoteWeight(
    conversionInfo,
    globalData,
    accounts[0]
  );
  var accounts_to = conf.env.VOTING_ACCS().split(',');
  for(var i=0;i<accounts_to.length;i++){
    utils.debug('Votes for '+accounts_to[i]);
    var results_to = wait.for(
      steem_api.getTransfers,
      accounts_to[i],
      max,
      limit
    );
    utils.startVotingProcess(accounts_to[i],results_to,weight);
  }
  console.log('Finish voting');
  process.exit();
});