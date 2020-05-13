var net = require('net');
var inquirer = require('inquirer');
var uuid = require('uuid-v4');

module.exports = class Client {

  constructor() {
    this.uuid = uuid();
    this.socket = new net.Socket();

    this.promptConnect();
  }

  promptConnect() {
    // inquirer.prompt() is an asynchronous function. The function passed to .then() is called once the
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
        default: 'username'
      },
      {
        type: 'input',
        name: 'realname',
        message: 'What is your real name? (first and last)',
        default: 'Jane Doe'
      }
    ]).then(function(answers) {
        this.host = answers.host;
        this.port = answers.port;

        this.socket.connect(this.port, this.host, function() {
          console.log('CONNECTED TO: ' + this.host + ':' + this.port);
          this.socket.write('USER ' + answers.username + ' :' + answers.realname + '\n');

        }.bind(this));

        this.promptCreateJoinRoom();

      }.bind(this)
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
    inquirer.prompt(
      {
        type: 'input',
        name: 'channelName',
        message: 'What do you want to name your channel?'
      },
      {
        type: 'confirm',
        name: 'channelJoin',
        message: 'Do you want to join your channel now?',
        default: true
      }
    ).then((answers) => {
      this.socket.write('CREATE ' + answers.channelName + '\n');

      if (answers.channelJoin) {
        this.socket.write('JOIN ' + answers.channelName + '\n');
      }

    });
  }

  joinRoom() {
    inquirer.prompt(
      {
        type: 'input',
        name: 'channelName',
        message: 'What do you want to name your channel?'
      },
      {
        type: 'confirm',
        name: 'channelJoin',
        message: 'Do you want to join your channel now?',
        default: true
      }
    ).then((answers) => {
      this.socket.write('CREATE ' + answers.channelName + '\n');

      if (answers.channelJoin) {
        this.socket.write('JOIN ' + answers.channelName + '\n');
      }

    });
  }

};

//
// client.on('data', function(data) {
//   console.log('DATA: ' + data);
//   client.destroy();
// });
//
// client.on('close', function() {
//   console.log('Connection closed');
// });