import Boom from "boom";
import Good from "good";
import Hapi from "hapi";
import Joi from "joi";

import StatsDatabase from "./StatsDatabase";

/**
 * Opens an HTTP server for users to make requests to the door backend.
 * @param {object} config the HTTP interface configuration
 * @param {DoorSlackBot} slackBot the Slack bot to use for logging door openings
 * @param {DoorSocketServer} sockServer the server used to broadcast messages to devices
 * @returns {undefined}
 */
export default function (config, slackBot, sockServer) {
  const server = new Hapi.Server();
  server.connection({ port: config.port });

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
      StatsDatabase.getStats()
        .then(data => reply(data))
        .catch(err => { console.error(err); reply(err); });
    }
  });

  // POST /open
  server.route({
    method: "POST",
    path: "/open",
    handler: (request, reply) => {
      slackBot.getUserInfo(request.payload.id).then(user => {
        if (!user || request.payload.secret !== config.secret) {
          reply(Boom.unauthorized());
          return;
        }
        sockServer.broadcast("door", "2500");
        StatsDatabase.registerDoorOpen(user);
        slackBot.postMessage(`Opening the door as requested by ${user.name} (${user.email})...`);
        reply(user);
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
    if (err) throw err; // something bad happened loading the plugin

    server.start((err) => {
      if (err) throw err;
      server.log("info", `Server running at: ${server.info.uri}`);
    });
  });
}
