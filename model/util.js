const
  wait = require('wait.for'),
  conf = require('../config/dev'),
  db = require('./db'),
  fs = require('fs'),
  sprintf = require('sprintf-js').sprintf,
  steem_api = require('./steem_api');

module.exports = {
  getTransfersToVoteReport: function(account,data,min,max) {
    for (var i = 0; i < data.length;i++) {
      if (data[i][1].op[0] == 'transfer') {
        if (data[i][1].op[1].to == account) {
          var res = this.getContent([account],data[i]);
          if (res !== null) {
            if (!res.voted) {
              if (res.amount >= min) {
                console.log(JSON.stringify(res));
              }else {
                this.debug('Transfered amount is not greater than MIN: ' + min);
              }
            }else {
              this.debug('Already voted');
            }
          }else {
            this.debug(
              'Could not find content for transfer: ' + JSON.stringify(data[i])
            );
          }
        }
      }
    }
  },
  getTransfersToVote: function(account,data) {
    var memo = 'You have send too many donation, let others donate or come back later on.';
    var i = 0;
    while (i < data.length) {
      if (data[i][1].op[0] == 'transfer') {
        if (data[i][1].op[1].to == account) {
          var res = this.getContent([account],data[i]);
          var query = {$and: [{author: res.author},{url: res.url}]};
          var found = wait.for(this.getData,'Transfer',query);
          this.debug('New transfer to process');
          this.debug(res);
          this.debug('Found within our records?');
          this.debug(found.length);
          if (found.length > 0) {
            var status_ok = (found[0].status !== 'refunded') ||
            (found[0].status !== 'due date') ||
            (found[0].status !== 'min amount') ||
            (found[0].status !== 'abuse');
            if (status_ok) {
              // Abuse rule
              var abuse_count = wait.for(this.getQueueForPayer,res.payer);
              this.debug('Abuse count: ' + abuse_count.length)
              // If (abuse_count.length <= conf.env.ABUSE_COUNT()) {
              // this.debug('Upsert new transfer, found');
              // this.debug(found)
              wait.for(this.upsertModel,'Transfer',query,found);
              // }else {
              //   found[0].status = 'abuse';
              //   wait.for(this.upsertModel,'Transfer',query,found);
              //   wait.for(
              //     steem_api.doTransfer,
              //     account,
              //     res.payer,
              //     res.amount.toFixed(3) + ' ' + res.currency,
              //     memo
              //   );
              // }
            }
          }else {
            this.debug('Upsert new transfer, new')
            this.debug(res)
            wait.for(this.upsertModel,'Transfer',query,res);
          }
        }
      }
      i++;
    }
  },
  getTransfers: function(account,data) {
    var i = 0;
    while (i < data.length) {
      var query = {number: data[i][0]};
      if (data[i][1].op[0] == 'transfer') {
        var res = {
          number: data[i][0],
          timestamp: data[i][1].timestamp,
          from: data[i][1].op[1].from,
          to: data[i][1].op[1].to,
          amount: data[i][1].op[1].amount,
          memo: data[i][1].op[1].memo,
        }
        wait.for(this.upsertModel,'TransferRecord',query,res);
      }
      i++;
    }
  },
  getHighCurationPosts: function(account,voters,data) {
    var posts = new Array();
    for (var i = 0; i < data.length;i++) {
      if (data[i][1].op[0] == 'transfer') {
        if (data[i][1].op[1].to == account) {
          var post = this.getContent([conf.env.ACCOUNT_NAME(),account],data[i]);
          if (post !== null) {
            if (!post.voted && !post.flags &&
              (post.max_accepted_payout !== '0.000 SBD')) {
              if (this.dateDiff(post.created) > (60 * 15) &&
                this.dateDiff(post.created) < (86400 * conf.env.MAX_DAYS_OLD())) {
                if ((post.amount <= conf.env.MAX_AMOUNT()) &&
                  (post.amount >= conf.env.MIN_AMOUNT())) {
                  var votes_calc = parseFloat(post.votes);
                  if (votes_calc <= conf.env.MAX_VOTES()) {
                    var pending = parseFloat(
                      post.pending_payout_value.split(' ')[0]
                    );
                    var magic_number = (post.amount / pending) *
                      (post.amount / votes_calc);
                    if (magic_number >= conf.env.MAGIC_NUMBER()) {
                      post.magic_number = magic_number;
                      post.bot = account;
                      posts.push(post);
                    }else {
                      this.debug(`Magic number: ${magic_number}`);
                    }
                  }else {
                    this.debug(`Votes: ${votes_calc}`);
                  }
                }else {
                  this.debug(`Amount: ${post.amount}`);
                }
              }
            }
          }
        }
      }
    }
    return posts;
  },
  startVotingProcess: function(account,data,weight,voter) {
    var vp = this.getVotingPower(voter);
    if (conf.env.VOTE_ACTIVE()) {
      if (vp >= (conf.env.MIN_VOTING_POWER() * conf.env.VOTE_POWER_1_PC())) {
        console.log(`Options to vote ${data.length}`);
        for (var i = 0; i < data.length; i++) {
          console.log(`Currently at: ${i}`);
          if ((data[i].author !== undefined) && (data[i].author !== null) &&
            (data[i].url !== undefined) && (data[i].url !== null)) {
            if (!data[i].voted) {
              this.debug(data[i]);
              steem_api.votePost(
                data[i].author,
                data[i].url,
                weight
              );
              wait.for(this.timeout_wrapper,5000);
            }
          }
        }
      }else {
        this.debug('VP to low to vote');
      }
    }else {
      this.debug(
        'Voting is not active, voting: ' +
        JSON.stringify(data[data.length - 1])
      );
    }
  },
  startVotingDonationsProcess: function(account,data) {
    var globalData = wait.for(
      steem_api.steem_getSteemGlobaleProperties_wrapper
    );
    var ci = steem_api.init_conversion(globalData);
    for (var i = 0;i < data.length;i++) {
      var voted_ok = false;
      if (data[i].amount >= conf.env.MIN_DONATION()) {
        var amount_to_be_voted = data[i].amount;
        if (data[i].amount > conf.env.MAX_DONATION()) {
          this.debug('Amount is bigger than max');
          amount_to_be_voted = conf.env.MAX_DONATION();
          data[i].donation = data[i].amount - conf.env.MAX_DONATION();
          this.debug('Donation is: ' + data[i].donation);
        }
        var voter = wait.for(
          steem_api.steem_getAccounts_wrapper,[account]
        );
        var vp = this.getVotingPower(voter[0]);

        var vote_multiplier = conf.env.VOTE_MULTIPLIER();
        if (data[i].payer === data[i].author) {
          vote_multiplier = conf.env.SELF_VOTE_MULTIPLIER();
        }

        var weight = steem_api.calculateVoteWeight(
          voter[0],
          vp,
          (amount_to_be_voted * vote_multiplier)
        );
        if (conf.env.VOTE_ACTIVE()) {
          this.debug('VP is :' + vp);
          if (vp >= (
            conf.env.MIN_VOTING_POWER() * conf.env.VOTE_POWER_1_PC()
            )) {
            voted_ok = false;
            var result = wait.for(
              steem_api.steem_getContent,
              data[i].author,
              data[i].url
            );
            data[i].voted = steem_api.verifyAccountHasVoted(
              [account],
              result
            );
            // Verify age
            // console.log('Post created: ' + data[i].post_created)
            // console.log('Diff: ' + this.dateDiff(data[i].post_created))
            // console.log('Max: ' + (86400 * conf.env.MAX_DAYS_OLD()))

            if (this.dateDiff(data[i].post_created) > (86400 * conf.env.MAX_DAYS_OLD())) {
              console.log('I will not vote this as it should be refunded');
              console.log(data[i].post_created);
              data[i].status = 'due date';
              data[i].processed = true;
            }else {
              data[i].status = 'processed';
              data[i].processed = data[i].voted;
              data[i].processed_date = new Date();
              if (!data[i].voted) {
                steem_api.votePost(data[i].author, data[i].url, weight);
                voted_ok = true;
                wait.for(this.timeout_wrapper,5500);
                if (conf.env.COMMENT_ACTIVE()) {
                  var title = '';
                  var comment = '';
                  var trees_total = wait.for(this.getTreesTotal);
                  trees_total = (
                    (trees_total[0].total * ci.sbd_to_dollar) / 2
                  ).toFixed(2);
                  // Refactor this
                  if (conf.env.ACCOUNT_NAME() === 'treeplanter') {
                    title = 'Thanks for your donation';
                    var contents_1 = fs.readFileSync('./reports/treeplanter_comment.md', 'utf8');
                    var comment_params = {
                      trees: ((data[i].amount * ci.sbd_to_dollar) / 2).toFixed(2),
                      payer: data[i].payer,
                      trees_total: trees_total,
                      sp: steem_api.getSteemPower(voter[0]).toFixed(2),
                    };
                    comment = sprintf(contents_1, comment_params);
                  }else {
                    title = 'Thanks for your donation';
                    var contents_1 = fs.readFileSync('./reports/tuanis_comment.md', 'utf8');
                    var comment_params = {
                      author: data[i].author,
                      payer: data[i].payer,
                    };
                    comment = sprintf(contents_1, comment_params);
                  }
                  // Decide how to handle this with a form and mongodb document
                  var comment_result = steem_api.commentPost(
                    data[i].author,
                    data[i].url,
                    title,
                    comment
                  );
                  var link = {
                    author: comment_result.operations[0][1].author,
                    url: comment_result.operations[0][1].permlink,
                    created: new Date(),
                  };
                  if (conf.env.SUPPORT_ACCOUNT() !== '') {
                    wait.for(this.upsertModel,'Link',{
                      author: comment_result.operations[0][1].author,
                      url: comment_result.operations[0][1].permlink,
                    },link);
                  }
                  wait.for(this.timeout_wrapper,3000);
                }else {
                  this.debug(
                    'Commenting is not active, commenting: ' +
                    JSON.stringify(data[i])
                  );
                }
              }
            }
            wait.for(
              this.upsertModel,
              'Transfer',
              {_id: data[i]._id},
              {
                donation: data[i].donation,
                voted: voted_ok,
                processed: true,
                status: data[i].status,
                processed_date: data[i].processed_date,
                voted_date: new Date(),
              }
            );
          }else {
            console.log('Finishing donation process due to low voting power');
            break;
          }
        }else {
          this.debug(
            'Voting is not active, voting: ' + JSON.stringify(data[i])
          );
        }
      }else {
        wait.for(
          this.upsertModel,
          'Transfer',
          {_id: data[i]._id},
          {
            donation: data[i].amount,
            processed: true,
            status: 'min amount',
          }
        );
      }
    }
  },
  startRefundingProcess: function(account,data,voter) {
    var memo = '';
    var send = '';
    var refunded_urls = [];
    for (var i = 0; i < data.length;i++) {
      var result = wait.for(
        steem_api.steem_getContent,
        data[i].author,
        data[i].url
      );
      var voted = steem_api.verifyAccountHasVoted(
        [account],
        result
      );
      if (voted) {
        wait.for(
          this.upsertModel,
          'Transfer',
          {$and: [{author: data[i].author},{url: data[i].url}]},
          {voted: true}
        );
      }else {
        memo = 'I am sorry my SP was not enough to upvote the post you sent ';
        memo += 'me in memo. Send me different (not so old) post. Thank you.';
        if (conf.env.COMMENT_VOTE()) {
          if (conf.env.SELF_VOTE()) {
            conditions = data[i].status === 'due date';
          }else {
            memo = conf.env.REFUND_TEXT();
            conditions = data[i].status === 'due date' ||
              data[i].status === 'self-vote';
          }
        }else {
          conditions = data[i].status === 'due date' ||
            data[i].status === 'comment' ||
            data[i].status === 'self-vote';
        }
        if (refunded_urls.includes(data[i].memo)) {
          data[i].status = 'refunded';
        }else {
          conditions = data[i].status === 'due date' ||
            data[i].status === 'comment' ||
            data[i].status === 'self-vote' ||
            data[i].status === 'abuse' ||
            data[i].status === 'refunded';
          if (conditions) {
            // Comment in post or comment that amount was refunded *-*
            var title = 'Thanks for your donation';
            var comment = '![treeplanternoplant_new.png]';
            comment += '(https://steemitimages.com/DQmaCMGBXirzeFWCWD8gVadsJE1';
            comment += 'PY1pvXTECAyjGAtF5KNg/treeplanternoplant_new.png)';
            steem_api.commentPost(data[i].author, data[i].url, title,comment);
            wait.for(this.timeout_wrapper,4000);
            send = data[i].amount.toFixed(3) + ' ' + data[i].currency;
            this.debug(send,account,data[i].payer,memo);
            wait.for(
              steem_api.doTransfer,
              account,
              data[i].payer,
              send,
              memo
            );
            wait.for(
              this.upsertModel,
              'Transfer',
              {$and: [{author: data[i].author},{url: data[i].url}]},
              {status: 'refunded'}
            );
            refunded_urls.push(data[i].memo);
          }else {
            if (data[i].status === 'min amount') {
              // Verify if it was a valid post and comment post/comment with
              var title = 'Thanks for your donation';
              var comment = '![treeplantermessage_new.png]';
              comment += '(https://steemitimages.';
              comment += 'com/DQmZsdAUXGYBH38xY4smeMtHHEiEHxaEaQmGo2pJhMNdQfX/';
              comment += 'treeplantermessage_new.png)';
              steem_api.commentPost(data[i].author, data[i].url, title,comment);
              wait.for(this.timeout_wrapper,4000);
              wait.for(
                this.upsertModel,
                'Transfer',
                {$and: [{author: data[i].author},{url: data[i].url}]},
                {status: 'refunded'}
              );
              refunded_urls.push(data[i].memo);
            }
          }
        }
        wait.for(
          this.upsertModel,
          'Transfer',
          {$and: [{author: data[i].author},{url: data[i].url}]},
          {status: 'refunded'}
        );
      }
    }
  },
  startRefundingProcessSpecial: function(account,data,voter) {
    var memo = '';
    var send = '';
    var refunded_urls = [];
    memo = 'Refunding because vote was not performed correctly. Sorry for the inconvenience ';
    for (var i = 0; i < data.length;i++) {
      if (refunded_urls.includes(data[i].memo)) {
        data[i].status = 'refunded';
      }else {
        send = data[i].amount.toFixed(3) + ' ' + data[i].currency;
        this.debug(send,account,data[i].payer,memo);
        wait.for(
          steem_api.doTransfer,
          account,
          data[i].payer,
          send,
          memo
        );
        wait.for(
          this.upsertModel,
          'Transfer',
          {_id: data[i]._id},
          {status: 'refunded'}
        );
        refunded_urls.push(data[i].memo);
      }
    }
  },
  commentOnNewUserPost: function(posts,weight,donator) {
    var report = new Array();
    var minnows = new Array();
    var donator_sbd = donator.sbd_balance.split(' ');
    donator_sbd = parseFloat(donator_sbd[0]);
    var comment = '';
    var title = 'Welcome';
    for (var i = 0; i < posts.length;i++) {
      var author = posts[i].author;
      if (minnows.indexOf(author) > -1) {
        posts.splice(i, 1);
        this.debug('Removing from posts array to be welcome');
      }else {
        minnows.push(author);
        var account = wait.for(steem_api.steem_getAccounts_wrapper,[author]);
        var created = account[0].created;
        if (account[0].post_count < 50) {
          if (this.dateDiff(created) < (86400 * 30)) {
            if (!steem_api.verifyAccountHasVoted(
              [conf.env.ACCOUNT_NAME()],posts[i]
              )) {
              var sbd = account[0].sbd_balance.split(' ');
              var steem = account[0].balance.split(' ');
              sbd = parseFloat(sbd[0]);
              steem = parseFloat(steem[0]);
              if (conf.env.VOTE_ACTIVE()) {
                steem_api.votePost(posts[i].author,posts[i].permlink,weight);
              }else {
                this.debug(
                  'Voting is not active, voting: ' + posts[i].author +
                  'url: ' + posts[i].permlink
                );
              }
              if (((sbd <= 0.002) && (steem <= 0.002)) &&
                (donator_sbd > 0.002)) {
                this.debug('SBD: ' + sbd);
                this.debug('STEEM: ' + steem);
                wait.for(
                  steem_api.doTransfer,
                  conf.env.ACCOUNT_NAME(),
                  posts[i].author,
                  '0.002 SBD',
                  'MSP Registrations funds, welcome to Steemit!'
                );
                posts[i].fee = 0.002;
                donator_sbd -= 0.002;
                this.debug('Donator balance: ' + donator_sbd);
              }else {
                posts[i].fee = 0;
              }
              if (conf.env.COMMENT_ACTIVE()) {
                var coment = fs.readFileSync('./reports/comment.md', 'utf8');
                var data = {
                  user: posts[i].author,
                };
                comment = sprintf(coment , data);
                var comment_result = steem_api.commentPost(
                  posts[i].author,
                  posts[i].permlink,
                  title,
                  comment
                );
                var link = {
                  author: comment_result.operations[0][1].author,
                  url: comment_result.operations[0][1].permlink,
                  created: new Date(),
                };
                if (conf.env.SUPPORT_ACCOUNT() !== '') {
                  wait.for(
                    this.upsertModel,
                    'Link',
                    {
                      author: comment_result.operations[0][1].author,
                      url: comment_result.operations[0][1].permlink,
                    },
                    link
                  );
                }
                wait.for(this.timeout_wrapper,4000);
              }else {
                this.debug(
                  'Commenting is not active, commenting: ' + posts[i].author +
                  'url: ' + posts[i].permlink
                );
                this.debug('Comment: ' + comment);
                wait.for(this.timeout_wrapper,4000);
              }
              report.push(posts[i]);
            }else {
              this.debug('Account was already voted');
            }
          }else {
            this.debug('Account is old');
          }
        }else {
          this.debug('Account has more than 50 posts');
        }
      }
    }
    return report;
  },
  communitySupport: function(posts,weight,donator) {
    var report = new Array();
    var minnows = new Array();
    var comment = '';
    var title = 'Welcome';
    for (var i = 0; i < posts.length;i++) {
      var author = posts[i].author;
      if (minnows.indexOf(author) > -1) {
        posts.splice(i, 1);
        this.debug('Removing from posts array to be welcome');
      }else {
        minnows.push(author);
        var account = wait.for(steem_api.steem_getAccounts_wrapper,[author]);
        if (!steem_api.verifyAccountHasVoted(
          [conf.env.ACCOUNT_NAME()],posts[i]
          )) {
          if (this.dateDiff(posts[i].created) < (86400 * 5)) {
            if (conf.env.VOTE_ACTIVE()) {
              steem_api.votePost(posts[i].author,posts[i].permlink,weight);
            }else {
              this.debug(
                'Voting is not active, voting: ' + posts[i].author +
                'url: ' + posts[i].permlink
              );
            }
            if (conf.env.COMMENT_ACTIVE()) {
              var coment = fs.readFileSync('./reports/community_comment.md', 'utf8');
              var data = {
                user: posts[i].author,
              };
              comment = sprintf(coment , data);
              var comment_result = steem_api.commentPost(
                posts[i].author,
                posts[i].permlink,
                title,
                comment
              );
              var link = {
                author: comment_result.operations[0][1].author,
                url: comment_result.operations[0][1].permlink,
                created: new Date(),
              };
              if (conf.env.SUPPORT_ACCOUNT() !== '') {
                wait.for(this.upsertModel,'Link',{
                  author: comment_result.operations[0][1].author,
                  url: comment_result.operations[0][1].permlink,
                },link);
              }
              wait.for(this.timeout_wrapper,4000);
            }else {
              this.debug(
                'Commenting is not active, commenting: ' + posts[i].author +
                'url: ' + posts[i].permlink
              );
              this.debug('Comment: ' + comment);
              wait.for(this.timeout_wrapper,4000);
            }
            report.push(posts[i]);
          }else {
            this.debug('Post is too old');
          }
        }else {
          this.debug('Account was already voted');
        }

      }
    }
    return report;
  },
  votePostsByTag: function(posts,weight) {
    for (var i = 0; i < posts.length;i++) {
      var author = posts[i].author;
      var account = wait.for(
        steem_api.steem_getAccounts_wrapper,
        [conf.env.ACCOUNT_NAME()]
      );
      var vp = this.getVotingPower(account[0]);
      if (vp >= (
            conf.env.MIN_VOTING_POWER() * conf.env.VOTE_POWER_1_PC()
            )) {
        if (!steem_api.verifyAccountHasVoted([conf.env.ACCOUNT_NAME()],posts[i]) &&
          !steem_api.verifyAccountHasVoted(['cheetah','steemcleaners'],posts[i])) {
          if (conf.env.VOTE_ACTIVE()) {
            steem_api.votePost(posts[i].author,posts[i].permlink,weight);
            wait.for(this.timeout_wrapper,4000);
          }else {
            this.debug(
              'Voting is not active, voting: ' + posts[i].author +
              'url: ' + posts[i].permlink
            );
          }
        }else {
          this.debug('Account was already voted');
        }
      }else {
        this.debug('VP to low to vote');
      }
    }
  },
  getContent: function(account,post) {
    var obj = {};
    obj.number = post[0];
    obj.payer = post[1].op[1].from;
    obj.memo = post[1].op[1].memo;
    var amount_parts = post[1].op[1].amount.split(' ');
    obj.amount = parseFloat(amount_parts[0]);
    obj.donation = 0;
    obj.currency = amount_parts[1];
    obj.voted = false;
    obj.processed = false;
    obj.processed_date = null;
    obj.status = 'pending';
    obj.author = '';
    obj.url = '';
    obj.post_created = '';
    obj.pending_payout_value = '';
    obj.percent_steem_dollars = 10000;
    obj.max_accepted_payout = '';
    obj.votes = 0;
    obj.created = null;

    var has_link = (obj.memo.indexOf('https://') != -1);
    var has_author = (obj.memo.indexOf('@') != -1);

    if (has_author) {
      var post_url = obj.memo.split('@');
      var post_parts = post_url[1].split('/');
      obj.author = post_parts[0];
      obj.url = post_parts[1];
      var result = wait.for(
        steem_api.steem_getContent,
        obj.author,
        obj.url
      );
      obj.pending_payout_value = result.pending_payout_value;
      obj.percent_steem_dollars = result.percent_steem_dollars;
      obj.max_accepted_payout = result.max_accepted_payout;
      obj.post_created = result.created;
      obj.votes = result.active_votes.length;
      if (!conf.env.SELF_VOTE()) {
        obj.self_vote = obj.payer !== obj.author;
      }
      obj.due = (this.dateDiff(obj.created) < (86400 * conf.env.MAX_DAYS_OLD()));
      if ((result !== undefined) && (result !== null)) {
        obj.created = result.created;
        obj.voted = steem_api.verifyAccountHasVoted(
          account,
          result
        );
        obj.flags = steem_api.verifyAccountHasVoted(
          ['cheetah','steemcleaners'],
          result
        );
        obj.status = 'processed';
        obj.processed = obj.voted;
        obj.processed_date = new Date();
      }else {
        obj.status = 'content-not-found';
        obj.processed = true;
      }
      if (obj.due) {
        obj.status = 'due date';
      }
      if (obj.self_vote) {
        obj.status = 'self-vote';
      }
    }else {
      obj.status = 'donation';
      obj.processed = true;
    }
    return obj;
  },
  getQueue: function(callback) {
    db.model('Transfer').find(
      {
        voted: false,
        processed: false,
        status: {$in: ['pending','processed','comment']},
        created: {$ne: null},
      }
      ).sort({number: 1}).exec(
      function(err,data) {
        callback(err,data);
      }
    );
  },
  getQueueForPayer: function(payer_name, callback) {
    db.model('Transfer').find(
      {
        payer: payer_name,
        voted: false,
        processed: false,
        status: {$in: ['pending','processed','comment']},
        created: {$ne: null},
      }
      ).exec(
      function(err,data) {
        callback(err,data);
      }
    );
  },
  getRefunds: function(last_refunded,callback) {
    db.model('Transfer').find(
      {
        voted: false,
        processed: true,
        author: {$ne: null},
        status: {
          $in: [
          'due date',
          'url not valid',
          'content-not-found',
          'url-not-found',
          'abuse',
          ],},
        number: {$gt: last_refunded},
      }
    ).sort({number: -1}).exec(
      function(err,data) {
        callback(err,data);
      }
    );
  },
  getRefundsSpecial: function(last_refunded,callback) {
    db.model('Transfer').find(
      {
        voted: true,
        processed: true,
        author: {$ne: null},
        status: {
          $in: [
          'due date',
          'url not valid',
          'content-not-found',
          'url-not-found',
          ],},
        number: {$gt: last_refunded},
      }
    ).sort({number: 1}).exec(
      function(err,data) {
        callback(err,data);
      }
    );
  },
  getDataLast: function(model,query={},sort,callback) {
    db.model(model).find(query).limit(1).sort(sort).exec(
      function(err,data) {
        callback(err,data);
      }
    );
  },
  getData: function(model,query,callback) {
    db.model(model).find(query).exec(function(err,data) {callback(err,data)});
  },
  upsertModel: function(model,query,doc,callback) {
    db.model(model).update(
      query,doc,{upsert: true,new: true}
    ).exec(function(err,data) {callback(err,data)});
  },
  getTreesTotal: function(callback) {
    var stages = [
      {$match: {status: {$ne: 'refunded'}}},
      {$project: {_id: false,total: {$sum: '$amount'},},},
      {$group: {_id: 'total',total: {$sum: '$total'},},},
      ];
    db.model('Transfer').aggregate(stages).exec(
      function(err,data) {
        callback(err,data);
      }
    );
  },
  getTreesAverage: function(callback) {
    var stages = [
      {$group: {_id: 'trees',average: {$avg: '$trees'},},},
      ];
    db.model('Information').aggregate(stages).exec(
      function(err,data) {
        callback(err,data);
      }
    );
  },
  getDonatorsTotal: function(callback) {
    db.model('Transfer').distinct('payer').exec(
      function(err,data) {
        callback(err,data);
      }
    );
  },
  cleanFollowers: function(callback) {
    var date = new Date();
    date.setDate(date.getDate() - 8);
    db.model('Follower').remove(
      {created: {$lt: date}}
      ).exec(
      function(err,data) {
        callback(err,data);
      }
    );
  },
  cleanDelegators: function(callback) {
    db.model('Delegator').remove({}
      ).exec(
      function(err,data) {
        callback(err,data);
      }
    );
  },
  insertDelegators: function(records, callback) {
    db.model('Delegator').create(records,
      function(err,data) {
        callback(err,data);
      }
    );
  },
  deleteLink: function(query,callback) {
    console.log('Deleting link');
    db.model('Link').remove(query).exec(
      function(err,data) {
        callback(err,data);
      }
    );
  },
  getReport: function(options,callback) {

    var stages = new Array();

    if ((options.rate !== undefined) && (options.rate !== null)) {
      var amount_calc = {
        $cond: {
          if: {$eq: ['$currency','STEEM']},
          then: {$multiply: ['$amount',options.rate]},
          else: '$amount',
        },
      };
    }else {
      amount_calc = {amount: '$amount'};
    }

    var project = {$project: {
        number: '$number',
        payer: '$payer',
        memo: '$memo',
        author: '$author',
        donation: '$donation',
        amount: amount_calc,
        currency: '$currency',
        voted: '$voted',
        processed: '$processed',
        processed_date: '$processed_date',
        voted_date: '$voted_date',
        status: '$status',
        created: '$created',
      },
    };
    stages.push(project);

    if ((options.period !== undefined) && (options.period !== null)) {
      var cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - options.period);
      stages.push(
        {$match: {voted_date: {$gt: cutoff}}}
      );
    }
    if ((options.voted !== undefined) && (options.voted !== null)) {
      stages.push({$match: {voted: options.voted}});
    }
    if ((options.status !== undefined) && (options.status !== null)) {
      stages.push({$match: {status: options.status}});
    }
    if ((options.trees !== undefined) && (options.trees !== null)) {
      var group = {$group: {
        _id: {payer: '$payer'},
        total: {$sum: '$amount'},},};
      stages.push(group);
      stages.push({$sort: {total: -1}});
    }else {
      stages.push({$sort: {number: -1}});
    }
    if ((options.limit !== undefined) && (options.limit !== null)) {
      stages.push({$limit: options.limit});
    }
    db.model('Transfer').aggregate(stages).exec(
      function(err,data) {
        callback(err,data);
      }
    );
  },
  generateCommentedReport: function(posts) {
    var when = this.getDate(new Date());
    var permlink = 'tuanis-report-' + when;
    var title = 'Welcome report for ' + when;
    var body = 'Starting my duty report. \n';
    var tags = {tags: ['helpmejoin','minnowsupportproject']}
    var total = 0;
    body += '\n\nToday, I\'ve welcome the following users: \n';
    for (var i = 0; i < posts.length; i++) {
      total += posts[i].fee;
      body += '- @' + posts[i].author;
      body += ' [post](https://steemit.com' + posts[i].url + ')';
      if (posts[i].fee !== 0) {
        body += ' transfered fee\n';
      }
      body += '\n';
    }
    body += '\n\n## Total sent in fees: ' + total.toFixed(3) + ' ##';
    body += '\n\nMake sure to visit their profile and welcome them as well.\n';
    body += 'Long live Steemit, the social revolution platform.';
    var footer = fs.readFileSync('./reports/footer_tuanis.md', 'utf8');
    body += footer;

    this.preparePost(
      conf.env.ACCOUNT_NAME(),
      permlink,
      title,
      body,
      tags
    );
  },
  generateCommunityReport: function(posts) {
    var when = this.getDate(new Date());
    var permlink = conf.env.ACCOUNT_NAME() + '-report-for-' + conf.env.TAG() + '-' + when;
    var title = 'Reporte de apoyo a comunidad ' + conf.env.TAG() + '-' + when;
    var body = 'Como muestra de apoyo a el tag: ' + conf.env.TAG() + '\n';
    var tags = {tags: [conf.env.TAG(),'report','bot','busy','spanish']};
    var total = 0;
    body += '\n\nEl dia de hoy he seleccionado los siguientes posts de nuestra comunidad: \n';
    body += '<center>![steem_cr.png](https://cdn.steemitimages.com/';
    body += 'DQmNtmJiCFVQDvqWZRtRo5uE1gaTyrtkCWjm5sREALVdcvy/steem_cr.png)</center>';
    body += '\n';
    for (var i = 0; i < posts.length; i++) {
      total += posts[i].fee;
      body += '- @' + posts[i].author;
      body += ' [post](https://steemit.com' + posts[i].url + ')';
      body += '\n';
    }
    body += '\n\nApoyemonos y crezcamos juntos.\n';
    body += 'Unidos podemos poco a poco aumentar nuestra fuerza y seguir apoyandonos';

    var footer = fs.readFileSync('./reports/footer_tuanis.md', 'utf8');
    body += footer;

    this.preparePost(
      conf.env.ACCOUNT_NAME(),
      permlink,
      title,
      body,
      tags
    );
  },
  generateTreeplanterReport: function(
    total,count,donators,steempower,ci,period,trees,specific,report) {
    var when = this.getDate(new Date());
    var permlink = 'treeplanter-report-' + when;

    var tags = {tags: ['charity','fundraising','nature','life','treeplanter']};

    // Calculate new total with current market changes
    var total_trees = ((total * ci.sbd_to_dollar) / 2).toFixed(2);

    // Calculate daily average
    // Create function to calculate this.
    var average = wait.for(this.getTreesAverage);
    average = average[0].average.toFixed(2);
    // Magic to generate body
    var header = 'Rank | Username | Total \n---|---|---\n';

    var sbd_steem = parseFloat(ci.steem_to_dollar) / parseFloat(ci.sbd_to_dollar);
    // Period
    var options_daily = {
      period: 1,
      voted: true,
      rate: sbd_steem,
      trees: true,
    };
    var report_payment = wait.for(this.getReport,options_daily);
    var daily_donation = 0;
    for (var i = 0; i < report_payment.length;i++) {
      daily_donation += parseFloat(report_payment[i].total.toFixed(2));
    }
    var developer_payment = 0;
    var powerup = 0;
    if (daily_donation > 0) {
      // Transfer 5% to developer
      // if there is enough balance
      developer_payment = (daily_donation * 0.05).toFixed(3);
      console.log('Developer payment is: ' + developer_payment);
      wait.for(
        steem_api.doTransfer,
        conf.env.ACCOUNT_NAME(),
        'raserrano',
        developer_payment + ' SBD',
        'Daily payment for development and management'
      );
      // Power up 50% of the amount
      powerup = (daily_donation * 0.5).toFixed(3);
    }else {
      powerup = 0;
      developer_payment = 0;

    }
    // Create table to start tracking this
    var stat = {};
    stat.trees =  ((daily_donation * ci.sbd_to_dollar) / 2).toFixed(2);
    stat.payment = developer_payment;
    stat.powerup = powerup;
    var result = wait.for(this.upsertModel,'Information',{created: when},stat);
    var pictures = JSON.parse(fs.readFileSync('./reports/pictures.json', 'utf8'));
    var contents_1 = fs.readFileSync('./reports/header.md', 'utf8');
    // Get delegators
    var delegators = wait.for(this.getData,'Delegator',{})
    var delegators_table = '\nRank | Username | SP delegated | Numbers of trees planted daily';
    delegators_table += '\n---|---|---|---\n';
    for (var i = 0; i < delegators.length; i++) {
      var calc_sp = ((delegators[i].sp * 1000) / 2).toFixed(2);
      var calc_trees = (calc_sp / 5800).toFixed(3);
      delegators_table += `${i + 1} | ${delegators[i].username} | ~${calc_sp} | ${calc_trees}`;
      delegators_table += '\n';      
    }
    delegators_table += '\n---\n';
    contents_1 += delegators_table;
    var contents_2 = fs.readFileSync('./reports/delegation.md', 'utf8');
    var contents_3 = fs.readFileSync('./reports/treeplanter_stats.md', 'utf8');

    var part1 = sprintf(
      contents_1,
      stat.trees,
      total_trees,
      pictures.pics[this.getRandom(pictures.pics.length,1)]
    );

    var part2 = sprintf(
      contents_3,
      count,
      donators,
      total_trees,
      average,
      steempower,
      ci.steem_to_dollar,
      ci.sbd_to_dollar
    );
    var body = part1 + contents_2 + part2 + '\n\n';

    var range = 'TODAY';
    if (period > 8) {
      range = 'THIS MONTH';
    }else {
      if (period > 1) {
        range = 'THIS WEEK';
      }
    }
    body += '<h3>TOTAL RANKING OF ' + range + '</h3>\n';
    body += 'RANK  STEEMIAN  AMOUNT OF TREES PLANTED\n';
    body += header;
    for (var i = 0; i < specific.length;i++) {
      body += (i + 1) + ' | @' + specific[i]._id.payer +
      ' | ' + ((specific[i].total * ci.sbd_to_dollar) / 2).toFixed(2) + '\n';
    }

    body += '\n\n<h3>TOTAL RANKING OF ALL TREE PLANTERS</h3>\n';
    body += header;
    for (var j = 0; j < trees.length;j++) {
      body += (j + 1) + ' | @' + trees[j]._id.payer +
      ' | ' + ((trees[j].total * ci.sbd_to_dollar) / 2).toFixed(2) + '\n';
    }
    // Read file and add it to body
    var contents_4 = fs.readFileSync('./reports/treeplanter_manual.md', 'utf8');
    var data = {
      minimum: conf.env.MIN_DONATION(),
      maximum: conf.env.MAX_DONATION(),
      min_voted: (conf.env.MIN_DONATION() * conf.env.VOTE_MULTIPLIER()),
      max_voted: (conf.env.MAX_DONATION() * conf.env.VOTE_MULTIPLIER()),
    };
    delegation_block = sprintf(contents_4 , data);
    body += delegation_block;

    var contents_5 = fs.readFileSync('./reports/raserrano.md', 'utf8');
    body += contents_5;

    var title = '@treeplanter funds raising & voting bot got ';
    title += daily_donation.toFixed(2) + ' SBD today ' + when;
    title += ' to save Abongphen Highland Forest in Cameroon. Thank you!';

    this.preparePost(
      conf.env.ACCOUNT_NAME(),
      permlink,
      title,
      body,
      tags
    );
  },
  preparePost: function(author, permlink, title, body, tags) {
    if (conf.env.REPORT_ACTIVE()) {
      var percentage = 10000;
      if (conf.env.POWERUP_POST()) {
        percentage = 0;
      }
      var ext = [[0,{beneficiaries:
        [{account: 'raserrano', weight: 1000 }],
      },],];

      var result = wait.for(
        steem_api.publishPostOptionsAsync,
        author,
        permlink,
        tags,
        title,
        body,
        percentage,
        ext
      );
    }else {
      this.debug('Debug is active not posting but body is:');
      this.debug(body);
    }
  },
  getVotingPower: function(account) {
    var vp = account.voting_power;
    this.debug('Last voted time : ' + account.last_vote_time);
    var secondsDiff = this.dateDiff(account.last_vote_time);
    this.debug('Seconds difference ' + secondsDiff);
    if (secondsDiff > 0) {
      var vpRegenerated = secondsDiff * 10000 / 86400 / 5;
      this.debug('Regenerated ' + vpRegenerated);
      vp += vpRegenerated;
    }
    if (vp > 10000) {
      vp = 10000;
    }
    this.debug('VP is: ' + vp);
    return vp;
  },
  getReputation: function(account) {
    var rep = account.reputation;
    var multi = (rep < 0)?-9:9;
    rep = Math.log10(Math.abs(rep));
    rep = Math.max(rep - 9, 0);
    rep *= multi;
    rep += 25;
    return rep.toFixed(3);
  },
  dateDiff: function(when, now=new Date()) {
    var then = new Date(when);
    return (now - then) / 1000;
  },
  getDate: function(when) {
    var result = when.getMonth() + 1;
    result += '-' + when.getDate() + '-' + when.getFullYear();
    return result;
  },
  getRandom: function(count, limit) {
    var lucky = new Array();
    var k = 0;
    while (k++ < limit) {
      lucky.push(Math.floor(Math.random() * count));
    }
    return lucky;
  },
  debug: function(message) {
    if (conf.env.DEBUG() === true) {
      console.log(message);
    }
  },
  timeout_wrapper: function(delay, callback) {
    setTimeout(function() {
      callback(null, true);
    }, delay);
  },
}
