const
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/dev'),
  steem_api = require('../model/steem_api');

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
  var posts = wait.for(steem_api.steem_getPostsByTag,conf.env.TAG(),5);
  var report = utils.votePostsByTag(posts,conf.env.WEIGHT());
  console.log('Finish voting #{conf.env.TAG} posts');
  process.exit();
});