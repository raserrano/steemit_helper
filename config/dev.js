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
      if (!database.auth) {
        uri = 'mongodb://' + database.host + ':' +
          database.port + '/' + database.database;
      } else {
        uri = 'mongodb://' + database.username + ':' +
          database.password + '@' + database.host + ':' +
          database.port + '/' + database.database;
      }
      return uri.toString();
    },
  },
};