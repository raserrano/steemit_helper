const
  wait = require('wait.for'),
  conf = require('../config/dev'),
  db = require('./db'),
  fs = require('fs'),
  sprintf = require('sprintf').sprintf,
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
    var i = 0;
    while (i < data.length) {
      if (data[i][1].op[0] == 'transfer') {
        if (data[i][1].op[1].to == account) {
          var query = {number: data[i][0]};
          var found = wait.for(this.getTransfer,query);
          var res = this.getContent([account],data[i]);
          if (found.length > 0) {
            var status_ok = (found[0].status !== 'refunded') ||
            (found[0].status !== 'due date') ||
            (found[0].status !== 'min amount');
            if (status_ok) {
              wait.for(this.upsertTransfer,query,found);
            }
          }else {
            wait.for(this.upsertTransfer,query,res);
          }
        }
      }
      i++;
    }
  },
  startVotingProcess: function(account,data,weight,voter) {
    var vp = this.getVotingPower(voter);
    var posts = new Array();
    for (var i = 0; i < data.length;i++) {
      if (data[i][1].op[0] == 'transfer') {
        if (data[i][1].op[1].to == account) {
          var post = this.getContent([account,conf.env.ACCOUNT_NAME()],data[i]);
          if (post !== null) {
            if (!post.voted
              && ((post.status == 'pending') || (post.status == 'processed'))) {
              posts.push(post);
            }
          }
        }
      }
    }
    if (posts.length > 0) {
      posts.sort(function(a,b) {
        return (a.amount > b.amount) ? 1 : ((b.amount > a.amount) ? -1 : 0);
      });
      if (conf.env.VOTE_ACTIVE()) {
        if (vp >= (conf.env.MIN_VOTING_POWER() * conf.env.VOTE_POWER_1_PC())) {
          var to_vote = posts[posts.length - 1];
          if ((to_vote.author !== undefined) && (to_vote.author !== null)
            && (to_vote.url !== undefined) && (to_vote.url !== null)) {
            if (!to_vote.voted) {
              steem_api.votePost(
                to_vote.author,
                to_vote.url,
                weight
              );
              wait.for(this.timeout_wrapper,5000);
            }
          }
        }else {
          this.debug('VP to low to vote');
        }
      }else {
        this.debug(
          'Voting is not active, voting: '
          + JSON.stringify(posts[posts.length - 1])
        );
      }
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
          steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
        );
        var vp = this.getVotingPower(voter[0]);
        var weight = steem_api.calculateVoteWeight(
          voter[0],
          (amount_to_be_voted * conf.env.VOTE_MULTIPLIER())
        );
        if (conf.env.VOTE_ACTIVE()) {
          this.debug('VP is :' + vp);
          if (vp >= (
            conf.env.MIN_VOTING_POWER() * conf.env.VOTE_POWER_1_PC()
            )) {
            if (conf.env.VOTE_ACTIVE()) {
              voted_ok = true;
              if (!data[i].voted) {
                steem_api.votePost(data[i].author, data[i].url, weight);
                wait.for(this.timeout_wrapper,5500);
              }
            }else {
              this.debug(
                'Voting is not active, voting: ' + JSON.stringify(data[i])
              );
            }
            if (conf.env.COMMENT_ACTIVE()) {
              var title = '';
              var comment = '';
              var trees_total = wait.for(this.getTreesTotal);
              trees_total = (
                (trees_total[0].total * ci.sbd_to_dollar) / 2
              ).toFixed(2);
              if (conf.env.ACCOUNT_NAME() === 'treeplanter') {
                var sp = steem_api.getSteemPower(voter[0]).toFixed(2);
                var trees = ((data[i].amount * ci.sbd_to_dollar) / 2).toFixed(2);
                title = 'Thanks for your donation';
                comment += '<center>';
                comment += '<h3>You just planted ' + trees + ' tree(s)!</h3>\n'
                comment += 'Thanks to @' + data[i].payer + ' \n';
                comment += '<h3>We have planted already ' + trees_total;
                comment += ' trees\n out of 1,000,000<h3>\n';
                comment += 'Let\'s save and restore Abongphen Highland';
                comment += ' Forest\nin Cameroonian village Kedjom-Keku!\n';
                comment += 'Plant trees with @treeplanter and get';
                comment += ' paid for it!\nMy Steem Power = ' + sp + '\n';
                comment += 'Thanks a lot!\n @martin.mikes';
                comment += ' coordinator of @kedjom-keku\n';
                comment += '![treeplantermessage_ok.png](https://';
                comment += 'steemitimages.com/DQmdeFhTevmcmLvubxMMDoYBoNSa';
                comment += 'z4ftt7PxktmLDmF2WGg/treeplantermessage_ok.png)';
                comment += '</center>';
              }else {
                title = 'Thanks for your donation';
                comment = 'Congratulations @' + data[i].author + '!';
                comment += ' You have received a vote as ';
                comment += 'part of  @' + data[i].payer;
                comment += ' donation to this project.\n';
                comment += 'I will be able to help more #minnows \n';
              }
              // Decide how to handle this with a form and mongodb document
              steem_api.commentPost(
                data[i].author,
                data[i].url,
                title,
                comment
              );
              wait.for(this.timeout_wrapper,22000);
            }else {
              this.debug(
                'Commenting is not active, commenting: '
                + JSON.stringify(data[i])
              );
            }
            wait.for(
              this.upsertTransfer,
              {_id: data[i]._id},
              {
                donation: data[i].donation,
                voted: voted_ok,
                processed: true,
                voted_date: new Date()
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
          this.upsertTransfer,
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
          this.upsertTransfer,
          {_id: data[i]._id},
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
        if (conditions) {
          // Comment in post or comment that amount was refunded *-*
          var title = 'Thanks for your donation';
          var comment = '![treeplanternoplant_new.png]';
          comment += '(https://steemitimages.com/DQmaCMGBXirzeFWCWD8gVadsJE1';
          comment += 'PY1pvXTECAyjGAtF5KNg/treeplanternoplant_new.png)';
          steem_api.commentPost(data[i].author, data[i].url, title,comment);
          wait.for(this.timeout_wrapper,22000);
          send = data[i].amount.toFixed(3) + ' ' + data[i].currency;
          this.debug(send,account,data[i].payer,memo);
          wait.for(
            steem_api.doTransfer,
            account,
            data[i].payer,
            send,
            memo
          );
          wait.for(this.upsertTransfer,{_id: data[i]._id},{status: 'refunded'});
        }else {
          if (data[i].status === 'min amount') {
            // Verify if it was a valid post and comment post/comment with *-*
            var title = 'Thanks for your donation';
            var comment = '![treeplantermessage_new.png]';
            comment += '(https://steemitimages.';
            comment += 'com/DQmZsdAUXGYBH38xY4smeMtHHEiEHxaEaQmGo2pJhMNdQfX/';
            comment += 'treeplantermessage_new.png)';
            steem_api.commentPost(data[i].author, data[i].url, title,comment);
            wait.for(this.timeout_wrapper,22000);
            wait.for(
              this.upsertTransfer,
              {_id: data[i]._id},
              {status: 'refunded'}
            );
          }
        }
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
              [conf.env.ACCOUNT_NAME],posts[i]
              )) {
              var sbd = account[0].sbd_balance.split(' ');
              var steem = account[0].balance.split(' ');
              sbd = parseFloat(sbd[0]);
              steem = parseFloat(steem[0]);
              if (conf.env.VOTE_ACTIVE()) {
                steem_api.votePost(posts[i].author,posts[i].permlink,weight);
                wait.for(this.timeout_wrapper,5100);
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
                comment = 'Welcome to steemit @' + posts[i].author +
                '. Join @minnowsupport project for more help. ' +
                'Checkout @helpie and @qurator projects.\n' +
                'Send SBD/STEEM to @treeplanter to plant trees and get an ' +
                'get an upvote in exchange of your donation (Min 0.01 SDB) \n' +
                'Upvote this comment to keep helping more new steemians \n' +
                'Send SBD/STEEM to @tuanis in exchange of an upvote and ' +
                'support this project, follow for random votes.';

                steem_api.commentPost(
                  posts[i].author,
                  posts[i].permlink,
                  title,
                  comment
                );
                wait.for(this.timeout_wrapper,22000);
              }else {
                this.debug(
                  'Commenting is not active, commenting: ' + posts[i].author +
                  'url: ' + posts[i].permlink
                );
                this.debug('Comment: ' + comment);
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
        if (!steem_api.verifyAccountHasVoted(
          [conf.env.ACCOUNT_NAME],posts[i]
          )) {
          if (conf.env.VOTE_ACTIVE()) {
            steem_api.votePost(posts[i].author,posts[i].permlink,weight);
            wait.for(this.timeout_wrapper,5100);
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
    obj.created = null;
    if (obj.memo.indexOf('/') != -1) {
      if (conf.env.COMMENT_VOTE()) {
        var post_url = obj.memo.split('/');
        post_url = post_url.filter(function(e) {return e});
        if (!(post_url[post_url.length - 2].indexOf('#') == -1)) {
          var items = post_url[post_url.length - 2].split('#');
          post_url.splice(
            (post_url.length - 2),
            1,
            items[0],
            items[1]
          );
        }
        if (post_url[post_url.length - 2][0] === '@') {
          obj.author = post_url[post_url.length - 2]
          .substr(1, post_url[post_url.length - 2].length);
          obj.url = post_url[post_url.length - 1];
          if (obj.url !== undefined && obj.author !== undefined
            && obj.url != null && obj.author != null) {
            var result = wait.for(
              steem_api.steem_getContent,
              obj.author,
              obj.url
            );
            if (!conf.env.SELF_VOTE()) {
              if (obj.payer !== obj.author) {
                if ((result !== undefined) && (result !== null)) {
                  obj.created = result.created;
                  if (this.dateDiff(obj.created) < (86400 * 6)) {
                    obj.voted = steem_api.verifyAccountHasVoted(
                      account,
                      result
                    );
                    obj.status = 'processed';
                    obj.processed = obj.voted;
                    obj.processed_date = new Date();
                  }else {
                    obj.status = 'due date';
                    obj.processed = true;
                  }
                }else {
                  obj.status = 'content-not-found';
                  obj.processed = true;
                }
              }else {
                obj.status = 'self-vote';
                obj.processed = true;
              }
            }else {
              if ((result !== undefined) && (result !== null)) {
                obj.created = result.created;
                if (this.dateDiff(obj.created) < (86400 * 6.5)) {
                  obj.voted = steem_api.verifyAccountHasVoted(
                    account,
                    result
                  );
                  obj.status = 'processed';
                  obj.processed = obj.voted;
                  obj.processed_date = new Date();
                }else {
                  obj.status = 'due date';
                  obj.processed = true;
                }
              }else {
                obj.status = 'content-not-found';
                obj.processed = true;
              }
            }
          }else {
            obj.status = 'url-not-found';
            obj.processed = true;
          }
        }else {
          obj.status = 'url not valid';
          obj.processed = true;
        }
      }else {
        if (!(obj.memo.indexOf('#') == -1)) {
          obj.status = 'comment';
          obj.processed = true;
        }
      }
    }else {
      obj.status = 'donation';
      obj.processed = true;
    }
    return obj;
  },
  getLastVoted: function(callback) {
    db.model('Transfer').find({voted: true}).limit(1).sort({number: -1}).exec(
      function(err,data) {
        callback(err,data);
      }
    );
  },
  getLastTransfer: function(callback) {
    db.model('Transfer').find().limit(1).sort({number: -1}).exec(
      function(err,data) {
        callback(err,data);
      }
    );
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
  getRefunds: function(last_refunded,callback) {
    db.model('Transfer').find(
      {
        voted: false,
        processed: true,
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
  getLastRefunded: function(callback) {
    db.model('Transfer').find({
        status: 'refunded',
      }).limit(1).sort({number: -1}).exec(
      function(err,data) {
        callback(err,data);
      }
    );
  },
  getLastInfo: function(callback) {
    db.model('Information').find({}).limit(1).sort({created: -1}).exec(
      function(err,data) {
        callback(err,data);
      }
    );
  },
  getTransfer: function(query,callback) {
    db.model('Transfer').find(query).exec(
      function(err,data) {
        callback(err,data);
      }
    );
  },
  getFollowers: function(callback) {
    db.model('Follower').find(
      {}
      ).exec(
      function(err,data) {
        callback(err,data);
      }
    );
  },
  upsertTransfer: function(query,doc,callback) {
    db.model('Transfer').update(
      query,doc,{upsert: true,new: true},
      function(err,data) {callback(err,data);}
    );
  },
  upsertFollower: function(query,doc,callback) {
    db.model('Follower').update(
      query,doc,{upsert: true,new: true},
      function(err,data) {callback(err,data);}
    );
  },
  upsertStat: function(query,doc,callback) {
    db.model('Information').update(
      query,doc,{upsert: true,new: true},
      function(err,data) {callback(err,data);}
    );
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
    var msp  = '[![pal-sig-anim-trans](https://i.imgur.com/sBkPplQ.gif)]';
    msp += '(https://discord.gg/GUuCXgY)';
    body += '\n---\n <center>' + msp + '</center>';
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

    var result = wait.for(this.upsertStat,{created: when},stat);

    var pictures = JSON.parse(fs.readFileSync('./reports/pictures.json', 'utf8'));

    // Random
    var min = Math.ceil(0);
    var max = Math.floor(pictures.pics.length);
    var lucky = Math.floor(Math.random() * (max - min + 1)) + min;


    var contents_1 = fs.readFileSync('./reports/header.md', 'utf8');
    var body = sprintf(
      contents_1,
      stat.trees,
      total_trees,
      pictures.pics[lucky],
      count,
      donators,
      total_trees,
      average,
      steempower,
      ci.steem_to_dollar,
      ci.sbd_to_dollar
    );
    body += '\n\n';

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
    var contents_2 = fs.readFileSync('./reports/treeplanterv2.md', 'utf8');
    body += '\n' + contents_2;

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
  generateGrowthReport: function(account) {
    var when = this.getDate(account.created);
    var permlink = account.username + '-growth-' + when;
    var title = 'Growth report for ' + when;
    var body = '<h3>Growth Report</h3>\n With your help I have grown and ';
    var image_url =  'https://steemitimages.com/';
    image_url += 'DQmUdo4Ngm8JgDqRL4FndKksi7HzgbGMkFXwNpbYACWMQVu/tuanis.jpeg';

    body += 'I am able to help more minnows. Thanks for your support.\n ';
    body += '\n';
    body += '- **Followers:** ' + account.followers + '\n';
    body += '- **Reputation:** ' + account.reputation + '\n';
    body += '- **Vote value:** ' + account.vote + '\n';
    body += '- **Steem power:** ' + account.sp + '\n';
    body += '\n\n';
    body += '![tuanis.jpeg](' + image_url + ') \n\n';
    body += 'Upvote this report to keep supporting this project. \n\n';
    body += '--- \n';
    body += 'You can also support this project by sending a transfer and a ';
    body += 'post or comment URL in the memo field. **Minimum is 0.01 SBD** ';
    body += 'I will upvote it to a value of 1.5 times your donation. \n';
    body += '**Max upvote value to 0.03 SBD**, you can always send more  ';
    body += 'but it will be consider a donation.';
    var msp  = '[![pal-sig-anim-trans](https://i.imgur.com/sBkPplQ.gif)]';
    msp += '(https://discord.gg/GUuCXgY)';
    body += '\n---\n <center>' + msp + '</center>';
    var tags = {tags: ['helpmejoin','minnowsupportproject','minnows']};
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
      var voter = wait.for(
        steem_api.publishPost,
        author,
        permlink,
        tags,
        title,
        body
      );
      var percentage = 10000;
      if (conf.env.POWERUP_POST()) {
        percentage = 0;
      }
      var extensions =
        [[0,{beneficiaries: [{account: 'raserrano', weight: 1000 }],},],];
      // {account: 'raserrano', weight: 1000 },
      // if(conf.env.BENEFICIARIES() !== null){
      //   var list = conf.env.BENEFICIARIES();
      //   extensions =
      //     [[0,{beneficiaries:list,},],];
      // }
      // console.log(extensions);
      var options = wait.for(
        steem_api.publishPostOptions,
        author,
        permlink,
        percentage,
        extensions
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
  dateDiff: function(when) {
    var then = new Date(when);
    var now = new Date();
    return (now - then) / 1000;
  },
  getDate: function(when) {
    var result = when.getMonth() + 1;
    result += '-' + when.getDate() + '-' + when.getFullYear();
    return result;
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
