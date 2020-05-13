const net = require('net');
const extractwords = require('extractwords');
const Room = require('./Room');
const User = require('./User');

module.exports = class Server {

  constructor(endpoint) {
    this.host = endpoint.host;
    this.port = endpoint.port;
    this.rooms = [];
    this.users = [];

    console.log('Running');
    net.createServer((sock) => {
      console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);

      sock.on('data', (data) => {
        const msg = data.toString();
        const msgType = extractwords(msg)[0]; // get first word

        switch (msgType) {
          case 'CREATE':
            break;
          case 'JOIN':
            break;
          case 'USER':
            this.createUser(extractwords(msg)[1], sock.remoteAddress +':' +  sock.remotePort, extractwords(msg)[2].slice(0) + ' ' + extractwords(msg)[3])
            break;
          case 'PRIVMSG':
            break;
          case 'NICK':
            break;
          default:
            console.log('Weird message received. Cannot parse.');
        }
      })

      sock.on('close', (data) => {
        console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
      });

    }).listen(endpoint.port, endpoint.host);
  }

  createUser(username, hostname, realname) {
    this.users.push(new User(username, hostname, realname));
  }

  createRoom(roomName) {
    this.rooms.push(new Room(roomName));
  }
};