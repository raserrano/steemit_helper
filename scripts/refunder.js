const
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/dev'),
  steem_api = require('../model/steem_api');

// Voting for donations
wait.launchFiber(function() {
  var RECORDS_FETCH_LIMIT = 1000;

  var accounts = "";
  try{
    accounts = wait.for(
      steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
    );
  }catch(e){
    console.log(e);
    process.exit();
  }
  // Get not voted posts from DB
  var last_refunded = conf.env.LAST_REFUNDED();//wait.for(utils.getLastRefunded);
  // if (last_refunded.length === 0) {
  //   last_refunded = conf.env.LAST_REFUNDED();
  // }else {
  //   last_refunded = last_refunded[0].number;
  // }
  console.log('Last refunded: ' + last_refunded);
  if (conf.env.REFUNDS_ACTIVE()) {
    var refunds = wait.for(utils.getRefunds,last_refunded);
    console.log('Refunds to process: ' + refunds.length);
    utils.startRefundingProcess(
      conf.env.ACCOUNT_NAME(),
      refunds,
      accounts[0]
    );
  }else {
    console.log('Refunds not active');
  }
  console.log('Finish refund process');
  process.exit();
});