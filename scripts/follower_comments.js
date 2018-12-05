const
  wait = require('wait.for'),
  utils = require('../model/util'),
  steem_api = require('../model/steem_api'),
  conf = require('../config/current');

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
  console.log('From API');
  console.log(count);
  console.log('From DB');
  var followers_db = wait.for(utils.getData,'Follower',{});
  console.log(followers_db);
  // Verify if follower has active posts

  var lucky = utils.getRandom(count.follower_count, 10);
  console.log(lucky);
  var votes = 0;
  var followers_db = wait.for(utils.getData,'Follower',{});

  for (var i = 0; i < lucky.length; i++) {
    console.log('Processing ' + followers_db[lucky[i]].username);
    var posts = wait.for(steem_api.steem_getComments,followers_db[lucky[i]].username);
    if (posts.length > 0) {
      for (var j = 0; j < posts.length;j++) {
        if (followers_db[lucky[i]].username == posts[j].author) {
          // Valid posts
          if (utils.dateDiff(posts[j].created) < (86400 * 5)) {
            console.log('Found something to vote to');
            // Not voted yet
            if(followers_db[lucky[i]].reputation >= 25){
              var result = wait.for(
                steem_api.steem_getContent,
                posts[j].author,
                posts[j].permlink
              );
              var voted = steem_api.verifyAccountHasVoted(
                [conf.env.ACCOUNT_NAME()],
                result
              );
              if (!voted) {
                steem_api.votePost(posts[j].author, posts[j].permlink, weight);
                var title = 'Free upvote!';
                var comment = 'Congratulations @' + posts[j].author + '!';
                comment += ' You have received a vote as ';
                comment += 'a way to thank you for supporting my program.';
                // Decide how to handle this with a form and mongodb document
                var comment_result = steem_api.commentPost(
                  posts[j].author,
                  posts[j].permlink,
                  title,comment
                );
                var link = {
                  author: comment_result.operations[0][1].author,
                  url: comment_result.operations[0][1].permlink,
                  created: new Date(),
                };
                if (conf.env.SUPPORT_ACCOUNT() !== '') {
                  wait.for(utils.upsertModel,'Link',{
                    author: comment_result.operations[0][1].author,
                    url: comment_result.operations[0][1].permlink,
                  },link);
                }
                wait.for(utils.timeout_wrapper,22000);
                votes++;
                break;
              }else {
                console.log(posts[j].permlink);
                console.log('Already voted');
              }
            }
          }
        }
      }
    }else {
      console.log('No posts for ' + followers_db[i].username);
    }
  }
  console.log('Finish voting followers program');
  process.exit();
});