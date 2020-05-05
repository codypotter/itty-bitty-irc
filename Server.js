var net = require('net');
var Room = require('./Room');

module.exports = class Server {

  constructor(endpoint) {
    this.host = endpoint.host;
    this.port = endpoint.port;
    this.rooms = [];

    console.log('Running');
    net.createServer(function (sock) {
      console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);

      sock.on('data', function (data) {
        console.log('DATA ' + sock.remoteAddress + ': ' + data);
      });

      sock.on('close', function (data) {
        console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
      });

    }).listen(endpoint.port, endpoint.host);
  }

  addRoom(roomName) {
    this.rooms.push(new Room(roomName));
  }
};