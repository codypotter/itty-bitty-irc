const net = require('net');
const Room = require('./Room');
const User = require('./User');
const chalk = require('chalk');

module.exports = class Server {

  constructor(endpoint) {
    this.host = endpoint.host;
    this.port = endpoint.port;
    this.rooms = [];
    this.users = [];
    this.server = net.createServer();

    this.server.on('close', () => {
      console.log(chalk.green('Server is closing...'));
    });

    this.server.on('error', err => {
      console.log(chalk.bgRed('Server ' + err));
      let matchingUser = this.users.filter(user => user.socket === socket)
      this.rooms.forEach(room => {
        rooms.members = room.members.filter(member => member !== matchingUser.username);
      });
    });

    this.server.on('connection', (socket => {
      console.log(chalk.green('CONNECTED: ' + socket.remoteAddress + ':' + socket.remotePort));

      socket.write('ROOMDIR ' + this.rooms.map(room => room.name).join(' '));

      socket.on('end', () => {
        console.log(chalk.green('end received from client.'));

        // remove user from memory
        let user = this.users.splice(this.users.findIndex(user => user.socket === socket), 1);
        this.rooms.forEach(room => {
          room.members.splice(room.members.findIndex(member => member === user.username), 1);
        });

        // send a matching end message
        socket.end();
      });

      socket.on('error', (err) => {
        console.log(chalk.bgRed('Socket ' + err));
      });

      socket.on('data', (data) => {
        console.log(chalk.bgBlue('Message received: ' + data.toString()));
        const msg = data.toString().trim().split(' ');
        const msgType = msg[0];

        switch (msgType) {
          case 'CREATE':
            const newRoomName = msg[1];

            console.log('creating a room named', newRoomName);

            this.rooms.push(new Room(newRoomName));
            this.users.forEach((user) => {
              user.socket.write('ROOMDIR ' + newRoomName);
            });
            break;
          case 'JOIN':
            const roomToJoin = msg[1];
            const userToJoin = msg[2];

            console.log(userToJoin, 'is joining room', roomToJoin);

            this.rooms.forEach(room => {
              if (room.name === roomToJoin) {
                room.members.push(userToJoin);
                socket.write('RPLTOPIC ' + room.name);
                socket.write('RPLNAMEREPLY ' + room.members.join(' '))
              }
            });
            break;
          case 'USER':
            const newUsername = msg[1];
            const newRealName = msg.slice(2).join(' ');

            console.log('making new user with username:', newUsername, 'and real name:', newRealName);

            this.users.push(new User(newUsername, socket.remoteAddress +':' +  socket.remotePort, newRealName, socket));
            break;
          case 'PRIVMSG':
            const senderUsername = msg[1];
            const destinationRoomName = msg[2];
            const text = msg.slice(3).join(' ');

            console.log('privmsg from:', senderUsername, 'was sent to room', destinationRoomName, 'with text', text);

            this.rooms.forEach((room) => {
              if (room.name === destinationRoomName) {
                room.members.forEach((member) => {
                  this.users.forEach(user => {
                    if (user.username === member) {
                      user.socket.write(msg.join(' '));
                    }
                  });
                });
              }
            })
            break;
          case 'USERLIST':
            const roomName = msg[1];
            const userListing = msg[2];
            console.log('User ' + userListing + 'querying list from ' + roomName);

            this.rooms.forEach(room => {
              if (room.name === roomName) {
                socket.write('USERLIST ' + room.members.join(' '))
              }
            });
            break;
          /*case 'LEAVE':
            const roomToLeave = msg[1];
            const userLeaving = msg[2];
            console.log('User ' + userLeaving + 'leaving room ' + roomToLeave);
            this.rooms.forEach(room => {
              if (room.name === roomToLeave) {
                room.members.splice(room.members.findIndex(member => member === userLeaving.username), 1);
              }
            })
            break;*/
          default:
            console.log(chalk.red('Weird message received. Cannot parse.'));
        }
      })
    }));

    this.server.listen(this.port, this.host);

  }

};