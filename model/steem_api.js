const steem = require('steem'),
  wait = require('wait.for'),
  request = require('request'),
  conf = require('../config/dev');

var conversionInfo = new Object()

steem.config.set('websocket',conf.websockets[0]);

module.exports = {
  getTransfers: function(name,max,limit,callback) {
    steem.api.getAccountHistory(name,max,limit,function(err,result) {
      callback(err,result);
    });
  },
  votePost: function(author,permlink,weight) {
    return wait.for(
      steem.broadcast.vote,
      conf.env.POSTING_KEY_PRV(),
      conf.env.ACCOUNT_NAME(),
      author,
      permlink,
      weight);
  },
  commentPost: function(author,permlink,title,comment) {
    var permlink = permlink.replace('.','');
    return wait.for(
      steem.broadcast.comment,
      conf.env.POSTING_KEY_PRV(),
      author,
      permlink,
      conf.env.ACCOUNT_NAME(),
      steem.formatter.commentPermlink(
        author,
        permlink
      ).toLowerCase(),
      title,
      comment,
      {}
    );
  },
  publishPost: function(author, permlink, tags,title, body) {
    return wait.for(
      steem.broadcast.comment,
      conf.env.POSTING_KEY_PRV(),
      '',
      'report',
      author,
      permlink,
      title,
      body,
      tags
    );
  },
  publishPostOptions: function(author, permlink,percent) {
    var maxAcceptedPayout = '1000000.000 SBD';
    var allowVotes = true;
    var allowCurationRewards = true;
    var extensions = [];
    return wait.for(
      steem.broadcast.commentOptions,
      conf.env.POSTING_KEY_PRV(),
      author,
      permlink,
      maxAcceptedPayout,
      percent,
      allowVotes,
      allowCurationRewards,
      extensions

    );
  },
  steem_getContent: function(author,post,callback) {
    steem.api.getContent(author, post,function(err,result) {
      callback(err,result);
    });
  },
  steem_getAccounts_wrapper: function(accounts, callback) {
    steem.api.getAccounts(accounts, function(err, result) {
      callback(err, result);
    });
  },
  steem_getSteemGlobaleProperties_wrapper: function(callback) {
    steem.api.getDynamicGlobalProperties(function(err, properties) {
      callback(err, properties);
    });
  },
  steem_getBlockHeader_wrapper: function(blockNum, callback) {
    steem.api.getBlockHeader(blockNum, function(err, result) {
      callback(err, result);
    });
  },
  steem_getRewardFund_wrapper: function(type, callback) {
    steem.api.getRewardFund(type, function(err, data) {
      callback(err, data);
    });
  },
  steem_getCurrentMedianHistoryPrice_wrapper: function(callback) {
    steem.api.getCurrentMedianHistoryPrice(function(err, result) {
      callback(err, result);
    });
  },
  steem_getPostsByTag: function(tag,callback) {
    steem.api.getDiscussionsByCreated(
      {tag: tag, limit: 20},
      function(err, result) {
        callback(err,result);
      }
    );
  },
  doTransfer: function(from, to, amount, memo){
    steem.broadcast.transfer(
      conf.env.WIF(),
      from,
      to,
      amount,
      memo,
      function(err, result) {
        console.log(err, result);
      }
    );
  },
  claimRewards: function(account, steem_val, sbd_val,vests){
    steem.broadcast.claimRewardBalance(
      conf.env.POSTING_KEY_PRV(),
      account,
      steem_val,
      sbd_val,
      vests,
      function(err, result) {
        console.log(err, result);
      }
    );
  },
  verifyAccountHasVoted: function(account,result) {
    var pos = 0;
    var votes = new Array();
    if (result.active_votes.length > 0) {
      for (var i = 0; i < result.active_votes.length;i++) {
        votes.push(result.active_votes[i].voter);
      }
      // console.log(votes);
      for (var j = 0;j < account.length;j++) {
        var match = '';
        if (account[j] instanceof Function) {
          match = account[j]();
        }else {
          match = account[j];
        }
        if (votes.indexOf(match) != -1) {
          pos++;
          break;
        }
      }
    }
    return pos !== 0;
  },
  calculateVoteWeight: function(account,target_value) {
    // Still need to figure out what is this for
    var globalData = wait.for(steem_api.steem_getSteemGlobaleProperties_wrapper);
    //Console.log('Global data: '+JSON.stringify(globalData));
    var conversionInfo = steem_api.init_conversion(globalData);
    //Console.log('Conversion infor: '+JSON.stringify(conversionInfo));

    // Manual calcs
    var vp = account.voting_power;
    //Console.log('voting_power: '+vp);
    var vestingSharesParts = account.vesting_shares.split(' ');
    //Console.log('vesting_shares: '+vestingSharesParts[0]);
    var receivedSharesParts = account.received_vesting_shares.split(' ');

    //Console.log('received_vesting_shares: '+receivedSharesParts[0]);
    var totalVests =
      parseFloat(vestingSharesParts[0]) + parseFloat(receivedSharesParts[0]);
    //Console.log('Total vests: '+totalVests);

    var steempower = this.getSteemPowerFromVest(globalData,totalVests);
    //Console.log('Steempower: '+steempower);

    var sp_scaled_vests = steempower / conversionInfo.steem_per_vest;
    //Console.log('sp_scaled_vests: '+sp_scaled_vests);

    var voteweight = 100;
    var up = target_value * 52;
    //Console.log('Up: '+up);
    var down = sp_scaled_vests * 100 * conversionInfo.reward_pool * conversionInfo.sbd_per_steem;
    //Console.log('Down: '+down);
    var oneval = up / down;
    //Console.log("oneval: " + oneval);

    var votingpower = (oneval / (100 * (100 * voteweight) / conf.env.VOTE_POWER_1_PC())) * 100;
    //Console.log('Voting power: '+votingpower);
    if (votingpower > 100) {
      votingpower = 100;
    }
    return parseInt(votingpower * conf.env.VOTE_POWER_1_PC());
  },
  init_conversion: function(globalData,callback) {
    var conversionInfo = new Object();
    // Get some info first
    var headBlock = wait.for(
      this.steem_getBlockHeader_wrapper,
      globalData.head_block_number
    );
    latestBlockMoment = new Date(headBlock.timestamp);
    conversionInfo.rewardfund_info = wait.for(
      this.steem_getRewardFund_wrapper,
      'post'
      );
    conversionInfo.price_info = wait.for(
      this.steem_getCurrentMedianHistoryPrice_wrapper
    );

    conversionInfo.reward_balance = conversionInfo.rewardfund_info.reward_balance;
    conversionInfo.recent_claims = conversionInfo.rewardfund_info.recent_claims;
    conversionInfo.reward_pool = conversionInfo.reward_balance.replace(' STEEM', '')
      / conversionInfo.recent_claims;

    conversionInfo.sbd_per_steem = conversionInfo.price_info.base.replace(' SBD', '')
      / conversionInfo.price_info.quote.replace(' STEEM', '');

    conversionInfo.steem_per_vest = globalData.total_vesting_fund_steem.replace(' STEEM', '')
      / globalData.total_vesting_shares.replace(' VESTS', '');
    request(
      'https://api.coinmarketcap.com/v1/ticker/steem/',
      function(err, response, body) {
        if (err) {
          conversionInfo.steem_to_dollar = 1;
        } else {
          var data = JSON.parse('{"data":' + body + '}');
          conversionInfo.steem_to_dollar = data['data'][0]['price_usd'];
        }
      }
    );
    return conversionInfo;
  },
  getSteemPowerFromVest: function(globalData,vest) {
    try {
      return steem.formatter.vestToSteem(
        vest,
        parseFloat(globalData.total_vesting_shares),
        parseFloat(globalData.total_vesting_fund_steem)
      );
    } catch (err) {
      return 0;
    }
  },
}