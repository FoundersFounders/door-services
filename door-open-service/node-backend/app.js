const CHANNEL = { name: '<CHANNEL_NAME>', private: true };
const SLACK_TOKEN = '<SLACK_TOKEN>';
const BOT_NAME = '<DOOR_BOT_NAME>';
const SECRET = 'secret';
"use strict";

const Hapi = require("hapi");
const Joi = require("joi");
const Boom = require("boom");
const histogram = require("bars");
const moment = require("moment");
const Good = require("good");
const SlackBot = require("slackbots");
const _ = require("underscore");
const BellServer = require("./bellServer");
const backend = require("./backend");

const BELL_SERVER_PORT = 8300;
const API_SERVER_PORT = 3000;

const server = new Hapi.Server();
server.connection({ port: API_SERVER_PORT });

const bellServer = new BellServer({
  port: BELL_SERVER_PORT
});

// create a bot
const bot = new SlackBot({
  token: SLACK_TOKEN,
  name: BOT_NAME
});

const channelInfoPromise = CHANNEL.private ?
  bot.getGroup(CHANNEL.name) :
  bot.getChannel(CHANNEL.name);

channelInfoPromise.then(channelInfo => {
  const targetChannelId = channelInfo.id;
  const postMessageMethod = CHANNEL.private ? "postMessageToGroup" : "postMessageToChannel";

  bot.on("message", rawData => {
    console.log("bot: " + JSON.stringify(rawData));

    if (rawData.type !== "message") {
      return;
    }

    const text = rawData.text;
    const channelId = rawData.channel;
    const user = rawData.user;

    if (!text || !channelId) {
      return;
    }

    if (channelId === targetChannelId && text && text.indexOf(bot.self.id) !== -1) {
      if (text.match(/garage/i) != null) {
        if (bellServer.available("garage")) {
          backend.openGarage(user, SECRET, bot, bellServer, CHANNEL, SECRET);
        } else {
          bot[postMessageMethod](CHANNEL.name, "The remote garage opening service is not operational at the moment. " +
              "Consider dispatching a drone to pick up a human.", { as_user: "true" });
        }
      } else if (text.match(/open/i) != null) {
        if (bellServer.available("door")) {
          backend.openDoor(user, SECRET, bot, bellServer, CHANNEL, SECRET);
        } else {
          bot[postMessageMethod](CHANNEL.name, "The remote door opening service is not operational at the moment. " +
              "Consider dispatching a drone to pick up a human.", { as_user: "true" });
        }
      } else if (text.match(/stats/i) != null) {
        return backend.getStats().then(stats => {
          if (!stats) {
            throw new Error("There are no available stats for the remote door opening service");
          }

          const count = _.reduce(_.values(_.omit(stats, "since")), (m, val) => m + val, 0);
          const savedTime = Math.round(count * 40.0);
          const savedTimeStr = moment.duration(savedTime, "seconds").humanize();
          const timeStr = moment(stats.since, moment.ISO_8601).fromNow();
          const msg =
            `The remote door opening service was used ${count} time${count > 1 ? "s" : ""} since ${timeStr}.\n` +
            `Breakdown by day:\n\`\`\`${histogram(_.omit(stats, "since"), { sort: false })}\`\`\`\n` +
            `Assuming that it takes ~40 seconds to open the door and get back, around ${savedTimeStr} have been saved!`;
          bot[postMessageMethod](CHANNEL.name, msg, { as_user: "true" });
        }).catch(err => {
          console.log(err);
          bot[postMessageMethod](CHANNEL.name, err.message, { as_user: "true" });
        });
      }
    }
  }).catch(err => console.log(err));
});

// GET /ping
server.route({
  method: "GET",
  path: "/ping",
  handler: (request, reply) => {
    reply("I'm alive.");
  }
});

// GET /stats
server.route({
  method: "GET",
  path: "/stats",
  handler: (request, reply) => {
    backend.getStats()
      .then(data => reply(data))
      .catch(err => { console.log(err); reply(err); });
  }
});

// POST /open
server.route({
  method: "POST",
  path: "/open",
  handler: (request, reply) => {
    backend.openDoor(request.payload.id, request.payload.secret, bot, bellServer, CHANNEL, SECRET).then(user => {
      if (!user) {
        reply(Boom.unauthorized());
      } else {
        reply(user);
      }
    }).catch(err => { console.log(err); reply(err); });
  },
  config: {
    validate: {
      payload: {
        id: Joi.string(),
        secret: Joi.string()
      }
    }
  }
});

server.register({
  register: Good,
  options: {
    reporters: [{
      reporter: require("good-console"),
      events: {
        response: "*",
        log: "*"
      }
    }]
  }
}, err => {
  if (err) {
    throw err; // something bad happened loading the plugin
  }

  server.start((err) => {
    if (err) {
      throw err;
    }

    server.log("info", "Server running at: " + server.info.uri);
  });
});
