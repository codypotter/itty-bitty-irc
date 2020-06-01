const net = require('net');
const inquirer = require('inquirer');
const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const extractwords = require('extractwords');

let ui = new inquirer.ui.BottomBar();

module.exports = class Client {

  constructor() {
    clear();
    ui.log.write(chalk.green(figlet.textSync('itty-bitty-irc', {
      font: 'Invita',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    })));

    this.socket = new net.Socket();
    this.promptConnect();
    this.username = '';
    this.realname = '';
    this.currentRoom = '';
    this.activeRooms = [];
    this.rooms = [];

    this.socket.on('error', (err) => {
      ui.log.write('Error ' + err);
      process.exitCode = 1;
    });

    this.socket.on('end', () => {
      ui.log.write('End Received from server.');
      //this.socket.end();
      process.exitCode = 0;
    });

    this.socket.on('close', () => {
      ui.log.write('Connection is closed. Exiting...');
      process.exitCode = 0;
      process.exit(0);
    });

    this.socket.on('data', (data) => {
      const msg = data.toString();
      const msgType = extractwords(msg)[0]; // get first word

      //console.log(chalk.bgBlue(msg));

      switch (msgType) {
        case 'PRIVMSG':
          ui.log.write(chalk.blue(msg.split(' ')[1]) + ' (' + chalk.green(msg.split(' ')[2]) + '): ' + msg.split(' ').slice(3).join(' '));
          break;
        case 'RPLTOPIC':
          ui.log.write(chalk.green('Welcome to ' + chalk.bgGreen.black(msg.split(' ')[1]) + '!'));
          this.currentRoom = msg.split(' ')[1];
          break;
        case 'RPLNAMEREPLY':
          ui.log.write(chalk.green('Current users in room: ') + msg.split(' ').slice(1).join(' '));
          ui.log.write(chalk.green('Begin typing and press ENTER to send a message. Enter /quit to quit, or use /help to see other commands.'));
          ui.log.write(chalk.greenBright('____________________________________________________________________'));
          this.promptMessaging();
          break;
        case 'USERLIST':
          ui.log.write('Current users in room: ' + msg.split(' ').slice(1).join(' '));
          this.promptMessaging();
          break;
        case 'ROOMDIR':
          this.rooms = this.rooms.concat(msg.split(' ').slice(1));
          break;
        default:
          ui.log.write('Weird message received. Cannot parse.');
      }
    });
  }

  promptConnect() {
    // inquirer.ui.prompt() is an asynchronous function. The function passed to .then() is called once the
    // user inputs their answers.
    inquirer.prompt([
      {
        type: 'input',
        name: 'host',
        message: 'What HOST would you like to connect to?',
        default: '127.0.0.1'
      },
      {
        type: 'input',
        name: 'port',
        message: 'What PORT would you like to connect to?',
        default: '6969'
      },
      {
        type: 'input',
        name: 'username',
        message: 'What is your username?',
        default: 'username',
        validate: (val) => {
          if (val.match(/^\S*$/)) {
            return true;
          } else {
            return 'one word, no spaces allowed'
          }
        }
      },
      {
        type: 'input',
        name: 'realname',
        message: 'What is your real name? (first and last)',
        default: 'Jane Doe'
      }
    ]).then((answers) => {
        clear();
        this.host = answers.host;
        this.port = answers.port;

        this.socket.connect(this.port, this.host, () => {
          this.username = answers.username;
          this.realname = answers.realname;
          this.socket.write('USER ' + answers.username + ' ' + answers.realname);
          clear();
          this.promptCreateJoinRoom();
        });
        ui.log.write(chalk.red('...Connecting...'));

      }
    );
  }

  promptCreateJoinRoom() {
    inquirer.prompt(
      {
        type: 'list',
        name: 'createJoinRoom',
        message: 'What would you like to do?',
        choices: ['Create a room', 'Join a room', 'Quit']
      }).then((answers) => {
        clear();
        switch (answers.createJoinRoom) {
          case 'Create a room':
            this.createRoom();
            break;
          case 'Join a room':
            this.joinRoom();
            break;
          case 'Quit':
            this.socket.end();
            process.exitCode = 0;
        }
      }
    );
  }

  createRoom() {
    inquirer.prompt([
      {
        type: 'input',
        name: 'roomName',
        message: 'What do you want to name your room?',
        default: 'roomname',
        validate: (val) => {
          if (val.match(/^\S*$/)) {
            return true;
          } else {
            return 'one word, no spaces allowed'
          }
        }
      },
      {
        type: 'confirm',
        name: 'roomJoin',
        message: 'Do you want to join your room now?',
        default: true
      }]
    ).then((answers) => {
      clear();
      this.socket.write('CREATE ' + answers.roomName);

      if (answers.roomJoin) {
        clear();
        this.socket.write('JOIN ' + answers.roomName + ' ' + this.username);
      } else {
        this.promptCreateJoinRoom()
      }
    });
  }

  joinRoom() {
    inquirer.prompt(
      {
        type: 'list',
        name: 'roomName',
        message: 'What room do you want to join?',
        choices: this.rooms,
        default: 0
      }
    ).then((answers) => {
      if(this.activeRooms.includes(answers.roomName)) {
        ui.log.write(chalk.red("You're already in this room! Use /switch to change to this room."));
        this.promptMessaging();
      }
      else {
      this.activeRooms = this.activeRooms.concat(answers.roomName);
      this.socket.write('JOIN ' + answers.roomName + ' ' + this.username);
      }
    });
  }

  switchRoom() {
    inquirer.prompt(
      {
        type: 'list',
        name: 'roomName',
        message: 'What room do you want to switch to?',
        choices: this.activeRooms,
        default: 0
      }
    ).then((answers) => {
      this.currentRoom = answers.roomName;
    });
  }

  leaveRoom() {
    inquirer.prompt(
      {
        type: 'list',
        name: 'roomName',
        message: 'What room do you want to leave?',
        choices: this.activeRooms,
        default: 0
      }
    ).then((answers) => {
      //activeRooms.splice(activeRooms.findIndex(roomName => roomName === answers.roomName), 1);
      this.socket.write('LEAVE ' + answers.roomName + ' ' + this.username);
      this.socket.write('PRIVMSG ' + this.username + ' ' + this.currentRoom + ' USER HAS LEFT ROOM');
  });
}

  promptMessaging() {
    inquirer.prompt(
      {
        type: 'input',
        name: 'userInput',
        message: this.username + ' > ',
        prefix: ''
      }
    ).then((answers) => {
      let exit = false;
      switch(answers.userInput) {
        case '/quit':
          this.socket.write('PRIVMSG ' + this.username + ' ' + this.currentRoom + ' USER HAS LEFT SERVER');
          this.socket.end();
          process.exitCode = 0;
         break;
        case '/list':
          ui.log.write(this.rooms.toString());
          setTimeout(() => {
            this.promptMessaging();
          }, 1000);
          break;
        case '/users':
          this.socket.write('USERLIST ' + this.currentRoom + ' ' + this.username);
          break;
        /*case '/leave':
            this.leaveRoom();
            this.promptMessaging();
            break;*/
        case '/join':
          this.joinRoom();
          break;
        case '/create':
          this.createRoom();
          break;
        case '/active':
          ui.log.write(this.activeRooms.toString());
          setTimeout(() => {
            this.promptMessaging();
          }, 1000);
          break;
        case '/switch':
          this.switchRoom();
          this.promptMessaging();
          break;
        case '/help':
          ui.log.write('/quit: leaves all rooms and quits the application.');
          ui.log.write('/list: lists all rooms on the server.');
          ui.log.write('/users: lists all users in your current room.');
          ui.log.write('/join: prompts you to join a new room.');
          ui.log.write('/create: prompts you to create a new room.');
          //ui.log.write('/leave: prompts you to leave a room you\'re in.');
          ui.log.write('/active: lists rooms you are currently in.');
          ui.log.write('/switch: switches your current room (room you send messages to).');
          this.promptMessaging();
          break;
        default:
          this.socket.write('PRIVMSG ' + this.username + ' ' + this.currentRoom + ' ' + answers.userInput);

          // wait a second before prompting for another message
          //    helps avoid spamming and keeps the UI looking nice
          setTimeout(() => {
            this.promptMessaging();
          }, 1000);
          break;
      }
    });
  }

};
