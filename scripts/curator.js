const
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/dev'),
  steem_api = require('../model/steem_api');

// Voting for quality comments
wait.launchFiber(function() {
  var accounts = wait.for(
    steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
  );
  var vp = utils.getVotingPower(accounts[0]);
  var weight = steem_api.calculateVoteWeight(accounts[0],vp,0.01);


steem.api.getTrendingTags(afterTag, limit, function(err, result) {
  console.log(err, result);
});


steem.api.getDiscussionsByTrending(query, function(err, result) {
  console.log(err, result);
});




steem.api.getDiscussionsByCreated(query, function(err, result) {
  console.log(err, result);
});



  var posts = wait.for(steem_api.steem_getPostsByTag,'introduceyourself');
  var report = utils.commentOnNewUserPost(posts,weight,accounts[0]);
  if (report.length > 0) {
    utils.generateCommentedReport(report);
  }
  console.log('Finish commenting new users');
  process.exit();
});