var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');
var sqlite3 = require('sqlite3').verbose();
var histogram = require('ascii-histogram');
net = require('net');

var clients = [];

net.createServer(function (socket) {

  // Identify this client
  socket.name = socket.remoteAddress + ":" + socket.remotePort;

  // Put this new client in the list
  clients.push(socket);
  console.log("New connection:");
  console.log(socket);

  // Handle incoming messages from clients.
  socket.on('data', function (data) {
    console.log(decoder.write(data));
  });

  // Remove the client from the list when it leaves
  socket.on('end', function () {
    console.log("end");
    var clientIndex = clients.indexOf(socket);
    if (clientIndex != -1) {
      clients.splice(clientIndex, 1);
    }
  });

  socket.on("error", function (err) {
    console.log("Caught flash policy server socket error: ");
    console.log(err.stack);
    var clientIndex = clients.indexOf(socket);
    if (clientIndex != -1) {
      clients.splice(clientIndex, 1);
    }
  });

  socket.on("close", function () {
    console.log("Caught close.");
    var clientIndex = clients.indexOf(socket);
    if (clientIndex != -1) {
      clients.splice(clientIndex, 1);
    }
  });
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
  broadcast(chunk);
});


// Slack integration
// ------------------------------------------------------------------
var request = require('request');
var RtmClient = require('@slack/client').RtmClient;
var RTM_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS.RTM;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var STATS_DATABASE = "stats.db";
var token = '<SLACK_TOKEN>';
var doorbot = '<DOOR_BOT_ID>';
var channel = '<CHANNEL_ID>';

var SlackWebClient = require('@slack/client').WebClient;
var web = new SlackWebClient(token, {});

function getUserId(userId, userInfoCb) {
  web.users.info(userId, userInfoCb);
}

var db = new sqlite3.Database(STATS_DATABASE);
db.serialize(function() {
  db.run("CREATE TABLE IF NOT EXISTS door_opens(id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, email TEXT, timestamp TEXT DEFAULT CURRENT_TIMESTAMP);");
});
var days_of_week = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

var rtm = new RtmClient(token, {logLevel: 'debug'});
rtm.start();

  rtm.on(RTM_EVENTS.MESSAGE, function (message) {
    console.log(message);
    if (message.channel == channel && message.text != null && message.text.match(doorbot) != null) {
      if (message.text.match(/open/i) != null) {
        if (clients.length > 0) {
          getUserId(message.user, function userInfoCb(err, info) {
            if (err) {
              console.log('Error:', err);
            } else {
              rtm.sendMessage('Opening the door as requested by ' + info.user.name + ' (' + info.user.profile.email + ')...', channel);
              db.run("INSERT INTO door_opens(user, email) VALUES(?, ?)", info.user.name, info.user.profile.email);
              broadcast("2500");
            }
          });
        } else {
          rtm.sendMessage('The remote door opening service is not operational at the moment. Consider dispatching a drone to pick up a human.', channel);
        }
      } else if (message.text.match(/stats/i) != null) {
        db.get("SELECT COUNT(*) as count FROM door_opens", function(err, r1) {
          if (err) {
            console.log('Error:', err);
          } else if (r1) {
            db.get("SELECT timestamp FROM door_opens ORDER BY timestamp ASC LIMIT 1", function(err, r2) {
              if (err) {
                console.log('Error:', err);
              } else if (r2) {
                var msg = 'The remote door opening service was used ' + r1.count + ' time(s) since ' + r2.timestamp + '.';
                var counts = {};
                days_of_week.forEach(function(el) { counts[el] = 0; });
                db.each("SELECT case cast(strftime('%w', timestamp) as integer)\
                         when 0 then 'Sun'\
                         when 1 then 'Mon'\
                         when 2 then 'Tue'\
                         when 3 then 'Wed'\
                         when 4 then 'Thu'\
                         when 5 then 'Fri'\
                         else 'Sat' end as dayofweek, COUNT(*) as count FROM door_opens GROUP BY dayofweek", function(err, r3) {
                           counts[r3.dayofweek] = r3.count;
                         }, function() {
                           msg += '\nBreakdown by day:';
                           msg += '\n```';
                           msg += histogram(counts, { sort: false });
                           msg += '```';
                           msg += '\nAssuming that it takes ~40 seconds to open the door and get back, around ' + Math.round((r1.count * 40)/60) + ' minutes have been saved!';
                           rtm.sendMessage(msg, channel);
                         });
              }
            });
          } else {
            rtm.sendMessage('There are no available stats for the remote door opening service', channel);
          }
        });
      }
    }
  });
