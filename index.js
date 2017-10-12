const 
  VOTE_PERC = 100,
  VOTE_POWER_1_PC = 100,
  MIN_VOTING_POWER = 70,
  DEBUG = false;

var globalData,
  conversionInfo = new Object();

var configs = ;

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


// // Voting for high bids
// wait.launchFiber(function(){
//   var max = 10000000;
//   var limit = 50;
//   globalData = wait.for(steem_getSteemGlobaleProperties_wrapper);
//   var accounts = wait.for(steem_getAccounts_wrapper,[process.env.ACCOUNT_NAME]);
//   var accounts_to = process.env.VOTING_ACCS.split(',');
//   var results_booster = wait.for(getTransfers,accounts_to[0],max,limit);
//   init_conversion();
//   // debug(conversionInfo);
//   var weight = calculateVoteWeight(accounts[0]);
//   startVotingProcess(accounts_to[0],results_booster,weight);

//   var results_belly = wait.for(getTransfers,accounts_to[1],max,limit);
//   startVotingProcess(accounts_to[1],results_belly,weight);

//   var results_minnow = wait.for(getTransfers,accounts_to[2],max,limit);
//   startVotingProcess(accounts_to[2],results_minnow,weight);
//   // var results_belly = wait.for(getTransfers,accounts_to[1],max,limit);
//   // var results_minnowbooster = wait.for(getTransfers,accounts_to[2],max,limit);
// });

//var max = wait.for(steem_getAccountHistory_wrapper, 10000000, 1);


// SP calculation

// wait.launchFiber(function(){
//   var max = 15000;
//   var limit = 1000;
//   var results = wait.for(getTransfers,process.env.ACCOUNT_NAME,max,limit);
//   getVotesReport(results);
// });

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
