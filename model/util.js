const
  wait = require('wait.for'),
  conf = require('../config/dev'),
  db = require('./db')
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
            if (found[0].status !== 'refunded') {
              wait.for(this.upsertTransfer,query,res);
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
            steem_api.votePost(
              to_vote.author,
              to_vote.url,
              weight
            );
            wait.for(this.timeout_wrapper,5000);
          }
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
              steem_api.votePost(data[i].author, data[i].url, weight);
              wait.for(this.timeout_wrapper,5000);
            }else {
              this.debug(
                'Voting is not active, voting: ' + JSON.stringify(data[i])
              );
            }
            if (conf.env.COMMENT_ACTIVE()) {
              var title = '';
              var comment = '';
              if (conf.env.ACCOUNT_NAME() === 'treeplanter') {
                var sp = this.getSteemPower(voter[0]).toFixed(2);
                var trees = data[i].amount / 2;
                title = 'Thanks for your donation';
                comment = 'Good job! Thanks to @' + data[i].payer;
                comment += ' you have planted ' + trees.toFixed(2) + ' ';
                comment += 'tree to save Abongphen Highland ';
                comment += 'Forest in Cameroon. Help me to plant 1,000,000 ';
                comment += 'trees and share my Steem Power to the others. ';
                comment += 'Selfvoting is prohibited, but that should ';
                comment += 'be the reason to spread the world to protect ';
                comment += 'our precious environment. Check out profile of ';
                comment += 'our conservation association @kedjom-keku ';
                comment += 'and the founder/coordinator @martin.mikes to get ';
                comment += 'more information about our conservation program. ';
                comment += 'My current SP is ' + sp + '. Help me to plant ';
                comment += 'more trees with your delegated SP. \n\n';
                comment += 'Thanks a lot,\nyour @treeplanter \n';
                comment += 'www.kedjom-keku.com';
              }else {
                title = 'Thanks for your donation';
                comment = 'Congratulations @' + data[i].author + '!';
                comment += ' You have received a vote as ';
                comment += 'part of  @' + data[i].payer;
                comment += ' donation to this project.\n';
                comment += 'I will be able to help more #minnows';
              }
              // Decide how to handle this with a form and mongodb document
              steem_api.commentPost(data[i].author, data[i].url, title,comment);
              wait.for(this.timeout_wrapper,20000);
            }else {
              this.debug(
                'Commenting is not active, commenting: '
                + JSON.stringify(data[i])
              );
            }
            wait.for(
              this.upsertTransfer,
              {_id: data[i]._id},
              {donation: data[i].donation,voted: voted_ok,processed: true}
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
        this.debug('Amount not enough, assuming donation');
        wait.for(
          this.upsertTransfer,
          {_id: data[i]._id},
          {donation: data[i].amount,processed: true,status: 'min amount'}
        );
      }
    }
  },
  startRefundingProcess: function(account,data,voter) {
    var memo = '';
    var send = '';
    for (var i = 0; i < data.length;i++) {
      if (data[i].status === 'due date') {
        memo = ' am sorry my SP was not enough to upvote the post you sent ';
        memo += 'me in memo. Send me different (not so old) post. Thank you.';
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
      }
      if (data[i].status === 'self-comment' || data[i].status === 'self-vote') {
        memo = 'Sorry, I cannot do selfvoting anymore. Instead I would like ';
        memo += 'to see you sharing my STEEM POWER with others. Distribute ';
        memo += 'your donation to five of yours influenced followers to get ';
        memo += 'their attention and help me to spread the Steem world and ';
        memo += 'plant 1,000,000 trees to save and restore Abongphen Highland ';
        memo += 'Forest in Cameroon.';
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
      }
    }

  },
  commentOnNewUserPost: function(posts,weight) {
    var report = new Array();
    var comment = '';
    var title = 'Welcome';
    for (var i = 0; i < posts.length;i++) {
      var author = posts[i].author;
      var account = wait.for(steem_api.steem_getAccounts_wrapper,[author]);
      var created = account[0].created;
      if (this.dateDiff(created) < (86400 * 7)) {
        if (!steem_api.verifyAccountHasVoted(
          [conf.env.ACCOUNT_NAME],posts[i]
          )) {
          if (conf.env.VOTE_ACTIVE()) {
            steem_api.votePost(posts[i].author,posts[i].permlink,weight);
            wait.for(this.timeout_wrapper,5000);
          }else {
            this.debug(
              'Voting is not active, voting: ' + JSON.stringify(posts[i])
            );
          }
          if (conf.env.COMMENT_ACTIVE()) {
            var comment = 'Welcome to steemit @' + posts[i].author
            + '. Join #minnowsupportproject for more help. ' +
            'Leave a comment with #helpmein tag so I will' +
            ' transfer registration fee.\n @OriginalWorks ' +
            ' will help you verify original content .\n' +
            'If you want to plant a tree ' +
            'try @treeplanter \n' +
            'Use @tipu to give users a 0.1 SBD tip. \n';
            steem_api.commentPost(
              posts[i].author,
              posts[i].permlink,
              title,
              comment
            );
            wait.for(this.timeout_wrapper,20000);
          }else {
            this.debug(
              'Commenting is not active, commenting: '
              + JSON.stringify(posts[i])
            );
          }
          report.push(posts[i]);
        }else {
          this.debug('Account was already voted')
        }
      }else {
        this.debug('Account is old')
      }
    }
    return report;
  },
  getContent: function(account,post) {
    var obj = null;
    var number = post[0];
    var payer = post[1].op[1].from;
    var memo = post[1].op[1].memo;
    var amount_parts = post[1].op[1].amount.split(' ');
    var amount = parseFloat(amount_parts[0]);
    var donation = 0;
    var currency = amount_parts[1];
    var voted = false;
    var processed = false;
    var status = 'pending';
    var author = '';
    var url = '';
    var created = '';
    if (memo.indexOf('/') != -1) {
      if (memo.indexOf('#') == -1) {
        var post_url = post[1].op[1].memo.split('/');
        post_url = post_url.filter(function(e) {return e});
        if (post_url[post_url.length - 2][0] === '@') {
          author = post_url[post_url.length - 2]
          .substr(1, post_url[post_url.length - 2].length);
          url = post_url[post_url.length - 1];
          if (url != undefined && author != undefined
            && url != null && author != null) {
            if (payer !== author) {
              var result = wait.for(steem_api.steem_getContent,author,url);
              if ((result !== undefined) && (result !== null)) {
                created = result.created;
                if (this.dateDiff(created) < (86400 * 6.5)) {
                  voted = steem_api.verifyAccountHasVoted(account,result);
                  status = 'processed';
                  processed = voted;
                }else {
                  status = 'due date';
                  processed = true;
                }
              }else {
                status = 'content-not-found';
                processed = true;
              }
            }else {
              status = 'self-vote';
              processed = true;
            }
          }else {
            status = 'url-not-found';
            processed = true;
          }
        }else {
          status = 'url not valid';
          processed = true;
        }
      }else {
        var post_url_comments = post[1].op[1].memo.split('#');
        post_url_comments = post_url_comments[1].split('/');
        post_url_comments = post_url_comments.filter(function(e) {return e});
        if(post_url_comments.length > 0) {
          if (post_url_comments[0][0] === '@') {
            author = post_url_comments[0]
            .substr(1, post_url_comments[0].length);
            url = post_url_comments[1];
            if (url != undefined && author != undefined
              && url != null && author != null) {
              if (payer !== author) {
                var result = wait.for(steem_api.steem_getContent,author,url);
                if ((result !== undefined) && (result !== null)) {
                  created = result.created;
                  if (this.dateDiff(created) < (86400 * 6.5)) {
                    voted = steem_api.verifyAccountHasVoted(account,result);
                    status = 'processed';
                    processed = voted;
                  }else {
                    status = 'due date';
                    processed = true;
                  }
                }else {
                  status = 'content-not-found';
                  processed = true;
                }
              }else {
                status = 'self-comment';
                processed = true;
              }
            }else {
              status = 'url-not-found';
              processed = true;
            }
          }else {
            status = 'url not valid';
            processed = true;
          }
        }else {
          status = 'url not valid';
          processed = true;
        }
      }
    }else {
      status = 'donation';
      processed = true;
    }
    obj = {
      number,
      payer,
      memo,
      amount,
      donation,
      currency,
      author,
      url,
      voted,
      processed,
      status,
      created,
    };
    return obj;
  },
  getLastVoted: function(callback) {
    db.model('Transfer').find({voted: true}).limit(1).sort({number: -1}).exec(
      function(err,data) {
        callback(err,data);
      });
  },
  getLastTransfer: function(callback) {
    db.model('Transfer').find().limit(1).sort({number: -1}).exec(
      function(err,data) {
        callback(err,data);
      });
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
      });
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
          'self-comment',
          'self-vote',
          ],},
        number: {$gt: last_refunded},
      }
    ).sort({number: 1}).exec(
      function(err,data) {
        callback(err,data);
      });
  },
  getLastRefunded: function(callback) {
    db.model('Transfer').find({
        status: 'refunded',
      }).limit(1).sort({number: -1}).exec(
      function(err,data) {
        callback(err,data);
      });
  },
  getTransfer: function(query,callback) {
    db.model('Transfer').find(query).exec(
      function(err,data) {
        callback(err,data);
      });
  },
  upsertTransfer: function(query,doc,callback) {
    db.model('Transfer').update(
      query,doc,{upsert: true,new: true},
      function(err,data) {callback(err,data);}
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
        status: '$status',
        created: '$created',
      },
    };
    stages.push(project);

    if ((options.period !== undefined) && (options.period !== null)) {
      var cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - options.period);
      stages.push({$match: {created: {$gt: cutoff}}});
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
        total: {$sum: {$divide: ['$amount',2]}},},};
      stages.push(group);
      stages.push({$sort: {total: -1}});
    }else {
      stages.push({$sort: {number: -1}});
    }

    db.model('Transfer').aggregate(stages).exec(
      function(err,data) {
        callback(err,data);
      });
  },
  generateCommentedReport: function(posts) {
    var when = this.getDate(new Date());
    var permlink = 'tuanis-report-' + when;
    var title = 'Welcome report for ' + when;
    var body = 'Starting my duty report. \n';
    var tags = {tags: ['helpmejoin','minnowsupportproject']}
    body += '\n\nToday, I\'ve welcome the following users: \n';
    for (var i = 0; i < posts.length; i++) {
      body += '- @' + posts[i].author;
      body += ' [post](https://steemit.com' + posts[i].url + ')\n';
    }

    body += '\n\nMake sure to visit their profile and welcome them as well.\n';
    body += 'Long live Steemit, the social revolution platform.';
    if (conf.env.REPORT_ACTIVE()) {
      var voter = wait.for(
        steem_api.publishPost,
        conf.env.ACCOUNT_NAME(),
        permlink,
        tags,
        title,
        body
      );
      var options = wait.for(
        steem_api.publishPostOptions,
        conf.env.ACCOUNT_NAME(),
        permlink,
        0
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
    return vp;
  },
  
  getSteemPower: function(account) {
    var globalData = wait.for(
      steem_api.steem_getSteemGlobaleProperties_wrapper
    );
    this.debug('Steem VESTS: ' + account.vesting_shares);
    this.debug('Delegated VESTS: ' + account.received_vesting_shares);
    var delegatedSteemPower = steem_api.getSteemPowerFromVest(
      globalData,
      account.received_vesting_shares
    );
    var ownSteemPower = steem_api.getSteemPowerFromVest(
      globalData,
      account.vesting_shares
    );
    return parseFloat(delegatedSteemPower) +
      parseFloat(ownSteemPower);
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
