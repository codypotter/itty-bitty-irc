module.exports = class User {
  constructor(username, hostname, realname) {
    this.username = username;
    this.hostname = hostname;
    this.realname = realname;

    console.log("User created! " + username + ' ' + hostname + ' ' + realname);
  }
};