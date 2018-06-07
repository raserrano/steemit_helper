const
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/dev'),
  steem_api = require('../model/steem_api');

// Voting for donations
wait.launchFiber(function() {
  var links = wait.for(utils.getLinks);
  var weight =  conf.env.WEIGHT();
  console.log('Links to vote: ' + links.length);
  for(var i=0; i < links.length;i++){
  	var voter = wait.for(
      steem_api.steem_getAccounts_wrapper,[conf.env.SUPPORT_ACCOUNT()]
  	);
  	var vp = utils.getVotingPower(voter[0]);
  	if (vp >= 7500) {
	  	if(utils.dateDiff(links[i].created)<1200){
	  		steem_api.voteSupport(links[i].author, links[i].permlink, weight);
	  	}
  	}else{
      break;
    }
  }
  console.log('Finish voting donations');
  process.exit();
});