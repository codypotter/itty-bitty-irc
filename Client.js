const net = require('net');
const inquirer = require('inquirer');
const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');

let ui = new inquirer.ui.BottomBar();

/** @class Client representing a client. */
class Client {
  /**
   * Creates a chat client.
   */
  constructor() {
    clear();
    this.printHeader('itty-bitty-irc');
    this.socket = new net.Socket();
    this.promptConnect();
    this.username = '';
    this.realname = '';
    this.currentRoom = '';
    this.activeRooms = [];
    this.rooms = [];
    this.handleEvents();
  }

  /**
   * Handles events received on the socket.
   */
  handleEvents() {
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
      const messagesArray = data.toString().split('\n');

      messagesArray.forEach(message => {
        if (message === '') {
          return;
        }
        const tokens = message.split(' ');
        const msgType = tokens[0]; // get first word

        switch (msgType) {
          case 'CHATMSG':
            ui.log.write(chalk.blue(tokens[1]) + ' (' + chalk.green(tokens[2]) + '): ' + tokens.slice(3).join(' '));
            break;
          case 'RPLTOPIC':
            ui.log.write(chalk.green('Welcome to ' + chalk.bgGreen.black(tokens[1]) + '!'));
            this.currentRoom = tokens[1];
            this.activeRooms = this.activeRooms.concat(tokens[1]);
            break;
          case 'RPLNAMEREPLY':
            ui.log.write(chalk.green('Current users in room: ') + tokens.slice(1).join(' '));
            ui.log.write(chalk.green('Begin typing and press ENTER to send a message. Enter /quit to quit, or use /help to see other commands.'));
            ui.log.write(chalk.greenBright('____________________________________________________________________'));
            this.promptMessaging();
            break;
          case 'USERLIST':
            ui.log.write('Current users in room: ' + tokens.slice(1).join(' '));
            this.promptMessaging();
            break;
          case 'LEAVEREPLY':
            this.promptMessaging();
            break;
          case 'ROOMDIR':
            this.rooms = this.rooms.concat(tokens.slice(1));
            break;
          default:
            ui.log.write('Cannot parse message received from server:' + message);
        }
      });
    });
  }

  /**
   * Prints a pretty header.
   * @param {string} header - The text to print.
   */
  printHeader(header) {
    ui.log.write(chalk.green(figlet.textSync(header, {
      font: 'Invita',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    })));
  }

  /**
   * Prompts the user to connect to a server.
   */
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
          this.socket.write('USER ' + answers.username + ' ' + answers.realname + '\n');
          clear();
          this.promptCreateJoinRoom();
        });
        ui.log.write(chalk.red('...Connecting...'));

      }
    );
  }

  /**
   * Prompts the user to create or join a room.
   */
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
            this.promptCreateRoom();
            break;
          case 'Join a room':
            this.promptJoinRoom();
            break;
          case 'Quit':
            this.socket.end();
            process.exitCode = 0;
        }
      }
    );
  }

  /**
   * Prompts the user get details for room creation.
   */
  promptCreateRoom() {
    inquirer.prompt([
      {
        type: 'input',
        name: 'roomName',
        message: 'What do you want to name your room?',
        default: 'roomname',
        validate: (val) => {
          if (val.match(/^\S*$/) && !this.rooms.includes(val)) {
            return true;
          } else {
            if (this.rooms.includes(val)) {
              return 'that room already exists!';
            } else {
            return 'one word, no spaces allowed';
            }
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
      this.socket.write('CREATE ' + answers.roomName + '\n');

      if (answers.roomJoin) {
        clear();
        this.socket.write('JOIN ' + answers.roomName + ' ' + this.username + '\n');
      } else {
        this.promptCreateJoinRoom()
      }
    });
  }

  /**
   * Prompts the user for details to join a room.
   */
  promptJoinRoom() {
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
        this.socket.write('JOIN ' + answers.roomName + ' ' + this.username + '\n');
      }
    });
  }

  /**
   * Handles the /join user command.
   * @param {string} param - the user-supplied parameter to the /join command
   */
  joinRoomCommand(param) {
    if (!this.rooms.includes(param)) {
      ui.log.write(chalk.red('That room doesn\'t exist!'));
      this.promptMessaging();
    } else if (this.activeRooms.includes(param)) {
      this.currentRoom = param;
      this.promptMessaging();
    } else {
      this.socket.write('JOIN ' + param + ' ' + this.username + '\n');
    }
  }

  /**
   * Prompts the user to send messages.
   */
  promptMessaging() {
    inquirer.prompt(
      {
        type: 'input',
        name: 'userInput',
        message: this.username + ' > ',
        prefix: ''
      }
    ).then((answers) => {
      const userMsg = answers.userInput.toString().trim().split(' ');
      const userMsgType = userMsg[0];
      const param = userMsg[1];
      const text = userMsg.slice(1).join(' ');

      switch(userMsgType) {
        //Lists all active rooms
        case '/active':
          ui.log.write(this.activeRooms.toString());
          setTimeout(() => {
            this.promptMessaging();
          }, 1000);
          break;

        //Sends a message to all active rooms @everyone
        case '/all':
          this.activeRooms.forEach(roomname => {
            this.socket.write('CHATMSG ' + this.username + ' ' + roomname + ' ' + text + '\n');
          });
          setTimeout(() => {
            this.promptMessaging();
          }, 1000);
          break;
        
        //Creates a room
        case '/create':
          if (this.rooms.includes(param)) {
            ui.log.write(chalk.red('That room already exists!'));
            this.promptMessaging();
          } else {
            this.socket.write('CREATE ' + param + '\n');
            this.socket.write('JOIN ' + param + ' ' + this.username + '\n');
          }
          break;
        
        //Joins selected room
        case '/join':
          this.joinRoomCommand(param);
          break;
        
        //Leaves selected room
        case '/leave':
          if (!this.rooms.includes(param)) {
            ui.log.write(chalk.red('That room doesn\'t exist!'));
            this.promptMessaging();
          } else if (!this.activeRooms.includes(param)) {
            ui.log.write(chalk.red('You aren\'t in this room!'));
            this.promptMessaging();
          } else {
            if (param === this.currentRoom) {
              ui.log.write(chalk.green('You have left ' + chalk.yellow(param) + '. Please switch to an active room or join a new room.'));
              this.currentRoom = null;
            }
            this.activeRooms = this.activeRooms.filter(room => room !== param);
            this.socket.write('LEAVE ' + param + ' ' + this.username + '\n');
          }
          break;
        
        //Lists rooms on server
        case '/list':
          ui.log.write(this.rooms.toString());
          setTimeout(() => {
            this.promptMessaging();
          }, 1000);
          break;
        
        //Quits application
        case '/quit':
          this.socket.write('CHATMSG ' + this.username + ' ' + this.currentRoom + ' USER HAS LEFT SERVER' + '\n');
          this.socket.end();
          process.exitCode = 0;
         break;
        
        //Switches currentRoom variable
        case '/switch':
          if (!this.rooms.includes(param)) {
            ui.log.write(chalk.red('That room doesn\'t exist!'));
            this.promptMessaging();
          } else if (!this.activeRooms.includes(param)) {
            this.socket.write('JOIN ' + param + ' ' + this.username + '\n');
          } else {
            this.currentRoom = param;
            this.promptMessaging();
          }
          break;
        
        //Prints out list of users in current room
        case '/users':
          this.socket.write('USERLIST ' + this.currentRoom + ' ' + this.username + '\n');
          break;
        
        //Prints out list of viable commands
        case '/help':
          this.printUserCommands();
          this.promptMessaging();
          break;

        default:
          if (this.currentRoom != null) {
            this.socket.write('CHATMSG ' + this.username + ' ' + this.currentRoom + ' ' + answers.userInput + '\n');
          }
          // wait a second before prompting for another message
          //    helps avoid spamming and keeps the UI looking nice
          setTimeout(() => {
            this.promptMessaging();
          }, 1000);
          break;
      }
    });
  }

  /**
   * Prints the available commands for the user in chat.
   */
  printUserCommands() {
    ui.log.write('Client commands: ');
    ui.log.write('/active: lists rooms you are currently in.');
    ui.log.write('/all [message]: sends a message to all rooms you are currently in.');
    ui.log.write('/create [roomname]: creates a new room.');
    ui.log.write('/join [roomname]: joins a new room.');
    ui.log.write('/leave [roomname]: leaves a room you\'re in and prompts to promptCreateRoom or join a new room.');
    ui.log.write('/list: lists all rooms on the server.');
    ui.log.write('/quit: leaves all rooms and quits the application.');
    ui.log.write('/switch [roomname]: switches your current room (room you send messages to).');
    ui.log.write('/users: lists all users in your current room.');
  }
}

module.exports = Client;
