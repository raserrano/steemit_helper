const
  wait = require('wait.for'),
  utils = require('../model/util'),
  steem_api = require('../model/steem_api'),
  conf = require('../config/dev');

wait.launchFiber(function() {
  var account = {};
  var voter = wait.for(
    steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
  );
  var weight = steem_api.calculateVoteWeight(voter[0],0.03);
  var count = wait.for(
    steem_api.steem_getFollowersCount,
    conf.env.ACCOUNT_NAME()
  );
  // Verify followers 
  var processed = 0;
  while(processed < count.follower_count){
    var max = processed + 100;
    var followers = wait.for(
      steem_api.steem_getFollowers,
      conf.env.ACCOUNT_NAME(),
      processed,
      'blog',
      max
    );
    while(processed < max && processed < count.follower_count){
      obj = {
        username:followers[processed].follower,
        tier:{level:0,vote:10,vote_count:2},
        active:true,
        reputation:25,
      }
      wait.for(
        utils.upsertFollower,
        {username:followers[processed].follower},
        obj
      );
      processed++;
    }
  }
  // verify if follower has active posts

  // Random
  var min = Math.ceil(0);
  var max = Math.floor(count.follower_count);
  var lucky = new Array();
  var k=0;
  while(k++<10){
    lucky.push(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  console.log(lucky);
  var votes = 0;
  var followers = wait.for(utils.getFollowers);


  for(var i = 0; i< lucky.length; i++){
    console.log('Processing '+followers[lucky[i]].username);
    var posts = wait.for(steem_api.steem_getPostsByAuthor,followers[lucky[i]].username,20);
    console.log(posts.length);
    if(posts.length > 0){
      for(var j=0; j< posts.length;j++){
        if(followers[lucky[i]].username == posts[j].author){
          // Valid posts
          if(utils.dateDiff(posts[j].created) < (86400 * 6.5)){
            console.log('Found something to vote to');
            // Not voted yet
            var result = wait.for(
              steem_api.steem_getContent,
              posts[j].author,
              posts[j].permlink
            );
            var voted = steem_api.verifyAccountHasVoted(
              [conf.env.ACCOUNT_NAME()],
              result
            );
            if(!voted){
              steem_api.votePost(posts[j].author, posts[j].permlink, weight);
              wait.for(utils.timeout_wrapper,5500);
              var title = 'Thanks for your donation';
              var comment = 'Congratulations @' + posts[j].author + '!';
                comment += ' You have received a vote as ';
                comment += 'a way to thank you for supporting my program.';
              // Decide how to handle this with a form and mongodb document
              steem_api.commentPost(posts[j].author, posts[j].permlink, title,comment);
              wait.for(utils.timeout_wrapper,22000);
              votes++;
              break;
            }else{
              console.log(posts[j].permlink);
              console.log('Already voted');
            }
          }
        }
      }
    }else{
      console.log('No posts for '+followers[i].username);
    }
  }
  // for(var i = 0; i< followers.length; i++){
  //   console.log('Processing '+followers[i].username);
  //   var posts = wait.for(steem_api.steem_getPostsByAuthor,followers[i].username,20);
  //   console.log(posts.length);
  //   if(posts.length > 0){
  //     for(var j=0; j< posts.length;j++){
  //       if(followers[i].username == posts[j].author){
  //         // Valid posts
  //         if(utils.dateDiff(posts[j].created) < (86400 * 6.5)){
  //           console.log('Found something to vote to');
  //           // Not voted yet
  //           var result = wait.for(
  //             steem_api.steem_getContent,
  //             posts[j].author,
  //             posts[j].permlink
  //           );
  //           var voted = steem_api.verifyAccountHasVoted(
  //             [conf.env.ACCOUNT_NAME()],
  //             result
  //           );
  //           if(!voted){
  //             steem_api.votePost(posts[j].author, posts[j].permlink, weight);
  //             wait.for(utils.timeout_wrapper,5500);
  //             var title = 'Thanks for your donation';
  //             var comment = 'Congratulations @' + posts[j].author + '!';
  //               comment += ' You have received a vote as ';
  //               comment += 'a way to thank you for supporting my program.';
  //             // Decide how to handle this with a form and mongodb document
  //             steem_api.commentPost(posts[j].author, posts[j].permlink, title,comment);
  //             wait.for(utils.timeout_wrapper,22000);
  //             votes++;
  //             break;
  //           }else{
  //             console.log(posts[j].permlink);
  //             console.log('Already voted');
  //           }
  //         }
  //       }
  //     }
  //   }else{
  //     console.log('No posts for '+followers[i].username);
  //   }
  // }
  // vote them and update counter per day.
  console.log('Finish report');
  process.exit();
});