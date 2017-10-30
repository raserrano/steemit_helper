const
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/dev'),
  steem_api = require('../model/steem_api');

// Voting for high bids
wait.launchFiber(function() {
  var voter = wait.for(
    steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
  );
  if (voter[0] !== undefined && voter[0] !== null) {
    var steem = voter[0].reward_steem_balance;
    var sbd = voter[0].reward_sbd_balance;
    var vests = voter[0].reward_vesting_balance;
    if (steem !== '0.000 STEEM'
      || sbd !== '0.000 SBD'
      || vests !== '0.000000 VESTS') {
      console.log('Claiming rewards: ' + steem + ' ' + sbd + ' ' + vests);
      var rewards = wait.for(
        steem_api.claimRewards,
        conf.env.ACCOUNT_NAME(),
        steem,
        sbd,
        vests
      );
      utils.debug(rewards);
    }else {
      utils.debug('Nothing to claim');
    }
  }
  console.log('Finish claiming rewards');
  process.exit();
});