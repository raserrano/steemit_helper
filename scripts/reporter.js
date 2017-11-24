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
  var followers = wait.for(
    steem_api.steem_getFollowersCount,
    conf.env.ACCOUNT_NAME()
  );
  var globalData = wait.for(
    steem_api.steem_getSteemGlobaleProperties_wrapper
  );
  var ci = steem_api.init_conversion(globalData);
  var steempower = steem_api.getSteemPower(voter[0]);
  var report_date = new Date();
  var lastDayOfMonth = new Date(
    report_date.getFullYear(),
    report_date.getMonth() + 1,
    0
  );
  console.log('Report date: ' + report_date);
  var report_period = 2;
  if (report_date.getDay() === 0) {
    console.log('Report weekly');
    report_period = 7;
  }
  if (report_date.getDate() === lastDayOfMonth.getDate()) {
    console.log('Last day of the month is: ' + lastDayOfMonth.getDate());
    report_period = lastDayOfMonth.getDate();
  }
  console.log('Creating report for ' + report_period);
  // Calculate rate
  var sdb_steem = ci.sbd_per_steem;
  // Total trees
  var trees = wait.for(utils.getTreesTotal);
  // Calculate unique donators
  var donators = wait.for(utils.getDonatorsTotal);
  // Average trees per day
  var average = 8.6;
  // Trees
  var options_trees = {
    rate: sdb_steem,
    trees: true,
    limit: 10,
  };
  var report_full = wait.for(utils.getReport,options_trees);
  // Period
  var options_period = {
    period: report_period,
    voted: true,
    rate: sdb_steem,
    trees: true,
  };
  var report_specific = wait.for(utils.getReport,options_period);
  utils.generateTreeplanterReport(
    (trees[0].total.toFixed(2) / 2),
    followers.follower_count,
    donators.length,
    average,
    steempower.toFixed(0),
    sdb_steem,
    report_period,
    report_full,
    report_specific
  );

  console.log('Finish report');
  process.exit();
});