import { StringDecoder } from "string_decoder";
import net from "net";
import _ from "underscore";

const decoder = new StringDecoder("utf8");

/**
 * A server for door opening IoT devices to communicate with this backend. Communication is done via simple sockets.
 * Devices can opt to register in this server with a specific "group" string that identifies which door they handle.
 */
class DoorSocketServer {

  constructor(config) {
    this.port = config.port;
    this.clients = {};
    this.createServer();
  }

  available(group) {
    return _.find(this.clients, socketInfo => socketInfo.group === group);
  }

  createServer() {
    return net.createServer(socket => {

      // Identify this client
      socket.name = socket.remoteAddress + ":" + socket.remotePort;

      // Put this new client in the list
      this.clients[socket.name] = { socket: socket, group: "door" };
      console.log(`New connection: ${socket.name}`);

      // Handle incoming messages from clients.
      socket.on("data", data => {
        const message = decoder.write(data);
        if (message.startsWith("G|")) {
          const group = message.substr("G|".length);
          this.clients[socket.name].group = group;
          console.log(`${socket.name} now belongs to group '${group}'`);
        } else {
          console.log(`Message from ${socket.name}: ${message}`);
        }
      });

      // Remove the client from the list when it leaves
      socket.on("end", () => {
        console.log(`Connection ended: ${socket.name}`);
        delete this.clients[socket.name];
      });

      socket.on("error", err => {
        console.error(`Connection error: ${socket.name}`);
        console.error(err.stack);
        delete this.clients[socket.name];
      });

      socket.on("close", () => {
        console.log(`Connection closed: ${socket.name}`);
        delete this.clients[socket.name];
      });
    }).listen(this.port);
  }

  broadcast(group, message) {
    _.each(this.clients, ({ group: socketGroup, socket }) => {
      if (socketGroup === group) socket.write(message);
    });

    // Log it to the server output too
    console.log(`Broadcast to ${group}: ${message}`);
  }
}

export default DoorSocketServer;
