module.exports = class User {
  constructor(username, hostname, realname, socket) {
    this.username = username;
    this.hostname = hostname;
    this.realname = realname;
    this.socket = socket;
  }
};