import Boom from "boom";
import Good from "good";
import Hapi from "hapi";
import Joi from "joi";

import StatsDatabase from "./StatsDatabase";

export default function (config, bot, sockServer) {
  const server = new Hapi.Server();
  server.connection({ port: config.httpApi.port });

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
        .catch(err => { console.log(err); reply(err); });
    }
  });

  // POST /open
  server.route({
    method: "POST",
    path: "/open",
    handler: (request, reply) => {
      bot.getUserInfo(request.payload.id).then(user => {
        if (!user || request.payload.secret !== config.httpApi.secret) {
          reply(Boom.unauthorized());
          return;
        }
        sockServer.broadcast("door", "2500");
        StatsDatabase.registerDoorOpen(user);
        bot.postMessage(`Opening the door as requested by ${user.name} (${user.email})...`);
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
}
