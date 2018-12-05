const
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/current'),
  steem_api = require('../model/steem_api');

// Voting for new users intro posts
wait.launchFiber(function() {
  var accounts = '';
  try {
    accounts = wait.for(
      steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
    );
  }catch (e) {
    console.log(e);
    process.exit();
  }
  var posts = wait.for(steem_api.steem_getPostsByTag,conf.env.TAG(),100);
  var report = utils.communitySupport(posts,conf.env.WEIGHT(),accounts[0]);
  if (report.length > 0) {
    utils.generateCommunityReport(report);
  }
  console.log('Finish commenting new users');
  process.exit();
});