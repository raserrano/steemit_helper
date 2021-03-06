const steem = require('steem'),
  wait = require('wait.for'),
  request = require('request'),
  conf = require('../config/dev');

var ci = new Object()
steem.api.setOptions({ url: conf.env.NODE() });
module.exports = {
  getTransfers: function(name, max, limit, callback) {
    steem.api.getAccountHistory(name,max,limit,function(err, result) {
      callback(err, result);
    });
  },
  votePost: function(author, permlink, weight) {
    var action = 'Voting ' + author + ' ' + permlink;
    action += ' with weight of ' + weight;
    console.log(action);
    try {
      return wait.for(
        steem.broadcast.vote,
        conf.env.POSTING_KEY_PRV(),
        conf.env.ACCOUNT_NAME(),
        author,
        permlink,
        weight
      );
    }catch (e) {
      console.log(e);
    }
  },
  voteSupport: function(author, permlink, weight) {
    var action = 'Voting ' + author + ' ' + permlink;
    action += ' with weight of ' + weight;
    console.log(action);
    try {
      return wait.for(
        steem.broadcast.vote,
        conf.env.SUPPORT_ACCOUNT_KEY(),
        conf.env.SUPPORT_ACCOUNT(),
        author,
        permlink,
        weight
      );
    }catch (e) {
      console.log(e);
    }
  },
  commentPost: function(author, permlink, title, comment) {
    var result = '';
    console.log('Commenting post: ' + permlink);
    if(permlink !== null){
      var comment_permlink = steem.formatter.commentPermlink(
        author,
        permlink
      ).toLowerCase().replace(/\./g,'');
      console.log('Comment permlink: ' + comment_permlink);
      if (comment_permlink.length < 200) {
        try {
          result = wait.for(
            steem.broadcast.comment,
            conf.env.POSTING_KEY_PRV(),
            author,
            permlink,
            conf.env.ACCOUNT_NAME(),
            comment_permlink,
            title,
            comment,
            {}
          );
        }catch (e) {
          console.log(e);
        }
      }
    }
    return result;
  },
  publishPost: function(author, permlink, tags, title, body) {
    var permlink = permlink.replace(/\./g,'');
    console.log('Publising post:' + permlink);
    try {
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
    }catch (e) {
      console.log(e);
    }
  },
  publishPostOptions: function(author, permlink, percent, ext) {
    var maxAcceptedPayout = '1000000.000 SBD';
    var allowVotes = true;
    var allowCurationRewards = true;
    var extensions = ext;
    try {
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
    }catch (e) {
      console.log(e);
    }
  },
  publishPostOptionsAsync: function(author, permlink, tags, title, bodyText, percent, ext) {
    var  operations = [
      ['comment',
        {
          parent_author: '',
          parent_permlink: 'report',
          author: author,
          permlink,
          title: title,
          body: bodyText,
          json_metadata: JSON.stringify(tags),
        },
      ],
      ['comment_options',
        {
          author: author,
          permlink,
          max_accepted_payout: '1000000.000 SBD',
          percent_steem_dollars: percent,
          allow_votes: true,
          allow_curation_rewards: true,
          extensions: ext,
        },
      ],
    ];
    return wait.for(
      steem.broadcast.sendAsync,
      { operations, extensions: [] },
      { posting: conf.env.POSTING_KEY_PRV() }
    );
  },
  steem_getContent: function(author, post, callback) {
    steem.api.getContent(author, post,function(err,result) {
      callback(err, result);
    });
  },
  steem_getAccounts_wrapper: async function(accounts, callback) {
    await steem.api.getAccounts(accounts, function(err, result) {
      callback(err, result);
    });
  },
  steem_getAccountCount_wrapper: function(callback) {
    steem.api.getAccountCount(function(err, result) {
      callback(err, result);
    });
  },
  steem_getFollowers: function(following, start, type, limit, callback) {
    steem.api.getFollowers(following,start,type,limit,function(err, result) {
      callback(err, result);
    });
  },
  steem_getFollowersCount: function(following, callback) {
    steem.api.getFollowCount(following,function(err, result) {
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
  steem_getPostsByTag: function(tag, amount, callback) {
    steem.api.getDiscussionsByCreated(
      {tag: tag, limit: amount},
      function(err, result) {
        callback(err, result);
      }
    );
  },
  steem_getPostsByAuthor: function(author, amount, callback) {
    steem.api.getDiscussionsByBlog(
      {tag: author, limit: amount},
      function(err, result) {
        if (err) {
          console.log(err);
        }
        callback(err, result);
      }
    );
  },
  steem_getComments: function(author, callback) {
    steem.api.getDiscussionsByComments(
      {start_author: author,limit: 10},
      function(err, result) {
        if (err) {
          console.log(err);
        }
        callback(err, result);
      }
    );
  },
  steem_transferToVesting: function(from, to, amount) {
    steem.broadcast.transferToVesting(
      conf.env.WIF(),
      from,
      to,
      amount,
      function(err, result) {
        console.log(err, result);
      }
    );
  },
  doTransfer: function(from, to, amount, memo, callback) {
    steem.broadcast.transfer(
      conf.env.WIF(),
      from,
      to,
      amount,
      memo,
      function(err, result) {
        callback(err, result);
      }
    );
  },
  claimRewards: function(account, steem_val, sbd_val, vests, callback) {
    steem.broadcast.claimRewardBalance(
      conf.env.POSTING_KEY_PRV(),
      account,
      steem_val,
      sbd_val,
      vests,
      function(err, result) {
        callback(err, result);
      }
    );
  },
  verifyAccountHasVoted: function(account, result) {
    var pos = 0;
    var votes = new Array();
    if (result.active_votes.length > 0) {
      for (var i = 0; i < result.active_votes.length;i++) {
        votes.push(result.active_votes[i].voter);
      }
    }
    // Console.log(account);
    // console.log('Votes: ' + votes);
    // console.log('Voted: ' + votes.some(r=> account.includes(r)));
    return votes.some(r=> account.includes(r));
  },
  getSteemPower: function(account) {
    var globalData = wait.for(
      this.steem_getSteemGlobaleProperties_wrapper
    );
    var vp = account.voting_power;
    var vestingSharesParts = account.vesting_shares.split(' ');
    var receivedSharesParts = account.received_vesting_shares.split(' ');
    var delegatedSharesParts = account.delegated_vesting_shares.split(' ');
    var totalVests =
      (
        parseFloat(vestingSharesParts[0]) + parseFloat(receivedSharesParts[0])
        ) - parseFloat(delegatedSharesParts[0]);
    // Console.log('Total vests: ' + totalVests);
    return this.getSteemPowerFromVest(globalData,totalVests);
  },
  calculateVoteWeight: function(account, vp, target_value) {
    var globalData = wait.for(
      this.steem_getSteemGlobaleProperties_wrapper
    );
    var ci = this.init_conversion(globalData);
    var steempower = this.getSteemPower(account);
    var sp_scaled_vests = steempower / ci.steem_per_vest;
    var f = target_value / (sp_scaled_vests * 100 * ci.reward_pool * ci.sbd_per_steem);
    var votingpower = parseInt((((f * 50) - 49) / vp) * 10000);
    if (votingpower > 10000) {
      votingpower = 10000;
    }
    return votingpower;
  },
  init_conversion: function(globalData, callback) {
    var ci = new Object();
    // Get some info first
    var headBlock = wait.for(
      this.steem_getBlockHeader_wrapper,
      globalData.head_block_number
    );
    latestBlockMoment = new Date(headBlock.timestamp);
    ci.rewardfund_info = wait.for(
      this.steem_getRewardFund_wrapper,
      'post'
      );

    ci.price_info = wait.for(
      this.steem_getCurrentMedianHistoryPrice_wrapper
    );
    ci.reward_balance = ci.rewardfund_info.reward_balance;
    ci.recent_claims = ci.rewardfund_info.recent_claims;
    ci.reward_pool = ci.reward_balance.replace(' STEEM', '')
      / ci.recent_claims;

    ci.sbd_per_steem = ci.price_info.base.replace(' SBD', '')
      / ci.price_info.quote.replace(' STEEM', '');

    ci.steem_per_vest =
      globalData.total_vesting_fund_steem.replace(' STEEM', '')
      / globalData.total_vesting_shares.replace(' VESTS', '');
    ci.steem_to_dollar = wait.for(
      request,
      'https://api.coinmarketcap.com/v1/ticker/steem/'
    );
    ci.steem_to_dollar = JSON.parse(ci.steem_to_dollar.body)[0].price_usd;
    ci.sbd_to_dollar = wait.for(
      request,
      'https://api.coinmarketcap.com/v1/ticker/steem-dollars/'
    );
    ci.sbd_to_dollar = JSON.parse(ci.sbd_to_dollar.body)[0].price_usd;
    return ci;
  },
  getSteemPowerFromVest: function(globalData, vest) {
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
};
