const
  wait = require('wait.for'),
  utils = require('../model/util'),
  steem_api = require('../model/steem_api'),
  conf = require('../config/dev');

wait.launchFiber(function() {
  var account = {};
  var date = new Date();
  var voter = wait.for(
    steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
  );
  var weight =  conf.env.WEIGHT();
  var count = wait.for(
    steem_api.steem_getFollowersCount,
    conf.env.ACCOUNT_NAME()
  );

  if (date.getDay() === 0) {
    console.log('Followers ' + count.follower_count);
    // Verify followers
    var batch = 100;
    var processed = '';
    var followers = [];
    var i = 0;
    while(i < count.follower_count){
      try{
        followers = wait.for(
          steem_api.steem_getFollowers,
          conf.env.ACCOUNT_NAME(),
          processed,
          'blog',
          batch
        );
      }catch(e){
        console.log(e);
      }
      // console.log(followers.length);
      for(var current = 0; current < followers.length; current++){
        var user = {};
        try{
          user = wait.for(
            steem_api.steem_getAccounts_wrapper,[followers[current].follower]
          );
        }catch(e){
          console.log(e);
        }
        // console.log(followers[current])
        var rep = utils.getReputation(user[0]);
        obj = {
          username:followers[current].follower,
          tier:{level:0,vote:10,vote_count:2},
          active:true,
          created: date,
          reputation:rep,
        };
        wait.for(
          utils.upsertFollower,
          {username:followers[current].follower},
          obj
        );
        processed = followers[current].follower;
        i++;
      }
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
    if(posts.length > 0){
      for(var j=0; j< posts.length;j++){
        if(followers[lucky[i]].username == posts[j].author){
          // Valid posts
          if(utils.dateDiff(posts[j].created) < (86400 * 5)){
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
              var title = 'Thanks for your donation';
              var comment = 'Congratulations @' + posts[j].author + '!';
                comment += ' You have received a vote as ';
                comment += 'a way to thank you for supporting my program.';
              // Decide how to handle this with a form and mongodb document
              var comment_result = steem_api.commentPost(posts[j].author, posts[j].permlink, title,comment);
              utils.debug(JSON.stringify(comment_result));
              if (conf.env.SUPPORT_ACCOUNT() !== '') {
                wait.for(utils.upsertLink,query,res);
              }
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
  console.log('Finish report');
  process.exit();
});