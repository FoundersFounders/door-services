import SlackBot from "slackbots";
import _ from "underscore";

/**
 * A representation of the door bot in Slack. It is configured with a specific integration token and a Slack channel
 * (public or private) and provides the primitives for interacting with Slack. In particular, it provides a way to
 * add hooks for reacting to user messages, a way to post a message in the configured channel and a way to retrieve
 * information about an user.
 */
class DoorSlackBot {

  constructor(config) {
    this.bot = new SlackBot({
      token: config.botToken,
      name: config.botName
    });

    this.channelName = config.channel.name;
    this.msgCallbacks = [];

    const channelInfoPromise = config.channel.private ?
      this.bot.getGroup(config.channel.name) :
      this.bot.getChannel(config.channel.name);

    channelInfoPromise.then(channelInfo => {
      this.targetChannelId = channelInfo.id;
      this.postMessageMethod = config.channel.private ? "postMessageToGroup" : "postMessageToChannel";

      this.bot.on("message", rawData => {
        console.log("bot: " + JSON.stringify(rawData));
        if (rawData.type !== "message") return;

        const text = rawData.text;
        const channelId = rawData.channel;
        if (!text || !channelId) return;

        if (channelId === this.targetChannelId && text && text.indexOf(this.bot.self.id) !== -1) {
          const match = _.find(this.msgCallbacks, cb => text.match(cb.regex));
          if (match) {
            this.getUserInfo(rawData.user).then(user => match.callback(user, text));
          }
        }
      }).catch(err => console.error(err));
    });
  }

  onMessageLike(regex, callback) {
    this.msgCallbacks.push({ regex, callback });
  }

  postMessage(message) {
    this.bot[this.postMessageMethod](this.channelName, message, { as_user: "true" });
  }

  getUserInfo(userId) {
    return this.bot.getUsers().then(usersRaw => {
      const user = _.find(usersRaw.members, user => user.id === userId);

      if (!user) return null;
      return {
        name: user.name,
        email: user.profile ? (user.profile.email ? user.profile.email : "") : ""
      };
    });
  }
}

export default DoorSlackBot;
