const
  wait = require('wait.for'),
  utils = require('../model/util'),
  steem_api = require('../model/steem_api'),
  fs = require('fs'),
  sprintf = require('sprintf-js').sprintf,
  conf = require('../config/current');
// Generates a report on sunday
wait.launchFiber(function() {
  // Things that I need to do for the growth report
  // capture SP, reputation, followers count
  // Calculate vote value
  var account = {};
  var voter = '';
  var followers = '';
  var globalData = '';
  try {
    voter = wait.for(
      steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
    );
    followers = wait.for(
      steem_api.steem_getFollowersCount,
      conf.env.ACCOUNT_NAME()
    );
    globalData = wait.for(
      steem_api.steem_getSteemGlobaleProperties_wrapper
    );
  }catch (e) {
    console.log(e);
    process.exit();
  }
  var ci = steem_api.init_conversion(globalData);
  var steempower = steem_api.getSteemPower(voter[0]);
  account.created = new Date();

  account.username = conf.env.ACCOUNT_NAME();
  account.followers = followers.follower_count;
  account.sp = steempower.toFixed(3);
  account.votingpower = parseInt(utils.getVotingPower(voter[0])) / 100;

  var m = parseInt(100 * account.votingpower * (100 * 100) / 10000);
  m = parseInt((m + 49) / 50);
  var i = parseFloat(ci.reward_balance.replace(' STEEM', '')) /
    parseFloat(ci.recent_claims);
  var o = parseFloat(ci.price_info.base.replace(' SBD', '')) /
    parseFloat(ci.price_info.quote.replace(' STEEM', ''));
  var a = globalData.total_vesting_fund_steem.replace(' STEEM', '') /
    globalData.total_vesting_shares.replace(' VESTS', '');
  var r = account.sp / a;
  var vote = parseInt(r * m * 100) * i * o;
  account.vote = vote.toFixed(2);
  account.reputation = utils.getReputation(voter[0]);

  var when = utils.getDate(account.created);
  var permlink = account.username + '-growth-' + when;
  var title = 'Growth report for ' + when;

  var contents_1 = fs.readFileSync('./reports/growth.md', 'utf8');
  var tags = {};
  var pictures = {};
  var contents_2 = '';

  if (conf.env.ACCOUNT_NAME() === 'tuanis') {
    tags = {tags: ['helpmejoin','minnowsupportproject','minnows','busy']};
    pictures = JSON.parse(fs.readFileSync('./reports/tuanis_pics.json', 'utf8'));
    var footer = fs.readFileSync('./reports/footer_tuanis.md', 'utf8');
    contents_2 += footer;
  }
  var data = {
    followers: account.followers,
    reputation: account.reputation,
    vote: account.vote,
    sp: account.sp,
    picture: pictures.pics[utils.getRandom(pictures.pics.length,1)],
    minimum: conf.env.MIN_DONATION(),
    maximum: conf.env.MAX_DONATION(),
    multiplier: conf.env.VOTE_MULTIPLIER(),
  };
  var body = sprintf(contents_1, data);
  body += contents_2;
  if (conf.env.DAYS().includes(account.created.getDay().toString())) {
    utils.preparePost(
      conf.env.ACCOUNT_NAME(),
      permlink,
      title,
      body,
      tags
    );
  }
  console.log('Finish report');
  process.exit();
});