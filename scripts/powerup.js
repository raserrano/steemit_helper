const
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/current'),
  steem_api = require('../model/steem_api');

// Voting for donations
wait.launchFiber(function() {

  var accounts = wait.for(
    steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
  );

  var last_info = wait.for(utils.getDataLast,'Information',{},{created: -1});
  console.log(last_info);

  // wait.for(
  //   steem_api.steem_transferToVesting,
  //   [conf.env.ACCOUNT_NAME()],
  //   [conf.env.ACCOUNT_NAME()],
  //   '50.000 STEEM'
  // );
  console.log('Finish powerup');
  process.exit();
});