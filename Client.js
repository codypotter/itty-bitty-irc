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
    });

    this.socket.on('data', (data) => {
      const msg = data.toString();
      const msgType = extractwords(msg)[0]; // get first word

      //console.log(chalk.bgBlue(msg));

      switch (msgType) {
        case 'PRIVMSG':
          ui.log.write(chalk.blue(extractwords(msg)[1]) + ': ' + extractwords(msg).slice(3).join(' '));
          break;
        case 'RPLTOPIC':
          ui.log.write(chalk.green('Welcome to ' + chalk.bgGreen.black(extractwords(msg)[1]) + '!'));
          this.currentRoom = extractwords(msg)[1];
          break;
        case 'RPLNAMEREPLY':
          ui.log.write(chalk.green('Current users in room: ') + extractwords(msg).slice(1).join(' '));
          ui.log.write(chalk.green('Begin typing and press ENTER to send a message. Enter /quit to quit.'));
          ui.log.write(chalk.greenBright('____________________________________________________________________'));
          this.promptMessaging();
          break;
        case 'ROOMDIR':
          this.rooms = this.rooms.concat(extractwords(msg).slice(1));
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
        choices: ['Create a room', 'Join a room']
      }).then((answers) => {
        clear();
        switch (answers.createJoinRoom) {
          case 'Create a room':
            this.createRoom();
            break;
          case 'Join a room':
            this.joinRoom();
            break;
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
      clear();
      this.socket.write('JOIN ' + answers.roomName + ' ' + this.username);
    });
  }

  promptMessaging() {
    inquirer.prompt(
      {
        type: 'input',
        name: 'privateMessage',
        message: this.username + ' > ',
        prefix: ''
      }
    ).then((answers) => {
      let exit = false;
      if (answers.privateMessage === '/quit') {
        this.socket.end();
        process.exitCode = 0;
        exit = true;
      }
      if (!exit) {
        this.socket.write('PRIVMSG ' + this.username + ' ' + this.currentRoom + ' ' + answers.privateMessage);

        // wait a second before prompting for another message
        //    helps avoid spamming and keeps the UI looking nice
        setTimeout(() => {
          this.promptMessaging();
        }, 1000);
      }
    });
  }

};
