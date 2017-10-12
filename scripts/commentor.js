const
  wait = require('wait.for');
  
// Voting for high bids
wait.launchFiber(function(){
  var max = 10000000;
  var limit = 50;
  globalData = wait.for(steem_getSteemGlobaleProperties_wrapper);
  var accounts = wait.for(steem_getAccounts_wrapper,[process.env.ACCOUNT_NAME]);
  var accounts_to = process.env.VOTING_ACCS.split(',');
  var results_booster = wait.for(getTransfers,accounts_to[0],max,limit);
  init_conversion();
  // debug(conversionInfo);
  var weight = calculateVoteWeight(accounts[0]);
  startVotingProcess(accounts_to[0],results_booster,weight);

  var results_belly = wait.for(getTransfers,accounts_to[1],max,limit);
  startVotingProcess(accounts_to[1],results_belly,weight);

  var results_minnow = wait.for(getTransfers,accounts_to[2],max,limit);
  startVotingProcess(accounts_to[2],results_minnow,weight);
  // var results_belly = wait.for(getTransfers,accounts_to[1],max,limit);
  // var results_minnowbooster = wait.for(getTransfers,accounts_to[2],max,limit);
});