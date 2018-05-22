const
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/dev'),
  steem_api = require('../model/steem_api');

// Voting for high bids
wait.launchFiber(function() {
  var max = 100000000;
  var limit = 100;

  var accounts_to = conf.env.VOTING_ACCS().split(',');
  for (var i = 0; i < accounts_to.length; i++) {
    utils.debug('Votes for ' + accounts_to[i]);
    var results_to = "";
    try{
      results_to = wait.for(
        steem_api.getTransfers,
        accounts_to[i],
        max,
        limit
      );
      var voter = wait.for(
        steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
      );
    }catch(e){
      console.log(e);
      break;
    }
    var weight = 1000;
    utils.startVotingProcess(accounts_to[i],results_to,weight,voter[0]);
  }
  console.log('Finish voting');
  process.exit();
});