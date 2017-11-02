var express = require('express'),
  mongoose = require('mongoose'),
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/dev'),
  router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {

  mongoose.model('Transfer').find(
      {created: {$ne: null}}
    ).limit(500).sort({number: -1}).exec(
    function(err, transfers) {
      if (err) {
        return console.error(err);
      } else {
        res.format({
          html: function() {
            res.render('index', {
              title: 'Transfers',
              transfers: transfers,
            });
          },
        });
      }
    }
  );
});
router.get('/votes', function(req, res, next) {
  var options_voted = {
    voted: false,
  };
  wait.launchFiber(function() {
    var data = wait.for(utils.getReport,options_voted);
    res.format({
      html: function() {
        res.render('index', {
          title: 'Not voted report',
          transfers: data,
          type: 'votes',
        });
      },
    });
  });
});
router.get('/trees', function(req, res, next) {
  // Trees
  var options_trees = {
    rate: 0.93,
    trees: true,
  };
  wait.launchFiber(function() {
    var trees = wait.for(utils.getTreesTotal);
    var data = wait.for(utils.getReport,options_trees);
    res.format({
      html: function() {
        res.render('index', {
          title: 'Trees planted report',
          transfers: data,
          trees: trees,
          type: 'trees',
        });
      },
    });
  });
});
router.get('/queue', function(req, res, next) {
  wait.launchFiber(function() {
    var data = wait.for(utils.getQueue);
    res.format({
      html: function() {
        res.render('index', {
          title: 'Queue',
          transfers: data,
          type: 'queue',
        });
      },
    });
  });
});
router.get('/refunded', function(req, res, next) {
  var options_status = {
    status: 'refunded',
  };
  wait.launchFiber(function() {
    var data = wait.for(utils.getReport,options_status);
    res.format({
      html: function() {
        res.render('index', {
          title: 'Refunded transfers',
          transfers: data,
          type: 'refunded',
        });
      },
    });
  });
});
router.get('/full', function(req, res, next) {
  wait.launchFiber(function() {
    var data = wait.for(utils.getReport,{});
    res.format({
      html: function() {
        res.render('index', {
          title: 'Full',
          transfers: data,
          type: 'full',
        });
      },
    });
  });
});

module.exports = router;
