const
  wait = require('wait.for'),
  utils = require('../model/util'),
  steem_api = require('../model/steem_api'),
  conf = require('../config/dev');
// Daily stats
wait.launchFiber(function() {
  var voter = "";
  var globalData = "";
  try{
    voter = wait.for(
      steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
    );
  }catch(e){
    console.log(e);
    process.exit();
  }
  var report_date = new Date();
  console.log('Report date: ' + report_date);
  // Status
  var options_status = {
    voted: true,
    limit: 10
  };
  var report_status = wait.for(utils.getReport,options_status);

  // Not voted
  var options_queue = {
    voted: false,
  };
  var report_queue = wait.for(utils.getReport,options_status);

  console.log(JSON.stringify(report_status));
  console.log(JSON.stringify(report_queue));
  utils.generateStatusReport(
    report_status,
    options_queue
  );

  console.log('Finish status report');
  process.exit();
});