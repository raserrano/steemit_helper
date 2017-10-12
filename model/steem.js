const steem = require('steem');

steem.config.set('websocket',configs[0]);

function getTransfers(name,max,limit,callback){
  debug('Getting transfers for: '+name);
  steem.api.getAccountHistory(name,max,limit,function(err,result){
    callback(err,result);
  });
}

function votePost(author,permlink,weight){
  return wait.for(
    steem.broadcast.vote,
    process.env.POSTING_KEY_PRV,
    process.env.ACCOUNT_NAME,
    author,
    permlink,
    weight);
}

function steem_getContent(author,post,callback){
  steem.api.getContent(author, post,function(err,result){
    callback(err,result);
  });
}

function steem_getAccounts_wrapper(accounts, callback) {
  steem.api.getAccounts(accounts, function(err, result) {
    callback(err, result);
  });
}

function steem_getSteemGlobaleProperties_wrapper(callback) {
  steem.api.getDynamicGlobalProperties(function(err, properties) {
    callback(err, properties);
  });
}

function steem_getBlockHeader_wrapper(blockNum, callback) {
  steem.api.getBlockHeader(blockNum, function(err, result) {
    callback(err, result);
  });
}

function steem_getRewardFund_wrapper(type, callback) {
  steem.api.getRewardFund(type, function (err, data) {
    callback(err, data);
  });
}

function steem_getCurrentMedianHistoryPrice_wrapper(callback) {
  steem.api.getCurrentMedianHistoryPrice(function(err, result) {
    callback(err, result);
  });
}

function verifyAccountHasVoted(account,result){
  var pos = false;
  var votes = new Array();
  if(result.active_votes.length > 0){
    for(var i=0; i< result.active_votes.length;i++){
      votes.push(result.active_votes[i].voter);
    }
    // TODO: verify that account is an array and iterate it for votes
    //debug(JSON.stringify(votes));
    //debug(account[0]+'found '+(votes.indexOf(account[0])!= -1));
    // debug(account[1]+'found '+(votes.indexOf(account[1])!= -1));
    pos = (votes.indexOf(account[0]) != -1);
    //pos = ((votes.indexOf(account[0]) != -1)&&(votes.indexOf(account[1]) != -1));
    //debug(pos);
  }
  return pos;
}

function calculateVoteWeight(account){
  var vp = account.voting_power;
  var vestingSharesParts = account.vesting_shares.split(" ");
  var vestingSharesNum = Number(vestingSharesParts[0]);
  var receivedSharesParts = account.received_vesting_shares.split(" ");
  var receivedSharesNum = Number(receivedSharesParts[0]);
  var totalVests = vestingSharesNum + receivedSharesNum;

  var steempower = getSteemPowerFromVest(totalVests);
  var sp_scaled_vests = steempower / conversionInfo.steem_per_vest;

  var voteweight = 100;

  var oneval = (0.1 * 52) / (sp_scaled_vests * 100
    * conversionInfo.reward_pool * conversionInfo.sbd_per_steem);

  var votingpower = (oneval / (100 * (100 * voteweight) / VOTE_POWER_1_PC)) * 100;

  if (votingpower > 100) {
    votingpower = 100;
  }

  return votingpower*VOTE_POWER_1_PC;
}

function init_conversion(callback) {
  // get some info first
  var headBlock = wait.for(steem_getBlockHeader_wrapper, globalData.head_block_number);
  latestBlockMoment = new Date(headBlock.timestamp);
  debug("Latest block :"+latestBlockMoment);
  conversionInfo.rewardfund_info = wait.for(steem_getRewardFund_wrapper, "post");
  conversionInfo.price_info = wait.for(steem_getCurrentMedianHistoryPrice_wrapper);

  conversionInfo.reward_balance = conversionInfo.rewardfund_info.reward_balance;
  conversionInfo.recent_claims = conversionInfo.rewardfund_info.recent_claims;
  conversionInfo.reward_pool = conversionInfo.reward_balance.replace(" STEEM", "")
    / conversionInfo.recent_claims;

  conversionInfo.sbd_per_steem = conversionInfo.price_info.base.replace(" SBD", "")
    / conversionInfo.price_info.quote.replace(" STEEM", "");
  debug("sbd_per_steem = "+conversionInfo.sbd_per_steem);

  conversionInfo.steem_per_vest = globalData.total_vesting_fund_steem.replace(" STEEM", "")
    / globalData.total_vesting_shares.replace(" VESTS", "");
  request('https://api.coinmarketcap.com/v1/ticker/steem/', function (err, response, body) {
    if (err) {
      debug("error getting price of steem from coinmarketcap");
      conversionInfo.steem_to_dollar = 1;
    } else {
      var data = JSON.parse("{\"data\":"+body+"}");
      conversionInfo.steem_to_dollar = data["data"][0]["price_usd"];
      debug("got price of steem: "+conversionInfo.steem_to_dollar);
    }
  });
}

function getSteemPowerFromVest(vest) {
  try {
    return steem.formatter.vestToSteem(
      vest,
      parseFloat(globalData.total_vesting_shares),
      parseFloat(globalData.total_vesting_fund_steem)
    );
  } catch(err) {
    return 0;
  }
}