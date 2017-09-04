import DoorBackend from "./DoorBackend";
import DoorSlackBot from "./DoorSlackBot";
import DoorSocketServer from "./DoorSocketServer";
import startHttpInterface from "./httpInterface";
import startSlackInterface from "./slackInterface";

import config from "config";

const slackBot = new DoorSlackBot(config.get("slackBot"));
const backend = new DoorBackend();

if (config.get("openers.socketServer.enabled"))
  backend.addOpener(new DoorSocketServer(config.get("openers.socketServer")));

if (config.get("interfaces.slack.enabled"))
  startSlackInterface(config.get("interfaces.slack"), slackBot, backend);

if (config.get("interfaces.http.enabled"))
  startHttpInterface(config.get("interfaces.http"), slackBot, backend);
