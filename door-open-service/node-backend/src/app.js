import fs from "fs";
import histogram from "bars";
import moment from "moment";
import _ from "underscore";

import DoorSocketServer from "./DoorSocketServer";
import DoorSlackBot from "./DoorSlackBot";
import startHttpApi from "./httpApi";
import StatsDatabase from "./StatsDatabase";

const config = JSON.parse(fs.readFileSync("config.json"));

const sockServer = new DoorSocketServer(config.socketServer);
const slackBot = new DoorSlackBot(config.slack);

slackBot.onMessageLike(/garage/i, user => {
  if (!user) {
    slackBot.postMessage("Unrecognized user.");

  } if (!sockServer.available("garage")) {
    slackBot.postMessage("The remote garage opening service is not operational at the moment. " +
        "Consider dispatching a drone to pick up a human.");

  } else {
    sockServer.broadcast("garage", "5000");
    StatsDatabase.registerGarageOpen(user);
    slackBot.postMessage(`Opening the garage as requested by ${user.name} (${user.email})...`);
  }
});

slackBot.onMessageLike(/open/i, user => {
  if (!user) {
    slackBot.postMessage("Unrecognized user.");

  } if (!sockServer.available("door")) {
    slackBot.postMessage("The remote door opening service is not operational at the moment. " +
        "Consider dispatching a drone to pick up a human.");

  } else {
    sockServer.broadcast("door", "2500");
    StatsDatabase.registerDoorOpen(user);
    slackBot.postMessage(`Opening the door as requested by ${user.name} (${user.email})...`);
  }
});

slackBot.onMessageLike(/stats/i, () => {
  StatsDatabase.getStats().then(stats => {
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
    slackBot.postMessage(msg);
  }).catch(err => {
    console.error(err);
    slackBot.postMessage(err.message);
  });
});

startHttpApi(config.httpApi, slackBot, sockServer);
