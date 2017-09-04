import histogram from "bars";
import moment from "moment";
import _ from "underscore";

import StatsDatabase from "./StatsDatabase";

/**
 * Sets up the Slack bot to reply to user requests destined for the door backend sent through the configured Slack
 * channel.
 * @param {object} config the Slack interface configuration
 * @param {DoorSlackBot} slackBot the Slack bot to use for interacting and logging door openings
 * @param {DoorSocketServer} backend the server used to broadcast messages to devices
 * @returns {undefined}
 */
export default function (config, slackBot, backend) {

  slackBot.onMessageLike(/garage/i, user => {
    if (!user) {
      slackBot.postMessage("Unrecognized user.");

    } else if (!backend.canOpen("garage")) {
      slackBot.postMessage("The remote garage opening service is not operational at the moment. " +
          "Consider dispatching a drone to pick up a human.");

    } else {

      let door = slackBot.doorTimes["garage"];
      if (door && door.lockTime > 0 && door.lastUser !== user.email) {
        let withinTimeLock = (new Date().getTime() - door.lastTime) < door.lockTime;
        if (withinTimeLock) {
          slackBot.postMessage(`Opening the garage denied by a pending lock of ${door.lastUser}!`);
          return;
        }
        door.lastUser = user.email;
        door.lastTime = new Date().getTime(); // update lock data for this door name
      }
      backend.open("garage", 5000);
      StatsDatabase.registerGarageOpen(user);
      slackBot.postMessage(`Opening the garage as requested by ${user.name} (${user.email})...`);
    }
  });

  slackBot.onMessageLike(/open/i, user => {
    if (!user) {
      slackBot.postMessage("Unrecognized user.");

    } else if (!backend.canOpen("door")) {
      slackBot.postMessage("The remote door opening service is not operational at the moment. " +
          "Consider dispatching a drone to pick up a human.");

    } else {
      backend.open("door", 2500);
      StatsDatabase.registerDoorOpen(user);
      slackBot.postMessage(`Opening the door as requested by ${user.name} (${user.email})...`);
    }
  });

  slackBot.onMessageLike(/stats/i, () => {
    StatsDatabase.getStats().then(stats => {
      if (!stats) {
        throw new Error("There are no available stats for the remote door opening service");
      }

      const produceMsg = (name, stats, includeSaveTime) => {
        const count = _.chain(stats).omit("since").values().reduce((m, val) => m + val, 0).value();
        const savedTime = Math.round(count * 40.0);
        const savedTimeStr = moment.duration(savedTime, "seconds").humanize();
        const timeStr = moment(stats.since, moment.ISO_8601).fromNow();
        let msg = `The remote *${name}* opening service was used ` +
                  `${count} time${count > 1 ? "s" : ""} since ${timeStr}.\n` +
                  `Breakdown by day:\n\`\`\`${histogram(_.omit(stats, "since"), { sort: false })}\`\`\`\n`;
        if (includeSaveTime)
          msg += `Assuming that it takes ~40 seconds to open the ${name} and get back, ` +
                 `around ${savedTimeStr} have been saved!`;
        return msg;
      };

      const msg = produceMsg("door", stats["door"], true) + "\n\n\n" + produceMsg("garage", stats["garage"], false);
      slackBot.postMessage(msg);
    }).catch(err => {
      console.error(err);
      slackBot.postMessage(err.message);
    });
  });
}
