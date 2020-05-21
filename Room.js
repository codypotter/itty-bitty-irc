
module.exports = class Room {
  constructor(roomName) {
    this.name = roomName;
    this.members = [];
    this.privMessages = [];
  }
};