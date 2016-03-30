import fs from "fs";

import DoorSlackBot from "./DoorSlackBot";
import DoorSocketServer from "./DoorSocketServer";
import startHttpInterface from "./httpInterface";
import startSlackInterface from "./slackInterface";

const config = JSON.parse(fs.readFileSync("config.json"));

const sockServer = new DoorSocketServer(config.socketServer);
const slackBot = new DoorSlackBot(config.slackBot);

if (config.interfaces.slack.enabled)
  startSlackInterface(config.interfaces.slack, slackBot, sockServer);

if (config.interfaces.http.enabled)
  startHttpInterface(config.interfaces.http, slackBot, sockServer);
