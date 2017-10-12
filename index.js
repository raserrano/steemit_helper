const
  wait = require('wait.for'),
  request = require('request');

const 
  VOTE_PERC = 100,
  VOTE_POWER_1_PC = 100,
  MIN_VOTING_POWER = 70,
  DEBUG = false;

var globalData,
  conversionInfo = new Object();

var configs = [
  "wss://steemd.steemit.com",
  "wss://steemd.steemitdev.com",
  "wss://gtg.steem.house:8090",
  "wss://seed.bitcoiner.me",
  "wss://this.piston.rocks",
  "wss://node.steem.ws"
];

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


// wait.launchFiber(function(){
//   var max = 20000;
//   var limit = 10000;
//   var results = wait.for(getTransfers,'treeplanter',max,limit);
//   getVotesReport(['treeplanter'],results);
// });

// Voting for high bids
wait.launchFiber(function(){
  var max = 10000000;
  var limit = 50;
  globalData = wait.for(steem_getSteemGlobaleProperties_wrapper);
  var accounts = wait.for(steem_getAccounts_wrapper,[process.env.ACCOUNT_NAME]);
  var accounts_to = process.env.VOTING_ACCS.split(',');
  var results_booster = wait.for(getTransfers,accounts_to[0],max,limit);
  init_conversion();
  // debug(conversionInfo);
  var weight = calculateVoteWeight(accounts[0]);
  startVotingProcess(accounts_to[0],results_booster,weight);

  var results_belly = wait.for(getTransfers,accounts_to[1],max,limit);
  startVotingProcess(accounts_to[1],results_belly,weight);

  var results_minnow = wait.for(getTransfers,accounts_to[2],max,limit);
  startVotingProcess(accounts_to[2],results_minnow,weight);
  // var results_belly = wait.for(getTransfers,accounts_to[1],max,limit);
  // var results_minnowbooster = wait.for(getTransfers,accounts_to[2],max,limit);
});

//var max = wait.for(steem_getAccountHistory_wrapper, 10000000, 1);



// SP calculation

// wait.launchFiber(function(){
//   var max = 15000;
//   var limit = 1000;
//   var results = wait.for(getTransfers,process.env.ACCOUNT_NAME,max,limit);
//   getVotesReport(results);
// });

function getVotesReport(account,data){
  debug('Starting report...');
  for(var i=0; i<data.length;i++){
    if(data[i][1].op[0]=='transfer'){
      if(data[i][1].op[1].to == account[0]){
        var res = getContent(account,data[i]);
        if(res !== null){
          console.log(JSON.stringify(res));          
        }
      }
    }
  }
}

function startVotingProcess(account,data,weight){
  var posts = new Array();
  for(var i=0; i<data.length;i++){
    if(data[i][1].op[0]=='transfer'){
      if(data[i][1].op[1].to == account){
        var post = getContent([account,process.env.ACCOUNT_NAME],data[i]);
        if(post !== null){
          console.log(JSON.stringify(post));
          posts.push(post);
        }
      }
    }
  }
  posts.sort(function(a,b) {
    return (a.amount > b.amount) ? 1 : ((b.amount > a.amount) ? -1 : 0);
  });
  //debug(posts[posts.length-1]);
  votePost(posts[posts.length-1].author,posts[posts.length-1].post,weight);
}

function getContent(account,post){
  var obj = null;
  var number = post[0];
  var payer = post[1].op[1].from;
  var memo = post[1].op[1].memo;
  var amount_parts = post[1].op[1].amount.split(' ');
  var amount = parseFloat(amount_parts[0]);
  if(memo.indexOf('/') != -1){
    if(memo.indexOf('#') == -1){
      var post_url = post[1].op[1].memo.split('/');
      var author = post_url[post_url.length-2]
        .substr(1, post_url[post_url.length-2].length);
      var post = post_url[post_url.length-1];

      // Debug
      debug('Payer: '+payer);
      debug('Amount: '+amount);
      debug('Author: '+author);
      debug('Post: '+post);
      debug('Memo: '+memo);

      if(post != undefined && author != undefined 
        && post != null && author != null){
        var result = wait.for(steem_getContent,author,post);
        var created = result.created;
        //if(!verifyAccountHasVoted(account,result)){
        obj = {number,payer,memo,amount,author,post,created};
        //}
      }else{
        debug(JSON.stringify(post[1].op[1]));
      }   
    }else{
      debug('Vote on comment');
    }
  }else{
    debug('URL not found, donation');
  }
  return obj;
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
