const 
  wait = require('wait.for'),
  conf = require('../config/dev'),
  db = require('./db')
  steem_api = require('./steem_api');
module.exports = {
  getTransfersToVoteReport: function(account,data,type,min,max){
  // var weight = steem_api.calculateVoteWeight(
  //   conversionInfo,
  //   globalData,
  //   accounts[0]
  // );
  // console.log('Weight: '+weight);
    for(var i=0; i<data.length;i++){
      if(data[i][1].op[0]=='transfer'){
        if(data[i][1].op[1].to == account[0]){
          var res = this.getContent(account,data[i],"report",min,max);
          if(res !== null && res !== undefined){
            if(type === "report"){
              console.log(JSON.stringify(res));  
            }
            if(type === "donate"){
              db.model('Transfer').create(res,function(err) {
                if (err) {
                  console.log(res);
                  throw err;
                }
              });
            }
          }
        }
      }
    }
  },
  startVotingProcess: function(account,data,weight){
    var posts = new Array();
    for(var i=0; i<data.length;i++){
      if(data[i][1].op[0]=='transfer'){
        if(data[i][1].op[1].to == account){
          var post = this.getContent(
            [account,conf.env.ACCOUNT_NAME],
            data[i],
            "vote"
          );
          if(post !== null){
            console.log(JSON.stringify(post));
            posts.push(post);
          }
        }
      }
    }
    if(posts.length > 0){
      posts.sort(function(a,b) {
        return (a.amount > b.amount) ? 1 : ((b.amount > a.amount) ? -1 : 0);
      });
      this.debug(posts[posts.length-1]);
      // steem_api.votePost(
      //   posts[posts.length-1].author,
      //   posts[posts.length-1].post,
      //   weight
      // );
    }
  },
  commentOnNewUserPost: function(posts,weight){
    for(var i=0; i<posts.length;i++){
      var author = posts[i].author;
      var account = wait.for(steem_api.steem_getAccounts_wrapper,[author]);
      var created = account[0].created;
      if(this.dateDiff(created) < (86400*7)){
        if(!steem_api.verifyAccountHasVoted([conf.env.ACCOUNT_NAME],posts[i])){
          // steem_api.votePost(posts[i].author,posts[i].permlink,weight);
          // wait.for(this.timeout_wrapper,5000);
          // steem_api.commentPost(posts[i].author,posts[i].permlink);
          // wait.for(this.timeout_wrapper,20000);
          this.debug('Voted on: '+JSON.stringify(posts[i]));
        }else{
          this.debug('Account was already voted')
        }
      }else{
        this.debug('Account is old')
      }
    }
  },
  getContent: function(account,post,type,min,max){
    var obj = null;
    var number = post[0];
    var payer = post[1].op[1].from;
    var memo = post[1].op[1].memo;
    var amount_parts = post[1].op[1].amount.split(' ');
    var amount = parseFloat(amount_parts[0]);
    var donation = 0;
    var currency = amount_parts[1];
    if(memo.indexOf('/') != -1){
      if(memo.indexOf('#') == -1){
        var post_url = post[1].op[1].memo.split('/');
        var author = post_url[post_url.length-2]
          .substr(1, post_url[post_url.length-2].length);
        var post = post_url[post_url.length-1];
        if(post != undefined && author != undefined 
          && post != null && author != null){
          var result = wait.for(steem_api.steem_getContent,author,post);
          var created = result.created;
          if(type === "vote"){
            if(steem_api.verifyAccountHasVoted(account,result)){
              obj = {number,payer,memo,amount,currency,author,post,created};
            }
          }
          if(type === "report"){
            if(!steem_api.verifyAccountHasVoted(account,result)){
              if(amount >= min){
                if(amount > max){
                  donation = amount - max;
                  amount = max;
                }
                obj = {number,payer,memo,amount,donation,currency,author,post,created};
              }else{
                this.debug("Not enough transferred");
              }
            }else{
              this.debug("Already voted on post")
            }
          }
        }else{
          this.debug(JSON.stringify(post[1].op[1]));
        }   
      }else{
        this.debug('Vote on comment');
      }
    }else{
      this.debug('URL not found, donation');
    }
    return obj;
  },
  getLastVoted: function(callback){
    db.model('Transfer').find({}).limit(1).sort({number: -1}).exec(
      function(err,data) {
        callback(err,data);
      });
  },
  getQueue: function(callback){
    db.model('Transfer').find({}).sort({number: -1}).exec(
      function(err,data) {
        callback(err,data);
      });
  },
  dateDiff: function(when){
    var then = new Date(when);
    var now = new Date();
    return (now - then)/1000;
  },
  debug: function(message){
    if(conf.env.DEBUG() === true){
      console.log(message);
    }
  },
  timeout_wrapper: function(delay, callback) {
    setTimeout(function() {
      callback(null, true);
    }, delay);
  }
}