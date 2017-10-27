const
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/dev'),
  steem_api = require('../model/steem_api');

// Voting for high bids
wait.launchFiber(function() {
  var accounts = wait.for(
    steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
  );
  var weight = steem_api.calculateVoteWeight(accounts[0],0.01);
  var posts = wait.for(steem_api.steem_getPostsByTag,'introduceyourself');
  utils.commentOnNewUserPost(posts,weight);
  if (posts.length > 0) {
    utils.generateCommentedReport(posts);
  }
  console.log('Finish commenting new users');
  process.exit();
});