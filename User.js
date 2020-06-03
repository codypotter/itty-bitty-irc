/**
 * @class User represents a chat user.
 */
class User {
  constructor(username, hostname, realname, socket) {
    this.username = username;
    this.hostname = hostname;
    this.realname = realname;
    this.socket = socket;
  }
}

module.exports = User;