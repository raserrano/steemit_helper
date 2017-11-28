module.exports = {
  database: {
    options: {
      db: { native_parser: true },
      server: { poolSize: 5 },
      replset: { rs_name: 'myReplicaSetName' },
      auth: false,
      user: 'mondo',
      pass: 'mongo',
      host: '127.0.0.1',
      port: '27017',
      database: 'steemit_helper',
    },
    conn: function(database) {
      var uri = '';
      if ((process.env.MONGODB_URI !== undefined) &&
        (process.env.MONGODB_URI !== null)) {
        uri = process.env.MONGODB_URI;
      }else {
        if (!database.auth) {
          uri = 'mongodb://' + database.host + ':' +
            database.port + '/' + database.database;
        } else {
          uri = 'mongodb://' + database.username + ':' +
            database.password + '@' + database.host + ':' +
            database.port + '/' + database.database;
        }
      }
      return uri.toString();
    },
  },
  websockets: [
    'wss://steemd.steemit.com',
    'wss://steemd.steemitdev.com',
    'wss://gtg.steem.house:8090',
    'wss://seed.bitcoiner.me',
    'wss://this.piston.rocks',
    'wss://node.steem.ws',
  ],
  env: {
    DEBUG: function() {
      var value = false;
      if ((process.env.DEBUG !== undefined) &&
        (process.env.DEBUG !== null)) {
        value = JSON.parse(process.env.DEBUG);
      }
      return value;
    },
    ACCOUNT_NAME: function() {
      var value = '';
      if ((process.env.ACCOUNT_NAME !== undefined) &&
        (process.env.ACCOUNT_NAME !== null)) {
        value = process.env.ACCOUNT_NAME;
      }
      return value;
    },
    POSTING_KEY_PRV: function() {
      var value = '';
      if ((process.env.POSTING_KEY_PRV !== undefined) &&
        (process.env.POSTING_KEY_PRV !== null)) {
        value = process.env.POSTING_KEY_PRV;
      }
      return value;
    },
    WIF: function() {
      var value = '';
      if ((process.env.WIF !== undefined) &&
        (process.env.WIF !== null)) {
        value = process.env.WIF;
      }
      return value;
    },
    VOTING_ACCS: function() {
      var value = '';
      if ((process.env.VOTING_ACCS !== undefined) &&
        (process.env.VOTING_ACCS !== null)) {
        value = process.env.VOTING_ACCS;
      }
      return value;
    },
    VOTE_POWER_1_PC: function() {
      var value = 100;
      if ((process.env.VOTE_POWER_1_PC !== undefined) &&
        (process.env.VOTE_POWER_1_PC !== null)) {
        value = parseInt(process.env.VOTE_POWER_1_PC);
      }
      return value;
    },
    MIN_VOTING_POWER: function() {
      var value = 80;
      if ((process.env.MIN_VOTING_POWER !== undefined) &&
        (process.env.MIN_VOTING_POWER !== null)) {
        value = parseInt(process.env.MIN_VOTING_POWER);
      }
      return value;
    },
    VOTE_ACTIVE: function() {
      var value = false;
      if ((process.env.VOTE_ACTIVE !== undefined) &&
        (process.env.VOTE_ACTIVE !== null)) {
        value = JSON.parse(process.env.VOTE_ACTIVE);
      }
      return value;
    },
    COMMENT_ACTIVE: function() {
      var value = false;
      if ((process.env.COMMENT_ACTIVE !== undefined) &&
        (process.env.COMMENT_ACTIVE !== null)) {
        value = JSON.parse(process.env.COMMENT_ACTIVE);
      }
      return value;
    },
    SELF_VOTE: function() {
      var value = false;
      if ((process.env.SELF_VOTE !== undefined) &&
        (process.env.SELF_VOTE !== null)) {
        value = JSON.parse(process.env.SELF_VOTE);
      }
      return value;
    },
    COMMENT_VOTE: function() {
      var value = false;
      if ((process.env.COMMENT_VOTE !== undefined) &&
        (process.env.COMMENT_VOTE !== null)) {
        value = JSON.parse(process.env.COMMENT_VOTE);
      }
      return value;
    },
    REFUND_TEXT: function() {
      var value = 'Sorry, I cannot do selfvoting anymore.';
      if ((process.env.REFUND_TEXT !== undefined) &&
        (process.env.REFUND_TEXT !== null)) {
        value = process.env.REFUND_TEXT;
      }
      return value;
    },
    REPORT_ACTIVE: function() {
      var value = false;
      if ((process.env.REPORT_ACTIVE !== undefined) &&
        (process.env.REPORT_ACTIVE !== null)) {
        value = JSON.parse(process.env.REPORT_ACTIVE);
      }
      return value;
    },
    MIN_DONATION: function() {
      var value = 0.1;
      if ((process.env.MIN_DONATION !== undefined) &&
        (process.env.MIN_DONATION !== null)) {
        value = parseFloat(process.env.MIN_DONATION);
      }
      return value;
    },
    MAX_DONATION: function() {
      var value = 0.25;
      if ((process.env.MAX_DONATION !== undefined) &&
        (process.env.MAX_DONATION !== null)) {
        value = parseFloat(process.env.MAX_DONATION);
      }
      return value;
    },
    VOTE_MULTIPLIER: function() {
      var value = 1.5;
      if ((process.env.VOTE_MULTIPLIER !== undefined) &&
        (process.env.VOTE_MULTIPLIER !== null)) {
        value = parseFloat(process.env.VOTE_MULTIPLIER);
      }
      return value;
    },
    LAST_VOTED: function() {
      var value;
      if ((process.env.LAST_VOTED !== undefined) &&
        (process.env.LAST_VOTED !== null)) {
        value = parseInt(process.env.LAST_VOTED);
      }
      return value;
    },
    LAST_REFUNDED: function() {
      var value = 0;
      if ((process.env.LAST_REFUNDED !== undefined) &&
        (process.env.LAST_REFUNDED !== null)) {
        value = parseInt(process.env.LAST_REFUNDED);
      }
      return value;
    },
    REFUNDS_ACTIVE: function() {
      var value = false;
      if ((process.env.REFUNDS_ACTIVE !== undefined) &&
        (process.env.REFUNDS_ACTIVE !== null)) {
        value = JSON.parse(process.env.REFUNDS_ACTIVE);
      }
      return value;
    },
    POWERUP_POST: function() {
      var value = false;
      if ((process.env.POWERUP_POST !== undefined) &&
        (process.env.POWERUP_POST !== null)) {
        value = JSON.parse(process.env.POWERUP_POST);
      }
      return value;
    },
    BENEFICIARIES: function() {
      var value = '';
      if ((process.env.BENEFICIARIES !== undefined) &&
        (process.env.BENEFICIARIES !== null)) {
        value = process.env.BENEFICIARIES;
      }
      return value;
    },
  },
};