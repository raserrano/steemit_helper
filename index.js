const
  steem = require('steem'),
  wait = require('wait.for');

const 
  ACCOUNT_NAME = 'treeplanter';
  DEBUG = false;

var configs = [
  "wss://steemd.steemit.com",
  "wss://steemd.steemitdev.com",
  "wss://gtg.steem.house:8090",
  "wss://seed.bitcoiner.me",
  "wss://this.piston.rocks",
  "wss://node.steem.ws"
];
steem.config.set('websocket',configs[0]);

// // Get account
// steem.api.getAccounts(query, function(err, result) {
//  console.log(result);
//  accounts = result;
//   for(var i=0; i < accounts.length;i++){
//     var vp = accounts[i].voting_power;
//     var vt = new Date(accounts[i].last_vote_time);
//     var current = new Date();
//     console.log('Voting power: '+vp);
//     console.log('Voting time: '+vt);
//     console.log('Actual time: '+current);
//     if(current > vt){
//       var diff = (current - vt)/1000;
//       console.log('Difference: '+diff);
//       var vp2 = diff * 10000 / 86400 / 5;
//       console.log('Recalculating');
//       console.log('Add to voting power: '+vp2);
//     }
//   }
// });

// // Get global properties
// steem.api.getDynamicGlobalProperties(query, function(err, result) {
//   //console.log(result);
//  globals = result;
// });

// SP calculation

wait.launchFiber(function(){
  var max = 15000;
  var limit = 1000;
  var results = wait.for(getTransfers,ACCOUNT_NAME,max,limit);
  getVotesReport(results);
});

function getVotesReport(data){
  debug('Starting report...');
  for(var i=0; i<data.length;i++){
    if(data[i][1].op[0]=='transfer'){
      if(data[i][1].op[1].to == ACCOUNT_NAME){
        getContent(data[i]);
      }
    }
  }
}

function getTransfers(name,max,limit,callback){
  debug('Getting transfers');
  // 1000000,10000
  steem.api.getAccountHistory(name,max,limit,function(err,result){
    callback(err,result);
  });
}
function getContent(post){
  // debug(post);
  debug(post[1].op[1]);

  var number = post[0];
  var payer = post[1].op[1].from;
  var memo = post[1].op[1].memo;
  var amount = post[1].op[1].amount;
  if(memo.indexOf('/') != -1){
    if(memo.indexOf('#') == -1){
      var post_url = post[1].op[1].memo.split('/');
      var author = post_url[post_url.length-2]
        .substr(1, post_url[post_url.length-2].length);
      var post = post_url[post_url.length-1];

      // Debug
      // debug('Payer: '+payer);
      // debug('Amount: '+amount);
      // debug('Author: '+author);
      // debug('Post: '+post);
      // debug('Memo: '+memo);

      if(post != undefined && author != undefined 
        && post != null && author != null){
        var result = wait.for(steem_getContent,author,post);
        var created = result.created;
        if(!getTreeplanterVote(result)){
          var obj = {number,payer,memo,amount,author,post,created};
          console.log(JSON.stringify(obj));
        }
      }else{
        debug(JSON.stringify(post[1].op[1]));
      }   
    }else{
      debug('Vote on comment');
    }
  }else{
    debug('URL not found, donation');
  }
}

function getTreeplanterVote(result){
  var pos = false;
  var votes = new Array();
  if(result.active_votes.length > 0){
    for(var i=0; i< result.active_votes.length;i++){
      votes.push(result.active_votes[i].voter);
    }
    pos = (votes.indexOf(ACCOUNT_NAME) != -1);
  }
  if(DEBUG){
    if(!pos){
      debug(JSON.stringify(votes));
    }    
  }
  return pos;
}

function steem_getContent(author,post,callback){
  steem.api.getContent(author, post,function(err,result){
    callback(err,result);
  });
}

function debug(message){
  if(DEBUG){
    console.log(message);
  }
}


// getContent([0,{op:[0,{from:'raserrano',memo:'colorchallenge-orange-tuesday-costa-rican-sunset-at-the-beach'}]}]);
// getContent([0,{op:[0,{from:'raserrano',memo:'sunday-visit-to-the-church-and-buying-flowers'}]}]);
// getContent([0,{op:[0,{from:'scooter77',memo:'australia-s-stolen-generation-an-elders-story-building-a-more-tolerant-culture'}]}]);
// getContent([0,{op:[0,{from:'kedjom-keku',memo:'vote-bot-testing-testing-blog-only'}]}]);
//{"author":"kedjom-keku","post":"vote-bot-testing-testing-blog-only"}


// debug(JSON.stringify(not_voted));

// //Get active discussion by votes
// steem.api.getDiscussionsByVotes(account, function(err, result) {
//   console.log('Votes');
//   console.log(err, result);
// });



// const resultP = steem.api.getContentAsync('raserrano', 'steem-is-almost-1-06-and-up');
// resultP.then(result => console.log(result));

// // Something
// steem.api.getState('/trends/funny', function(err, result) {
//   console.log('State')
//   console.log(err, result);
// });

// //Reward Fund
// steem.api.getRewardFund(account, function(err, result) {
//   console.log('Rewards');
//   console.log(err, result);
// });

// Feed history
// steem.api.getCurrentMedianHistoryPrice(function(err, result) {
//   console.log('Feed ');
//   console.log(err, result);
// });

// // Get content
// steem.api.getContent(author, permlink, function(err, result) {
//   console.log(err, result);
// });

// steem.api.getAccountHistory(name, Number.MAX_SAFE_INTEGER, 10, function (err, result) {
//   records = result;
//   for(var i=0; i < result.length; i++){
//     console.log(result[i][1].op[1]);
//   }
// });
//console.log(process.env);
