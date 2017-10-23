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
      if((process.env.MONGODB_URI !== undefined)
        && (process.env.MONGODB_URI !== null)){
        uri = process.env.MONGODB_URI;
      }else{
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
  websockets:[
    "wss://steemd.steemit.com",
    "wss://steemd.steemitdev.com",
    "wss://gtg.steem.house:8090",
    "wss://seed.bitcoiner.me",
    "wss://this.piston.rocks",
    "wss://node.steem.ws"
  ],
  env:{
    DEBUG: function(){
      var value = false;
      if((process.env.DEBUG !== undefined)
        &&(process.env.DEBUG !== null)){
        value = JSON.parse(process.env.DEBUG);
      }
      return value;
    },
    ACCOUNT_NAME: function(){
      var value = "";
      if((process.env.ACCOUNT_NAME !== undefined)
        &&(process.env.ACCOUNT_NAME !== null)){
        value = process.env.ACCOUNT_NAME;
      }
      return value;
    },
    POSTING_KEY_PRV: function(){
      var value = "";
      if((process.env.POSTING_KEY_PRV !== undefined)
        &&(process.env.POSTING_KEY_PRV !== null)){
        value = process.env.POSTING_KEY_PRV;
      }
      return value;
    },
    VOTING_ACCS: function(){
      var value = "";
      if((process.env.VOTING_ACCS !== undefined)
        &&(process.env.VOTING_ACCS !== null)){
        value = process.env.VOTING_ACCS;
      }
      return value;
    },
    VOTE_POWER_1_PC: function(){
      var value = 100;
      if((process.env.VOTE_POWER_1_PC !== undefined)
        &&(process.env.VOTE_POWER_1_PC !== null)){
        value = process.env.VOTE_POWER_1_PC;
      }
      return value;
    },
    MIN_VOTING_POWER: function(){
      var value = 70;
      if((process.env.MIN_VOTING_POWER !== undefined)
        &&(process.env.MIN_VOTING_POWER !== null)){
        value = process.env.MIN_VOTING_POWER;
      }
      return value;
    },
    VOTE_ACTIVE: function(){
      var value = false;
      if((process.env.VOTE_ACTIVE !== undefined)
        &&(process.env.VOTE_ACTIVE !== null)){
        value = process.env.VOTE_ACTIVE;
      }
      return value;
    },
    COMMENT_ACTIVE: function(){
      var value = false;
      if((process.env.COMMENT_ACTIVE !== undefined)
        &&(process.env.COMMENT_ACTIVE !== null)){
        value = process.env.COMMENT_ACTIVE;
      }
      return value;
    },
    REPORT_ACTIVE: function(){
      var value = false;
      if((process.env.REPORT_ACTIVE !== undefined)
        &&(process.env.REPORT_ACTIVE !== null)){
        value = process.env.REPORT_ACTIVE;
      }
      return value;
    },
    MIN_DONATION: function(){
      var value = 0.1;
      if((process.env.MIN_DONATION !== undefined)
        &&(process.env.MIN_DONATION !== null)){
        value = process.env.MIN_DONATION;
      }
      return value;
    },
    MAX_DONATION: function(){
      var value = 0.25;
      if((process.env.MAX_DONATION !== undefined)
        &&(process.env.MAX_DONATION !== null)){
        value = process.env.MAX_DONATION;
      }
      return value;
    },
  }
};