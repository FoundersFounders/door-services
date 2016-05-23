import DoorSlackBot from "./DoorSlackBot";
import DoorSocketServer from "./DoorSocketServer";
import startHttpInterface from "./httpInterface";
import startSlackInterface from "./slackInterface";

import config from "config";

const sockServer = new DoorSocketServer(config.get("socketServer"));
const slackBot = new DoorSlackBot(config.get("slackBot"));

if (config.get("interfaces.slack.enabled"))
  startSlackInterface(config.get("interfaces.slack"), slackBot, sockServer);

if (config.get("interfaces.http.enabled"))
  startHttpInterface(config.get("interfaces.http"), slackBot, sockServer);
