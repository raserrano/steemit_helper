const
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/dev'),
  steem_api = require('../model/steem_api');

// Voting for new users intro posts
wait.launchFiber(function() {
  var accounts = wait.for(
    steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
  );
  var weight = steem_api.calculateVoteWeight(accounts[0],0.04);
  var posts = wait.for(steem_api.steem_getPostsByTag,'introduceyourself',150);
  var report = utils.commentOnNewUserPost(posts,weight,accounts[0]);
  if (report.length > 0) {
    utils.generateCommentedReport(report);
  }
  console.log('Finish commenting new users');
  process.exit();
});