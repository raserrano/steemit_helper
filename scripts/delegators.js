var request = require('request'),
    cheerio = require('cheerio'),
    wait = require('wait.for'),
    utils = require('../model/util'),
    conf = require('../config/current');

var delegators = 'body > div > table > tbody > tr > td:nth-child(1) > table > tbody > tr';

wait.launchFiber(function() {
  var res = wait.for(request,'http://www.steemreports.com/delegation-info/?account='+conf.env.ACCOUNT_NAME())
  var $ = cheerio.load(res.body);
  const supporters = new Array();
  $(delegators).each(function(i,elem) {
    let delegatee = {};
    delegatee.username = $(this).find('td:nth-child(1)').text().trim();
    delegatee.sp = $(this).find('td:nth-child(2)').text().trim();
    supporters.push(delegatee);
  });
  console.log(supporters);
  // Drop all delegators
  wait.for(utils.cleanDelegators);
  // Insert all
  wait.for(utils.insertDelegators,supporters);
  console.log(`Finish retrieving delegators for ${conf.env.ACCOUNT_NAME()}`);
  process.exit();
});