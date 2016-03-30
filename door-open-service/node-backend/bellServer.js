'use strict';

const StringDecoder = require('string_decoder').StringDecoder;
const decoder = new StringDecoder('utf8');
const net = require('net');

function BellServer(params) {
  this.port = params.port;
  this.clients = [];
  
  this.createServer();
}

BellServer.prototype.available = function() {
  return this.clients.size != 0;
}

BellServer.prototype.createServer = function() {
  return net.createServer(socket => {

    // Identify this client
    socket.name = socket.remoteAddress + ':' + socket.remotePort;

    // Put this new client in the list
    this.clients.push(socket);
    console.log('New connection:');
    console.log(socket);

    // Handle incoming messages from clients.
    socket.on('data', data => {
      console.log(decoder.write(data));
    });

    // Remove the client from the list when it leaves
    socket.on('end', () => {
      console.log('end');
      const clientIndex = this.clients.indexOf(socket);
      if (clientIndex != -1) {
        this.clients.splice(clientIndex, 1);
      }
    });

    socket.on('error', (err) => {
      console.log('Caught flash policy server socket error: ');
      console.log(err.stack);
      const clientIndex = this.clients.indexOf(socket);
      if (clientIndex != -1) {
        this.clients.splice(clientIndex, 1);
      }
    });

    socket.on('close', () => {
      console.log('Caught close.');
      const clientIndex = this.clients.indexOf(socket);
      if (clientIndex != -1) {
        this.clients.splice(clientIndex, 1);
      }
    });
  }).listen(this.port);
};

// Send a message to all clients
BellServer.prototype.broadcast = function(message) {
  this.clients.forEach(client => client.write(message)); // Don't want to send it to sender
  // Log it to the server output too
  process.stdout.write(message);
};

module.exports = BellServer;
