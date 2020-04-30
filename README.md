# itty-bitty-irc
This project is a VERY simplistic IRC-like protocol implementation.
The intention is not to fully implement the RFC, but to make something similar to an IRC protocol.

## Getting Started
### Node and npm
#### What is Node?
The simplest explanation of Node is that it allows you to write and run JavaScript on the server (your computer).

#### What is npm?
npm makes it super easy for JavaScript developers to share and reuse code. It stands for node package manager. 

#### Installation
You must install Node.js. Download and install it here. It comes with npm as well. https://nodejs.org/en/download/

npm is installed with Node.js which means when you download Node.js, you automatically get npm installed on your computer.

##### Check for installation success
```shell script
node -v
```
It should output the node version.
```shell script
npm -v
```
It should output the npm version.
##### Download this project
Clone the project if you just want to play around.
Fork the project if you intend to contribute. 

Once you have it downloaded, navigate a terminal to the project root.

```shell script
npm install
```
npm will look in the package.json file and automatically install all the dependencies for you. All the dependencies will be installed in a folder called node_modules.

If you ever need to redownload the project, node_modules won't be included in the git repository (because it can be huge). You'll just need to run `npm install` again to get everything up and running.

## Running the project
Open two terminals at the project root. One will be the server. The other will be the client. 

In terminal 1, run
```shell script
npm server
```

In terminal 2, run
```shell script
npm client
```

Blam-o, you have web sockets running and a server and client sending messages back and forth.

There is no magic happening here. If you open package.json, you'll see I defined two scripts, those are the scripts you just called. It's simply Node executing the two files. They are communicating on the same host and port.