require('dotenv').config();

const self = module.exports = {
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
  setBoolean: function(attribute,value=false){
    if(attribute!==null && attribute !== undefined){
      value=JSON.parse(attribute);
    }
    return value;
  },
  setString: function(attribute, value=''){
    if(attribute!==null && attribute !== undefined){
      value=attribute;
    }
    return value;
  },
  setFloat: function(attribute,value=0){
    if(attribute!==null && attribute !== undefined && attribute.length !== 0){
      value=parseFloat(attribute);
    }
    return value;
  },
  setInt: function(attribute,value=0){
    if(attribute!==null && attribute !== undefined && attribute.length !== 0){
      value=parseInt(attribute);
    }
    return value;
  },
  env: {
    ACCOUNT_NAME: function() {
      return self.setString(process.env.ACCOUNT_NAME);
    },
    ABUSE_COUNT: function() {
      return self.setInt(process.env.ABUSE_COUNT,5);
    },
    BENEFICIARIES: function() {
      return self.setString(process.env.BENEFICIARIES);
    },
    COMMENT_ACTIVE: function() {
      return self.setBoolean(process.env.COMMENT_ACTIVE);
    },
    COMMENT_VOTE: function() {
      return self.setBoolean(process.env.COMMENT_VOTE);
    },
    COMMENT_WAIT: function() {
      return self.setInt(process.env.COMMENT_WAIT,5);
    },
    DAYS: function() {
      return self.setString(process.env.DAYS);
    },
    DEBUG: function() {
      return self.setBoolean(process.env.DEBUG);
    },
    LAST_REFUNDED: function() {
      return self.setInt(process.env.LAST_REFUNDED);
    },
    LAST_VOTED: function() {
      return self.setInt(process.env.LAST_VOTED);
    },
    MAX_DONATION: function() {
      return self.setFloat(process.env.MAX_DONATION,0.25);
    },
    MIN_DONATION: function() {
      return self.setFloat(process.env.MIN_DONATION,0.01);
    },
    MIN_VOTING_POWER: function() {
      return self.setInt(process.env.MIN_VOTING_POWER,98);
    },
    NODE: function() {
      return self.setString(process.env.NODE,'https://api.steemit.com/');
    },
    PAY_DEVELOPER: function() {
      return self.setInt(process.env.PAY_DEVELOPER,10);
    },
    POSTING_KEY_PRV: function() {
      return self.setString(process.env.POSTING_KEY_PRV);
    },
    POWERUP_POST: function() {
      return self.setBoolean(process.env.POWERUP_POST);
    },
    REFUNDS_ACTIVE: function() {
      return self.setBoolean(process.env.REFUNDS_ACTIVE);
    },
    REFUND_TEXT: function() {
      return self.setString(process.env.POSTING_KEY_PRV,'Sorry, I cannot do selfvoting anymore.');
    },
    REPORT_ACTIVE: function() {
      return self.setBoolean(process.env.REPORT_ACTIVE);
    },
    SELF_VOTE: function() {
      return self.setBoolean(process.env.SELF_VOTE);
    },
    SELF_VOTE_MULTIPLIER: function() {
      return self.setFloat(process.env.SELF_VOTE_MULTIPLIER,1.2);
    },
    SLEEPING: function() {
      return self.setBoolean(process.env.SLEEPING);
    },
    SUPPORT_ACCOUNT: function() {
      return self.setString(process.env.SUPPORT_ACCOUNT);
    },
    SUPPORT_ACCOUNT_KEY: function() {
      return self.setString(process.env.SUPPORT_ACCOUNT_KEY);
    },
    TAG: function() {
      return self.setString(process.env.TAG);
    },
    WIF: function() {
      return self.setString(process.env.WIF);
    },
    VOTING_ACCS: function() {
      return self.setString(process.env.VOTING_ACCS);
    },
    VOTE_POWER_1_PC: function() {
      return self.setInt(process.env.VOTE_POWER_1_PC,100);
    },
    VOTE_ACTIVE: function() {
      return self.setBoolean(process.env.VOTE_ACTIVE);
    },
    VOTE_MULTIPLIER: function() {
      return self.setFloat(process.env.VOTE_MULTIPLIER,2);
    },
    WEIGHT: function() {
      return self.setFloat(process.env.WEIGHT,5)*100;
    },
  },
};