var express = require('express'),
  mongoose = require('mongoose'),
  wait = require('wait.for'),
  utils = require('../model/util'),
  conf = require('../config/dev'),
  router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  // // Report types
  // // Full
  // var options_full = {};
  // // Not voted
  // var options_notvoted = {
  //   voted: false,
  // };
  // // Trees
  // var options_trees = {
  //   rate: 0.93,
  //   trees:true
  // };
  // // Period
  // var options_period = {
  //   period: 6,
  //   voted:false
  // };

  // var data = wait.for(utils.getReport,options_period);
  mongoose.model('Transfer').find({created:{$ne:null}}).limit(500).sort({number: -1}).exec(
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
router.get('/trees', function(req, res, next) {
  var options_voted = {
    voted: false,
  };
  wait.launchFiber(function() {
    var data = wait.for(utils.getReport,options_voted);
    res.format({
      html: function() {
        res.render('report', {
          title: 'Not voted report',
          transfers: data,
          type:'votes',
        });
      },
    });
  });
});
router.get('/voted', function(req, res, next) {
  // Trees
  var options_trees = {
    rate: 0.93,
    trees:true
  };
  wait.launchFiber(function() {
    var data = wait.for(utils.getReport,options_trees);
    res.format({
      html: function() {
        res.render('report', {
          title: 'Trees planted report',
          transfers: data,
          type:'trees',
        });
      },
    });
  });
});

module.exports = router;
