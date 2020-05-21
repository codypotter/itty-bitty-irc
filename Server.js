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
    this.server = net.createServer();

    this.server.on('close', () => {
      console.log('Server has closed.');
    });

    this.server.on('error', (err) => {
      console.log('Error: ' + err);
    });

    this.server.on('connection', (socket => {
      console.log('CONNECTED: ' + socket.remoteAddress + ':' + socket.remotePort);

      socket.write('ROOMDIR ' + this.rooms.map(room => room.name).join(' '));

      socket.on('close', (error) => {
        //todo: cleanup a user ending their connection (remove them from the users array and the room they were in)
        socket.end();
      });

      socket.on('error', (err) => {
        console.log('Error: ' + err.message);
      });

      socket.on('data', (data) => {
        const msg = data.toString();
        const msgType = extractwords(msg)[0];

        console.log('message received: ' + msg);

        switch (msgType) {
          case 'CREATE':
            console.log('creating a room named '+ extractwords(msg)[1]);
            this.rooms.push(new Room(extractwords(msg)[1]));
            socket.write('ROOMDIR ' + this.rooms.map(room => room.name).join(' '));
            break;
          case 'JOIN':
            console.log(extractwords(msg)[2] + ' joined a room named ' + extractwords(msg)[1]);
            this.rooms.forEach(room => {
              if (room.name === extractwords(msg)[1]) {
                room.members.push(extractwords(msg)[2]);
                socket.write('RPLTOPIC ' + room.name);
                socket.write('RPLNAMEREPLY ' + room.members.join(' '))
              }
            });
            break;
          case 'USER':
            console.log('registering a user with username ' + extractwords(msg)[1] + ' and real name ' + extractwords(msg).slice(2));
            this.users.push(new User(extractwords(msg)[1], socket.remoteAddress +':' +  socket.remotePort, extractwords(msg).slice(2), socket));
            break;
          case 'PRIVMSG':
            console.log('received a privmsg from ' + extractwords(msg)[1] + ' to room named ' + extractwords(msg)[2] + ' with text ' + extractwords(msg).slice(3));
            this.rooms.forEach((room) => {
              if (room.name === extractwords(msg)[2]) {
                console.log('emitting a message to everyone in '+  room.name);
                room.members.forEach((member) => {
                  console.log('sending a message to ' + member);
                  this.users.forEach(user => {
                    if (user.username === member) {
                      user.socket.write(msg);
                    }
                  });
                });
              }
            })
            break;
          default:
            console.log('Weird message received. Cannot parse.');
        }
      })

      socket.on('close', (data) => {
        console.log('CLOSED: ' + socket.remoteAddress + ':' + socket.remotePort);
      });
    }));

    this.server.listen(this.port, this.host);

  }

};