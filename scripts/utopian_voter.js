const
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/dev'),
  steem_api = require('../model/steem_api');

// Voting for new users intro posts
wait.launchFiber(function() {
  var accounts = "";
  try{
    accounts = wait.for(
      steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
    );
  }catch(e){
    console.log(e);
    process.exit();
  }
  var weight = 2000;
  var posts = wait.for(steem_api.steem_getPostsByTag,'utopian-io',5);
  var report = utils.votePostsByTag(posts,weight);
  console.log('Finish voting utopian-io posts');
  process.exit();
});