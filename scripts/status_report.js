const
  wait = require('wait.for'),
  utils = require('../model/util'),
  steem_api = require('../model/steem_api'),
  fs = require('fs'),
  sprintf = require('sprintf-js').sprintf,
  conf = require('../config/current');
// Daily stats
wait.launchFiber(function() {
  var voter = '';
  var globalData = '';
  try {
    voter = wait.for(
      steem_api.steem_getAccounts_wrapper,[conf.env.ACCOUNT_NAME()]
    );
  }catch (e) {
    console.log(e);
    process.exit();
  }
  var report_date = new Date();
  console.log('Report date: ' + report_date);
  // Status
  var options_status = {
    voted: true,
    status: 'processed',
    limit: 50,
  };
  var report_status = wait.for(utils.getReport,options_status);
  var report_queue = wait.for(utils.getQueue);
  // Start of report generation
  var when = utils.getDate(new Date());
  var permlink = conf.env.ACCOUNT_NAME() + '-status-' + when;

  var tags = {};

  var title = conf.env.ACCOUNT_NAME() + ' status report ' + when;
  var response_time = 0;
  for (var i = 0;i < report_status.length;i++) {
    response_time += utils.dateDiff(report_status[i].processed_date,report_status[i].voted_date);
  }
  var avg_response = parseFloat(response_time) / 50;
  var duration = 'The average duration for the last donations was ';
  var days = parseInt(avg_response / (60 * 60 * 24));
  var hours = parseInt(avg_response / (60 * 60));
  var minutes = parseInt(avg_response / (60));
  console.log('Days: ' + days);
  console.log('Hours: ' + hours);
  console.log('Minutes: ' + minutes);
  if (days > 0) {
    duration += days + ' day(s) ';
    hours -= days * 24;
    if (hours > 0) {
      duration += 'and ' + hours + ' hour(s) ';
      minutes -= hours * 60;
    }else {
      duration += 'and ' + minutes + ' minute(s).';
    }
  }else {
    if (hours > 0) {
      if (days === 0) {
        duration += hours + ' hour(s) ';
        minutes -= hours * 60;
      }else {
        duration += 'and ' + hours + ' hour(s) ';
        minutes -= hours * 60;
      }
    }else {
      if (hours === 0) {
        duration += minutes + ' minute(s).';
      }else {
        duration += 'and ' + minutes + ' minute(s).';
      }
    }
  }
  console.log('Duration string: ' + duration);
  var template = fs.readFileSync('./reports/status.md', 'utf8');
  var header = '';
  var queue_link = '';
  var footer = '';

  if (conf.env.ACCOUNT_NAME() === 'tuanis') {
    tags = {tags: ['helpmejoin', 'status', 'report', 'bot']};
    header = 'Hello minnows!';
    footer += fs.readFileSync('./reports/footer_tuanis.md', 'utf8');
    footer += fs.readFileSync('./reports/raserrano.md', 'utf8');
  }

  if (conf.env.ACCOUNT_NAME() === 'treeplanter') {
    tags = {tags: ['treeplanter','status','report','bot']};
    header = 'Hello treeplanters!';
    queue_link = '[Check the queue here](https://treeplanterv2.herokuapp.com/queue)';
    var manual = fs.readFileSync('./reports/treeplanter_manual.md', 'utf8');
    var data = {
      minimum: conf.env.MIN_DONATION(),
      maximum: conf.env.MAX_DONATION(),
      min_voted: (conf.env.MIN_DONATION() * conf.env.VOTE_MULTIPLIER()),
      max_voted: (conf.env.MAX_DONATION() * conf.env.VOTE_MULTIPLIER()),
    };
    footer += sprintf(manual , data);
    footer += fs.readFileSync('./reports/delegation.md', 'utf8');
    footer += fs.readFileSync('./reports/raserrano.md', 'utf8');
  }
  var body = sprintf(
    template,
    header,
    conf.env.MAX_DONATION(),
    conf.env.MIN_DONATION(),
    conf.env.VOTE_MULTIPLIER(),
    duration,
    report_queue.length,
    queue_link
  );
  body += footer;

  var today = new Date();
  if (conf.env.DAYS().includes(today.getDay().toString())) {
    utils.preparePost(
      conf.env.ACCOUNT_NAME(),
      permlink,
      title,
      body,
      tags
    );
  }
  console.log('Finish status report');
  process.exit();
});