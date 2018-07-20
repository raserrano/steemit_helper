const
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/dev'),
  steem_api = require('../model/steem_api');

// Voting for donations
wait.launchFiber(function() {
  var RECORDS_FETCH_LIMIT = 100;
  var accounts = '';
  try {
    accounts = wait.for(
      steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
    );
  }catch (e) {
    console.log(e);
    process.exit();
  }

  // Find last voted post number
  var last_voted = wait.for(utils.getLastTransfer);
  if (last_voted.length !== 0) {
    last_voted = last_voted[0].number;
  }else {
    last_voted = 0;
  }
  if (conf.env.LAST_VOTED() !== null && conf.env.LAST_VOTED() !== undefined) {
    last_voted = conf.env.LAST_VOTED();
  }
  console.log('Last: ' + last_voted);
  // Get latest transfer
  var max = '';
  try {
    max = wait.for(
      steem_api.getTransfers,
      conf.env.ACCOUNT_NAME(),
      10000000,
      1
    );
  }catch (e) {
    console.log(e);
    process.exit();
  }

  if ((max !== undefined) && (max !== null)) {
    max = max[max.length - 1][0];
  }
  utils.debug('Max is: ' + max);
  while (last_voted <= max) {
    from = parseInt(last_voted) + RECORDS_FETCH_LIMIT;
    utils.debug('Fetching from:' + from + ' of ' + max);
    // Process new transfers
    var results = wait.for(
      steem_api.getTransfers,
      conf.env.ACCOUNT_NAME(),
      from,
      RECORDS_FETCH_LIMIT
    );
    utils.getTransfersToVote(
      conf.env.ACCOUNT_NAME(),
      results
    );
    last_voted += RECORDS_FETCH_LIMIT;
  }
  var queue = wait.for(utils.getQueue);
  console.log('Queue to vote: ' + queue.length);
  utils.startVotingDonationsProcess(
    conf.env.ACCOUNT_NAME(),
    queue
  );
  console.log('Finish voting donations');
  process.exit();
});