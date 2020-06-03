const net = require('net');
const Room = require('./Room');
const User = require('./User');
const chalk = require('chalk');
const inquirer = require('inquirer');

let ui = new inquirer.ui.BottomBar();

module.exports = class Server {

  constructor(endpoint) {
    this.host = endpoint.host;
    this.port = endpoint.port;
    this.rooms = [];
    this.users = [];
    this.server = net.createServer();
    //it's good practice for the server to have a default chat room
    this.rooms.push(new Room('General'));

    this.server.on('close', () => {
      ui.log.write(chalk.green('Server is closing...'));
    });

    this.server.on('error', err => {
      ui.log.write(chalk.bgRed('Server ' + err));
      let matchingUser = this.users.filter(user => user.socket === socket)
      this.rooms.forEach(room => {
        room.members = room.members.filter(member => member !== matchingUser.username);
      });
    });

    this.server.on('connection', (socket => {
      ui.log.write(chalk.green('CONNECTED: ' + socket.remoteAddress + ':' + socket.remotePort));

      socket.write('ROOMDIR ' + this.rooms.map(room => room.name).join(' ') + '\n');

      socket.on('end', () => {
        ui.log.write(chalk.green('end received from client.'));

        // remove user from memory
        let user = this.users.splice(this.users.findIndex(user => user.socket === socket), 1);
        this.rooms.forEach(room => {
          room.members.splice(room.members.findIndex(member => member === user.username), 1);
        });

        // send a matching end message
        socket.end();
      });

      socket.on('error', (err) => {
        ui.log.write(chalk.bgRed('Socket ' + err));
        let user = this.users.splice(this.users.findIndex(user => user.socket === socket), 1);
        this.rooms.forEach(room => {
          room.members.splice(room.members.findIndex(member => member === user.username), 1);
        });
      });

      socket.on('data', (data) => {
        ui.log.write(chalk.bgBlue('Message received: ' + data.toString()));

        const messagesArray = data.toString().split('\n');

        messagesArray.forEach(message => {
          // messages split on newlines will sometimes send empty messages
          if (message === '') { return; }

          // separate the message into array of words for easier parsing
          const tokens = message.split(' ');

          // first word is the message type
          const msgType = tokens[0];

          switch (msgType) {
            case 'CREATE':
              const newRoomName = tokens[1];

              ui.log.write('creating a room named', newRoomName);

              this.rooms.push(new Room(newRoomName));
              this.users.forEach((user) => {
                user.socket.write('ROOMDIR ' + newRoomName + '\n');
              });
              break;
            case 'JOIN':
              const roomToJoin = tokens[1];
              const userToJoin = tokens[2];

              ui.log.write(userToJoin, 'is joining room', roomToJoin);

              this.rooms.forEach(room => {
                if (room.name === roomToJoin) {
                  room.members.push(userToJoin);
                  socket.write('RPLTOPIC ' + room.name + '\n');
                  socket.write('RPLNAMEREPLY ' + room.members.join(' ') + '\n');
                }
              });
              break;
            case 'USER':
              const newUsername = tokens[1];
              const newRealName = tokens.slice(2).join(' ');

              ui.log.write('making new user with username: '+ newUsername + ' and real name: ' + newRealName);

              this.users.push(new User(newUsername, socket.remoteAddress +':' +  socket.remotePort, newRealName, socket));
              break;
            case 'CHATMSG':
              const senderUsername = tokens[1];
              const destinationRoomName = tokens[2];
              const text = tokens.slice(3).join(' ');

              ui.log.write('chatmsg from: ' + senderUsername + ' was sent to room ' + destinationRoomName + ' with text: ' + text);

              this.rooms.forEach((room) => {
                if (room.name === destinationRoomName) {
                  room.members.forEach((member) => {
                    this.users.forEach(user => {
                      if (user.username === member) {
                        user.socket.write(tokens.join(' ') + '\n');
                      }
                    });
                  });
                }
              });
              break;
            case 'USERLIST':
              const roomName = tokens[1];
              const userListing = tokens[2];
              ui.log.write('User ' + userListing + 'querying list from ' + roomName);

              this.rooms.forEach(room => {
                if (room.name === roomName) {
                  socket.write('USERLIST ' + room.members.join(' ') + '\n')
                }
              });
              break;
            case 'LEAVE':
              const roomToLeave = tokens[1];
              const userLeaving = tokens[2];
              console.log('User ' + userLeaving + ' leaving room ' + roomToLeave);
              this.rooms.forEach(room => {
                if (room.name === roomToLeave) {
                  room.members = room.members.filter(member => member !== userLeaving);
                }
              });
              socket.write('LEAVEREPLY' + '\n');
              break;
            default:
              ui.log.write(chalk.red('Weird message received. Cannot parse.'));
          }
        });
      });
    }));

    this.server.listen(this.port, this.host);

    this.adminPrompt();
  }

  adminPrompt() {
    // inquirer.ui.prompt() is an asynchronous function. The function passed to .then() is called once the
    // user inputs their answers.
    inquirer.prompt([
      {
        type: 'input',
        name: 'command',
        message: ' > ',
        prefix: ''
      }
    ]).then((input) => {
        const command = input.command.trim().split(' ');
        switch (command[0]) {
          case '/kickall':
            this.users.forEach(user => {
              user.socket.write('CHATMSG ' + user.username + ' ' + '!!! You have been kicked by the server.' + '\n');
              user.socket.destroy();
            });
            this.users = [];
            this.rooms.forEach(room => {
              room.members = [];
            })
            break;
          case '/kick':
            const usernameToKick = command[1];
            if (usernameToKick) {
              const userToKick = this.users.find(user => user.username === usernameToKick);
              userToKick.socket.write('CHATMSG ' + usernameToKick + ' ' + '!!! You have been kicked by the server.' + '\n');
              userToKick.socket.destroy();
              // remove user from the room
              this.rooms.forEach(room => {
                room.members = room.members.filter(member => member !== usernameToKick);
              });

              // remove user from the users array
              this.users = this.users.filter(user => user.username !== usernameToKick);

            } else {
              ui.log.write(`usage: /kick <username>`)
            }
            break;
          case '/kill':
            this.users.forEach(user => {
              user.socket.write('CHATMSG ' + user.username + ' ' + '!!! You have been kicked by the server.' + '\n');
              user.socket.destroy();
            });
            this.users = [];
            this.rooms.forEach(room => {
              room.members = [];
            })
            process.exitCode = 0;
            process.exit(0);
            break;
          case '/listrooms':
            this.rooms.forEach(room => {
              ui.log.write(room.name + ' containing users:');
              room.members.forEach(member => {
                ui.log.write('\t' + member);
              })
            })
            break;
          case '/listusers':
            this.users.forEach(user => {
              ui.log.write(user.username);
            })
            break;
          case '/help':
            ui.log.write('Command options:');
            ui.log.write('/kickall -> kicks all connected users');
            ui.log.write('/kick [username] -> kicks the given user by username');
            ui.log.write('/kill -> kills server process');
            ui.log.write('/listrooms -> outputs all the room names');
            ui.log.write('/listusers -> outputs all the usernames');
            break;
          default:
            ui.log.write('usage: /[command] or "/help" for help')
            break;
        }
        this.adminPrompt();
      }

    );
  }

};