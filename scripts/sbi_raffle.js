const
  wait = require('wait.for'),
  utils = require('../model/util'),
  steem_api = require('../model/steem_api'),
  fs = require('fs'),
  sprintf = require('sprintf-js').sprintf,
  conf = require('../config/current');

wait.launchFiber(function() {
  var today = new Date();
  var when = utils.getDate(new Date());
  var title = conf.env.ACCOUNT_NAME() + ' SBI raffle for supporters!!! ' + when;
  var permlink = conf.env.ACCOUNT_NAME() + '-sbi-raffle-' + when;
  var tags = {tags: ['sbi', 'steembasicincome', 'busy', 'bot']};
  var header = 'SBI raffle for supporters!!!';
  var template = fs.readFileSync('./reports/sbi_post.md', 'utf8');
  var footer = '';

  var voter = wait.for(
    steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
  );
  var steem_amount = voter[0].balance.split(' ');
  if((parseFloat(steem_amount[0]) >= 2)&&(conf.env.DAYS().includes(today.getDay().toString()))){
    var delegators = wait.for(utils.getData,'Delegator',{})
    var lucky = utils.getRandom(delegators.length, 1);
    footer += fs.readFileSync('./reports/tuanis_delegation.md', 'utf8');
    footer += fs.readFileSync('./reports/footer_tuanis.md', 'utf8');
    footer += fs.readFileSync('./reports/firma_tuanis.md', 'utf8');
    var data = {
      winners: delegators[lucky].username
    }
    var body = sprintf(
      template,
      data
    );
    body += footer;
    wait.for(
      steem_api.doTransfer,
      conf.env.ACCOUNT_NAME(),
      'steembasicincome',
      '1.000 STEEM',
      delegators[lucky].username
    );
    console.log(`SBI winner: ${delegators[lucky].username}`);
    utils.preparePost(
      conf.env.ACCOUNT_NAME(),
      permlink,
      title,
      body,
      tags
    );
  }

  console.log('Finish SBI program');
  process.exit();
});