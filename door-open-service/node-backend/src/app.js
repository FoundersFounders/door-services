import DoorBackend from "./DoorBackend";
import DoorSlackBot from "./DoorSlackBot";
import DoorSocketServer from "./DoorSocketServer";
import RpiGpioOpener from "./RpiGpioOpener";
import startHttpInterface from "./httpInterface";
import startSlackInterface from "./slackInterface";

import config from "config";

const slackBot = new DoorSlackBot(config.get("slackBot"));
const backend = new DoorBackend(config.get("backend"));

if (config.get("openers.socketServer.enabled"))
  backend.addOpener(new DoorSocketServer(config.get("openers.socketServer")));

if (config.get("openers.rpiGpio.enabled"))
  backend.addOpener(new RpiGpioOpener(config.get("openers.rpiGpio")));

if (config.get("interfaces.slack.enabled"))
  startSlackInterface(config.get("interfaces.slack"), slackBot, backend);

if (config.get("interfaces.http.enabled"))
  startHttpInterface(config.get("interfaces.http"), slackBot, backend);
