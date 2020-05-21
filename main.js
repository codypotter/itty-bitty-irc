const { program } = require('commander');


program
  .command('server [host] [port]')
  .description('run the program in server mode with optional host and port')
  .action((host, port) => {
    if (typeof(host)==='undefined') host = '127.0.0.1';
    if (typeof(port)==='undefined') port = 6969;
    const Server = require('./Server');
    let server = new Server({
      host: host,
      port: port
    });
  });

program
  .command('client')
  .description('run the program in client mode to chat with friends')
  .action(() => {
    const Client = require('./Client');
    let client = new Client();
  })


program.parse(process.argv);

