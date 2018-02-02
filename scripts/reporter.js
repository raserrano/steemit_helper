const
  wait = require('wait.for'),
  utils = require('../model/util'),
  steem_api = require('../model/steem_api'),
  conf = require('../config/dev');
// Generates a report for the not voted posts of account
wait.launchFiber(function() {
  var voter = wait.for(
    steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
  );
  console.log(voter);
  var followers = wait.for(
    steem_api.steem_getFollowersCount,
    conf.env.ACCOUNT_NAME()
  );
  var globalData = wait.for(
    steem_api.steem_getSteemGlobaleProperties_wrapper
  );
  var ci = steem_api.init_conversion(globalData);
  var sbd_steem = parseFloat(ci.steem_to_dollar) / parseFloat(ci.sbd_to_dollar);
  console.log(sbd_steem);
  var steempower = steem_api.getSteemPower(voter[0]);
  var report_date = new Date();
  var lastDayOfMonth = new Date(
    report_date.getFullYear(),
    report_date.getMonth() + 1,
    0
  );
  console.log('Report date: ' + report_date);
  var report_period = 1;
  if (report_date.getDay() === 0) {
    console.log('Report weekly');
    report_period = 7;
  }
  if (report_date.getDate() === lastDayOfMonth.getDate()) {
    console.log('Last day of the month is: ' + lastDayOfMonth.getDate());
    report_period = lastDayOfMonth.getDate();
  }
  console.log('Creating report for ' + report_period);
  // Total trees
  var trees = wait.for(utils.getTreesTotal);
  // Calculate unique donators
  var donators = wait.for(utils.getDonatorsTotal);
  // Trees
  var options_trees = {
    rate: sbd_steem,
    trees: true,
    limit: 10,
  };
  var report_full = wait.for(utils.getReport,options_trees);
  // Period
  var options_period = {
    period: report_period,
    voted: true,
    rate: sbd_steem,
    trees: true,
  };
  var report_specific = wait.for(utils.getReport,options_period);
  utils.generateTreeplanterReport(
    trees[0].total.toFixed(2),
    followers.follower_count,
    donators.length,
    steempower.toFixed(0),
    ci,
    report_period,
    report_full,
    report_specific
  );

  console.log('Finish report');
  process.exit();
});