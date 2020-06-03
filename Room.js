/**
 * @class Room represents a chat room.
 */
class Room {
  /**
   * Creates a new room.
   * @param {string} roomName - The name of the room to create.
   */
  constructor(roomName) {
    this.name = roomName;
    this.members = [];
  }
}

module.exports = Room;