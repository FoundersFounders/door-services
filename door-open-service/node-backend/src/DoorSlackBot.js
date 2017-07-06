import { RtmClient, MemoryDataStore, CLIENT_EVENTS, RTM_EVENTS } from "@slack/client";
import _ from "underscore";

/**
 * A representation of the door bot in Slack. It is configured with a specific integration token and a Slack channel
 * (public or private) and provides the primitives for interacting with Slack. In particular, it provides a way to
 * add hooks for reacting to user messages, a way to post a message in the configured channel and a way to retrieve
 * information about an user.
 */
class DoorSlackBot {

  constructor(config) {
    this.rtm = new RtmClient(config.botToken, {
      dataStore: new MemoryDataStore(),
      autoReconnect: true
    });

    this.doorTimes=JSON.parse(JSON.stringify(config.doorTimes));
    this.msgCallbacks = [];

    this.rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, rtmStartData => {
      console.log(`Logged in as ${rtmStartData.self.name}`);
    });

    this.rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => {
      console.log("Opened RTM connection");
      this.channelInfo = this.rtm.dataStore.getChannelOrGroupByName(config.channel);
    });

    this.rtm.on(RTM_EVENTS.MESSAGE, rawData => {
      console.log(`Slack: ${JSON.stringify(rawData)}`);

      let { type, text, channel } = rawData;
      if (type !== "message" || !text || !channel) return;

      if (channel === this.channelInfo.id && text.indexOf(this.rtm.activeUserId) !== -1) {
        const match = _.find(this.msgCallbacks, cb => text.match(cb.regex));
        if (match) {
          this.getUserInfo(rawData.user).then(user => match.callback(user, text));
        }
      }
    });

    this.rtm.on(CLIENT_EVENTS.RTM.ATTEMPTING_RECONNECT, () => {
      console.log("Attempting to reconnect to Slack...");
    });

    this.rtm.on(CLIENT_EVENTS.RTM.DISCONNECT, () => {
      console.log("Permanently disconnected.");
    });

    this.rtm.start();
  }

  onMessageLike(regex, callback) {
    this.msgCallbacks.push({ regex, callback });
  }

  postMessage(message) {
    this.rtm.sendMessage(message, this.channelInfo.id);
  }

  getUserInfo(userId) {
    let user = this.rtm.dataStore.getUserById(userId);

    let summary = user && _.contains(this.channelInfo.members, userId) ?
      { name: user.name, email: user.profile.email } :
      null;

    return Promise.resolve(summary);
  }
}

export default DoorSlackBot;
