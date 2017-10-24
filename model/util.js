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
              if (res.amount > min) {
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
  getTransfersToVote: function(account,data,min,max) {
    for (var i = 0; i < data.length;i++) {
      if (data[i][1].op[0] == 'transfer') {
        if (data[i][1].op[1].to == account) {
          var res = this.getContent([account],data[i]);
          var query = {number: data[i][0]};
          if (res !== null) {
            db.model('Transfer').update(query,res,{upsert: true},function(err) {
              if (err) {
                console.log(res);
                throw err;
              }
            });
          }else {
            db.model('Transfer').create(query,res,{upsert: true},function(err) {
              if (err) {
                console.log(res);
                throw err;
              }
            });
          }
        }
      }
    }
  },
  startVotingProcess: function(account,data,weight,voter) {
    var vp = voter.voting_power;
    var posts = new Array();
    for (var i = 0; i < data.length;i++) {
      if (data[i][1].op[0] == 'transfer') {
        if (data[i][1].op[1].to == account) {
          var post = this.getContent([account,conf.env.ACCOUNT_NAME()],data[i]);
          if (post !== null) {
            if (!post.voted) {
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
      this.debug(posts[posts.length - 1]);
      if (conf.env.VOTE_ACTIVE()) {
        if (vp >= (conf.env.MIN_VOTING_POWER() * conf.env.VOTE_POWER_1_PC())) {
          steem_api.votePost(
            posts[posts.length - 1].author,
            posts[posts.length - 1].post,
            weight
          );
          wait.for(this.timeout_wrapper,5000);
        }
      }else {
        this.debug(
          'Voting is not active, voting: ' + JSON.stringify(posts[posts.length - 1])
        );
      }
    }
  },
  startVotingDonationsProcess: function(account,data,voter) {
    var comment = '';
    var title = '';
    for (var i = 0;i < data.length;i++) {
      console.log(data[i]);
      break;
      if (data[i].amount >= conf.env.MIN_DONATION()) {
        var amount_to_be_voted = data[i].amount;
        if (data[i].amount > conf.env.MAX_DONATION()) {
          amount_to_be_voted = conf.env.MAX_DONATION();
          data[i].donation = data[i].amount - conf.env.MAX_DONATION();
        }
        var voter = wait.for(
          steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
        );
        var vp = voter.voting_power;
        var weight = steem_api.calculateVoteWeight(
          voter[0],
          (amount_to_be_voted * conf.env.VOTE_MULTIPLIER())
        );
        if (conf.env.VOTE_ACTIVE()) {
          if (vp >= (conf.env.MIN_VOTING_POWER() * conf.env.VOTE_POWER_1_PC())) {
            if (conf.env.VOTE_ACTIVE()) {
              steem_api.votePost(data[i].author,data[i].memo,weight);
              wait.for(this.timeout_wrapper,5000);
            }else {
              this.debug(
                'Voting is not active, voting: ' + JSON.stringify(data[i])
              );
            }
            if (conf.env.COMMENT_ACTIVE()) {
              steem_api.commentPost(data[i].author,data[i].memo,weight);
              wait.for(this.timeout_wrapper,20000);
            }else {
              this.debug(
                'Commenting is not active, commenting: ' + JSON.stringify(data[i])
              );
            }
            db.model('Transfer').update(
              {_id: data[i]._id},
              {donation: data[i].donation,voted: true},
              function(err) {
                if (err) {
                  console.log(res);
                  throw err;
                }
              }
            );
          }
        }else {
          this.debug(
            'Voting is not active, voting: ' + JSON.stringify(data[i])
          );
        }
      }else {
        db.model('Transfer').update(
          {_id: data[i]._id},
          {donation: data[i].amount},
          function(err) {
            if (err) {
              console.log(res);
              throw err;
            }
          }
        );
      }
    }
  },
  commentOnNewUserPost: function(posts,weight) {
    var comment = '';
    var title = 'Welcome';
    for (var i = 0; i < posts.length;i++) {
      var author = posts[i].author;
      var account = wait.for(steem_api.steem_getAccounts_wrapper,[author]);
      var created = account[0].created;
      if (this.dateDiff(created) < (86400 * 7)) {
        if (!steem_api.verifyAccountHasVoted([conf.env.ACCOUNT_NAME],posts[i])) {
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
            ' transfer registration fee. @OriginalWorks ' +
            'If you want a little boost in your posts and also help the ' +
            ' evironment try @treeplanter .' +
            'Use @tipu to give users a 0.1 SBD tip. ';
            steem_api.commentPost(
              posts[i].author,
              posts[i].permlink,
              title,
              comment
            );
            wait.for(this.timeout_wrapper,20000);
          }else {
            this.debug(
              'Commenting is not active, commenting: ' + JSON.stringify(posts[i])
            );
          }
        }else {
          this.debug('Account was already voted')
        }
      }else {
        this.debug('Account is old')
      }
    }
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
    var author = '';
    var url = '';
    var created = '';
    if (memo.indexOf('/') != -1) {
      if (memo.indexOf('#') == -1) {
        var post_url = post[1].op[1].memo.split('/');
        post_url = post_url.filter(function(e) {return e});
        author = post_url[post_url.length - 2]
          .substr(1, post_url[post_url.length - 2].length);
        url = post_url[post_url.length - 1];
        if (post != undefined && author != undefined
          && post != null && author != null) {
          var result = wait.for(steem_api.steem_getContent,author,url);
          if ((result !== undefined) && (result !== null)) {
            created = result.created;
            voted = steem_api.verifyAccountHasVoted(account,result);
          }else {
            author = 'content-not-found';
          }
        }else {
          author = 'url-not-found';
        }
      }else {
        author = 'comment';
      }
    }else {
      author = 'donation';
    }
    obj = {number,payer,memo,amount,currency,author,url,voted,created};
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
    db.model('Transfer').find({voted: false,donation: {$gt: 0}}).sort({number: 1}).exec(
      function(err,data) {
        callback(err,data);
      });
  },
  getReport: function(period,is_voted,callback) {
    var today = new Date();
    var cutoff = new Date();
    // Improve date ranges search
    // Fix the static rate calculation for steem
    cutoff.setDate(cutoff.getDate() - period);
    console.log(cutoff);
    console.log(today);
    db.model('Transfer').aggregate(
      {$project: {
        payer: '$payer',
        amount: {
          $cond: {
            if: {$eq: ['$currency','STEEM']},
            then: {$multiply: ['$amount',0.93]},
            else: '$amount',
          },
        },
        currency: '$currency',
        voted: '$voted',
        created: '$created',
      },},
      {$group: {
        _id: {payer: '$payer'},total: {$sum: {$divide: ['$amount',2]}},},
    }
    ).sort({total: -1}).exec(
      function(err,data) {
        callback(err,data);
      });
  },
  generateCommentedReport: function(posts) {
    var when = this.getDate(new Date());
    var permlink = 'tuanis-report';
    var title = 'Welcome repor for ' + when;
    var body = 'Starting my duty report. \n';
    var tags = {tags: ['helpmejoin','minnowsupportproject']}
    body += '\n\nToday, I\'ve welcome the following users: \n';
    for (var i = 0; i < posts.length; i++) {
      body += '- @' + posts[i].author;
      body += ' [post]](https://steemit.com' + posts[i].url + ')\n';
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
  dateDiff: function(when) {
    var then = new Date(when);
    var now = new Date();
    return (now - then) / 1000;
  },
  getDate: function(when) {
    return (when.getMonth() + 1) + '-' + when.getDate() + '-' + when.getFullYear();
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