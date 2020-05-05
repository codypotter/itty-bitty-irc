
module.exports = class Database {
  constructor(roomName) {
    this.name = roomName;
    this.members = [];
  }
};