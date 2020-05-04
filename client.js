var net = require('net');
var inquirer = require('inquirer');

var HOST = '127.0.0.1';
var PORT = 6969;

var client = new net.Socket();

client.connect(PORT, HOST, function() {
  console.log('CONNECTED TO: ' + HOST + ':' + PORT);
  begin();
});

function begin() {

  client.on
  inquirer.prompt(
    {
    type: 'list',
    name: 'create_join',
    message: 'What would you like to do?',
    choices: ['Create a room', 'Join a room']
  }).then(function(answers) {
    switch (answers.create_join) {
      case 'Create a room':
        createRoom();
        break;
      case 'Join a room':
        joinRoom();
        break;
    }
  });
}

function createRoom() {
  inquirer.prompt(
    {
      type: 'input',
      name: 'channel_name',
      message: 'What do you want to name your channel?'
    }
    ).then(function(answers) {
      client.write('CREATE ' + answers.channel_name + '\r\n');
      client.write('JOIN ' + answers.channel_name + '\r\n');
  });
}

function joinRoom() {

}


//
// client.on('data', function(data) {
//   console.log('DATA: ' + data);
//   client.destroy();
// });
//
// client.on('close', function() {
//   console.log('Connection closed');
// });