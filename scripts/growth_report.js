const
  wait = require('wait.for'),
  utils = require('../model/util'),
  steem_api = require('../model/steem_api'),
  conf = require('../config/dev');
// Generates a report on sunday
wait.launchFiber(function() {
  // Things that I need to do for the growth report
  // capture SP, reputation, followers count
  // Calculate vote value0
  var voter = wait.for(
    steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
  );
  var followers = wait.for(
    steem_api.steem_getFollowersCount,
    conf.env.ACCOUNT_NAME()
  );
  var globalData = wait.for(
    steem_api.steem_getSteemGlobaleProperties_wrapper
  );
  var ci = steem_api.init_conversion(globalData);
  var steempower = steem_api.getSteemPower(voter[0]);
  var created = new Date();


  // Saving the data
  var username = conf.env.ACCOUNT_NAME();
  var followers = followers.follower_count;
  var sp = steempower.toFixed(3);
  var votingpower = parseInt(utils.getVotingPower(voter[0])) / 100;

  var m = parseInt(100 * votingpower * (100 * 100) / 10000);
  m = parseInt((m + 49) / 50);
  var i = parseFloat(ci.reward_balance.replace(' STEEM', ''))
    / parseFloat(ci.recent_claims);
  var o = parseFloat(ci.price_info.base.replace(' SBD', ''))
    / parseFloat(ci.price_info.quote.replace(' STEEM', ''));
  var a = globalData.total_vesting_fund_steem.replace(' STEEM', '')
    / globalData.total_vesting_shares.replace(' VESTS', '')
  var r = sp / a;
  var vote = parseInt(r * m * 100) * i * o;
  vote = vote.toFixed(2);

  var reputation = utils.getReputation(voter[0]);

  var account = {
    username,
    reputation,
    followers,
    sp,
    vote,
    created,
  }
  if (created.getDay() === 1) {
    utils.generateGrowthReport(
      account
    );
  }
  console.log('Finish report');
  process.exit();
});