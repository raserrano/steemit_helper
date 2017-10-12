const
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/dev'),
  steem_api = require('../model/steem_api');
  
// Voting for high bids
wait.launchFiber(function(){
  var globalData = wait.for(steem_api.steem_getSteemGlobaleProperties_wrapper);
  var conversionInfo = steem_api.init_conversion(globalData);
  var accounts = wait.for(
    steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
  );
  var weight = steem_api.calculateVoteWeight(
    conversionInfo,
    globalData,
    accounts[0]
  );
  var posts = wait.for(steem_api.steem_getPostsByTag,"introduceyourself");
  utils.commentOnNewUserPost(posts,weight);
  console.log('Finish commenting new users');
  process.exit();
});