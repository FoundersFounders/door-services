var StringDecoder = require('string_decoder').StringDecoder;

var decoder = new StringDecoder('utf8');
net = require('net');

var clients = [];

net.createServer(function (socket) {

  // Identify this client
  socket.name = socket.remoteAddress + ":" + socket.remotePort

  // Put this new client in the list
  clients.push(socket);
  console.log("New connection:")
  console.log(socket)

  // Handle incoming messages from clients.
  socket.on('data', function (data) {
    console.log(decoder.write(data))
  });

  // Remove the client from the list when it leaves
  socket.on('end', function () {
    console.log("end")
    var clientIndex = clients.indexOf(socket)
    if (clientIndex != -1) {
      clients.splice(clientIndex, 1);
    }
  });

  socket.on("error", function (err) {
    console.log("Caught flash policy server socket error: ")
    console.log(err.stack)
    var clientIndex = clients.indexOf(socket)
    if (clientIndex != -1) {
      clients.splice(clientIndex, 1);
    }
  })

  socket.on("close", function () {
    console.log("Caught close.")
    var clientIndex = clients.indexOf(socket)
    if (clientIndex != -1) {
      clients.splice(clientIndex, 1);
    }
  })
}).listen(8300);

// Send a message to all clients
function broadcast(message) {
  clients.forEach(function (client) {
    // Don't want to send it to sender
    client.write(message);
  });
  // Log it to the server output too
  process.stdout.write(message)
}

process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', function (chunk) {
 broadcast(chunk)
});


// Slack integration
// ------------------------------------------------------------------
var request = require('request');
var RtmClient = require('@slack/client').RtmClient;
var RTM_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS.RTM;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var token = '<SLACK_TOKEN>';
var doorbot = '<DOOR_BOT_ID>'
var channel = '<CHANNEL_ID>'

var SlackWebClient = require('@slack/client').WebClient;
var web = new SlackWebClient(token, {});

function getUserId(userId, userInfoCb) {
  web.users.info(userId, userInfoCb);
}

var rtm = new RtmClient(token, {logLevel: 'debug'});
rtm.start();

rtm.on(RTM_CLIENT_EVENTS.RTM_CONNECTION_OPENED, function () {

  rtm.on(RTM_EVENTS.MESSAGE, function (message) {
    console.log(message)

    if (message.channel == channel && message.text != null && message.text.match(doorbot) != null && message.text.match(/open/i) != null) {

      if (clients.length > 0) {
        getUserId(message.user, function userInfoCb(err, info) {
        if (err) {
          console.log('Error:', err);
        } else {
          rtm.sendMessage('Opening the door as requested by ' + info.user.name + ' (' + info.user.profile.email + ')...', channel)
          broadcast("2500")
        }
        })
      } else {
        rtm.sendMessage('The remote door opening service is not operational at the moment. Consider dispatching a drone to pick up a human.', channel)
      }
    }
  });
});
