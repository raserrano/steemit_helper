const
  wait = require('wait.for'),
  conf = require('../config/dev'),
  db = require('./db'),
  fs = require('fs'),
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
            if (!to_vote.voted) {
              steem_api.votePost(
                to_vote.author,
                to_vote.url,
                weight
              );
              wait.for(this.timeout_wrapper,5000);
            }
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
                comment += '[www.kedjom-keku.com](www.kedjom-keku.com)';
              }else {
                title = 'Thanks for your donation';
                comment = 'Congratulations @' + data[i].author + '!';
                comment += ' You have received a vote as ';
                comment += 'part of  @' + data[i].payer;
                comment += ' donation to this project.\n';
                comment += 'I will be able to help more #minnows \n';
              }
              // Decide how to handle this with a form and mongodb document
              steem_api.commentPost(data[i].author, data[i].url, title,comment);
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
        memo = 'I am sorry my SP was not enough to upvote the post you sent ';
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
      if (data[i].status === 'self-comment' ||
        data[i].status === 'comment' ||
        data[i].status === 'self-vote') {
        memo = conf.env.REFUND_TEXT();
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
              if (conf.env.COMMENT_ACTIVE()) {
                comment = 'Welcome to steemit @' + posts[i].author +
                '. Join #minnowsupportproject for more help. ' +
                'Type in the comments of a post @OriginalWorks ' +
                ' and it will help you verify that content is original.\n' +
                'Transfer SBD to @treeplanter to plant trees and get an ' +
                'get an upvote in exchange of your donation (Min 0.01 SDB) \n' +
                'Upvote this comment to keep helping more new steemians \n' +
                'Transfer SBD to @tuanis in exchange of an upvote and ' +
                'support this project';

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
      var account = wait.for(steem_api.steem_getAccounts_wrapper,[author]);
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
          'self-comment',
          'self-vote',
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
  getTransfer: function(query,callback) {
    db.model('Transfer').find(query).exec(
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
        processed_date: '$processed_date',
        status: '$status',
        created: '$created',
      },
    };
    stages.push(project);

    if ((options.period !== undefined) && (options.period !== null)) {
      var cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - options.period);
      console.log(cutoff);
      stages.push(
        {$match: {processed_date: {$gt: cutoff}}}
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
        total: {$sum: {$divide: ['$amount',2]}},},};
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
    this.preparePost(
      conf.env.ACCOUNT_NAME(),
      permlink,
      title,
      body,
      tags
    );
  },
  generateTreeplanterReport: function(
    total,count,donators,average,steempower,rate,period,trees,specific,report) {
    var when = this.getDate(new Date());
    var permlink = 'treeplanter-report-' + when;
    var title = 'Treeplanter report for ' + when;
    var tags = {tags: ['nature','charity','treeplanter','life','fundraising']};

    // Magic to generate body
    var header = 'Rank | Username | Total \n---|---|---\n';
    var body = 'Hello all tree planters.\n';
    body += 'We can plant ' + total + ' of trees thanks to you.\n\n';
    body += 'Followers: ' + count + '\nNumber of tree planters: ' + donators;
    body += '\nTrees planted: ' + total + '\n';
    body += 'Average amount of trees planted daily: ' + average + '\n';
    body += 'STEEM POWER: ' + steempower + '\nDOLLAR/STEEM exchange rate: ';
    body += rate + '\n\n';

    var range = 'TODAY';
    if (period > 8) {
      range = 'THIS MONTH';
    }else {
      if (period > 1) {
        range = 'THIS WEEK';
      }
    }
    body += 'TOTAL RANKING OF ' + range + '\n';
    body += 'RANK  STEEMIAN  AMOUNT OF TREES PLANTED\n';
    body += header;
    for (var i = 0; i < specific.length;i++) {
      body += (i + 1) + ' | @' + specific[i]._id.payer +
      ' | ' + specific[i].total.toFixed(2) + '\n';
    }

    body += '\n\nTOTAL RANKING OF ALL TREE PLANTERS\n';
    body += header;
    for (var j = 0; j < trees.length;j++) {
      body += (j + 1) + ' | @' + trees[j]._id.payer +
      ' | ' + trees[j].total.toFixed(2) + '\n';
    }

    // Read file and add it to body
    var contents = fs.readFileSync('./reports/treeplanter.md', 'utf8');
    body += '\n' + contents;

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
    body += 'I am able to help more minnows. Thanks for your support.\n ';
    body += '\n';
    body += '- **Followers:** ' + account.followers + '\n';
    body += '- **Reputation:** ' + account.reputation + '\n';
    body += '- **Vote value:** ' + account.vote + '\n';
    body += '- **Steem power:** ' + account.sp + '\n';
    body += '\n\n';
    body += '![tuanis.jpeg](https://steemitimages.com/DQmUdo4Ngm8JgDqRL4FndKksi7HzgbGMkFXwNpbYACWMQVu/tuanis.jpeg) \n\n';
    body += 'Upvote this report to keep supporting this project. \n\n';
    body += '--- \n';
    body += 'You can also support this project by sending a transfer and a ';
    body += 'post or comment URL in the memo field. **Minimum is 0.01 SBD** ';
    body += 'I will upvote it to a value of 1.5 times your donation. \n';
    body += '**Max upvote value to 0.03 SBD**, you can always send more  ';
    body += 'but it will be consider a donation.';
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
      //{account: 'raserrano', weight: 1000 },
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
