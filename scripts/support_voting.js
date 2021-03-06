const
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/current'),
  steem_api = require('../model/steem_api');

// Voting for donations
wait.launchFiber(function() {
  var links = wait.for(utils.getData,'Link',{});
  var weight =  conf.env.WEIGHT();
  console.log('Links to vote: ' + links.length);
  for (var i = 0; i < links.length;i++) {
    var voter = wait.for(
       steem_api.steem_getAccounts_wrapper,[conf.env.SUPPORT_ACCOUNT()]
    );
    var vp = utils.getVotingPower(voter[0]);
    if (vp >= conf.env.MIN_VOTING_POWER()) {
      var diff = utils.dateDiff(links[i].created);
      if (diff > (60 * 15)) {
        if (diff < (60 * 60)) {
          steem_api.voteSupport(links[i].author, links[i].url, weight);
          wait.for(utils.deleteLink,{_id: links[i]._id});
          wait.for(utils.timeout_wrapper,5100);
        }else {
          wait.for(utils.deleteLink,{_id: links[i]._id});
        }
      }
    }else {
      console.log('VP too low to vote: ' + vp);
      break;
    }
  }
  console.log('Finish voting links');
  process.exit();
});