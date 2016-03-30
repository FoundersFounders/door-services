import histogram from "bars";
import moment from "moment";
import SlackBot from "slackbots";
import _ from "underscore";
import fs from "fs";

import backend from "./backend";
import BellServer from "./BellServer";
import startHttpApi from "./httpApi";

const config = JSON.parse(fs.readFileSync("config.json"));

const bellServer = new BellServer({
  port: config.backend.port
});

// create a bot
const bot = new SlackBot({
  token: config.slack.botToken,
  name: config.slack.botName
});

const channelInfoPromise = config.slack.channel.private ?
  bot.getGroup(config.slack.channel.name) :
  bot.getChannel(config.slack.channel.name);

channelInfoPromise.then(channelInfo => {
  const targetChannelId = channelInfo.id;
  const postMessageMethod = config.slack.channel.private ? "postMessageToGroup" : "postMessageToChannel";

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
          backend.openGarage(user, config.httpApi.secret, bot, bellServer, config.slack.channel, config.httpApi.secret);
        } else {
          bot[postMessageMethod](config.slack.channel.name,
              "The remote garage opening service is not operational at the moment. " +
              "Consider dispatching a drone to pick up a human.", { as_user: "true" });
        }
      } else if (text.match(/open/i) != null) {
        if (bellServer.available("door")) {
          backend.openDoor(user, config.httpApi.secret, bot, bellServer, config.slack.channel, config.httpApi.secret);
        } else {
          bot[postMessageMethod](config.slack.channel.name,
              "The remote door opening service is not operational at the moment. " +
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
          bot[postMessageMethod](config.slack.channel.name, msg, { as_user: "true" });
        }).catch(err => {
          console.log(err);
          bot[postMessageMethod](config.slack.channel.name, err.message, { as_user: "true" });
        });
      }
    }
  }).catch(err => console.log(err));
});

startHttpApi(config, bot, bellServer, backend);
