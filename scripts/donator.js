const
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/dev'),
  steem_api = require('../model/steem_api');

// Voting for donations
wait.launchFiber(function(){
  var accounts = wait.for(
    steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
  );
  
  // Find last voted post number
  var last_voted = wait.for(utils.getLastVoted);
  if(last_voted.length === 0){
    last_voted = 100000;
  }else{
    last_voted = last_voted[0].number; 
  }
  console.log('Last: '+last_voted);

  utils.debug('Donations for '+conf.env.ACCOUNT_NAME());
  var results_to = wait.for(
    steem_api.getTransfers,
    conf.env.ACCOUNT_NAME(),
    last_voted+100,
    100
  );
  // Process new transfers
  console.log('Got transfers: '+results_to.length);
  utils.getTransfersToVoteReport([conf.env.ACCOUNT_NAME()],results_to,"donate",0.1,0.25);


  // Get not voted posts from DB
  var queue = wait.for(utils.getQueue);
  console.log('Queue length: '+queue.length);
  // console.log('Transfers length: '+results_to.length);
  // queue.push.apply(queue,results_to);
  // console.log('Combined length: '+queue.length);


  // recalculate weight;

  console.log('Finish voting donations');
  process.exit();
});