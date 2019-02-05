const
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/dev'),
  steem_api = require('../model/steem_api');

// Voting for high bids
wait.launchFiber(function() {
  var max = 100000000;
  var limit = 200;
  var best_options = new Array();
  var accounts_to = conf.env.VOTING_ACCS().split(',');
  var voter = wait.for(
    steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
  );
  var vp = utils.getVotingPower(voter[0]);
  if (conf.env.VOTE_ACTIVE()) {
    if (vp >= (conf.env.MIN_VOTING_POWER() * conf.env.VOTE_POWER_1_PC())) {
      for (var i = 0; i < accounts_to.length; i++) {
        utils.debug('Votes for ' + accounts_to[i]);
        var results_to = '';
        try {
          results_to = wait.for(
            steem_api.getTransfers,
            accounts_to[i],
            max,
            limit
          );
          var voter = wait.for(
            steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
          );
        }catch (e) {
          console.log(e);
          break;
        }
        utils.debug('Found ' + results_to.length + ' possible posts to vote');
        var temp = utils.getHighCurationPosts(
          accounts_to[i],
          accounts_to,
          results_to
        );
        utils.debug('Good options ' + temp.length);
        best_options = best_options.concat(temp);
      }
      if (best_options.length > 0) {
        utils.debug(best_options);
        best_options.sort(function(a,b) {
          return (a.magic_number > b.magic_number) ?
            1 : ((b.magic_number > a.magic_number) ? -1 : 0);
        });
        utils.startVotingProcess(
          accounts_to[i],
          best_options,
          conf.env.WEIGHT(),
          voter[0]
        );
      }
      console.log('Finish voting');
    }else {
      console.log('VP not enough to vote');
    }
  } else {
    console.log('Vote not active');
  }
  process.exit();
});