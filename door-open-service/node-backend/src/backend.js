import Sequelize from "sequelize";
import _ from "underscore";
import Promise from "bluebird";

const STATS_DATABASE = "stats.db"; // sqlite
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const sequelize = new Sequelize(null, null, null, {
  dialect: "sqlite",
  storage: STATS_DATABASE
});

const DoorOpens = sequelize.define("door_opens", {
  id: {
    type: Sequelize.INTEGER,
    field: "id",
    primaryKey: true,
    autoIncrement: true
  },
  user: {
    type: Sequelize.STRING,
    field: "user"
  },
  email: {
    type: Sequelize.STRING,
    field: "email"
  },
  timestamp: {
    type: Sequelize.DATE,
    field: "timestamp",
    defaultValue: Sequelize.NOW
  }
}, {
  freezeTableName: true,
  tableName: "door_opens",
  timestamps: false
});

DoorOpens.sync();

function getStats() {
  const queries = {
    count_per_dayQ: sequelize.query(
      "SELECT case cast(strftime('%w', timestamp) as integer) " +
      "when 0 then 'Sun' " +
      "when 1 then 'Mon' " +
      "when 2 then 'Tue' " +
      "when 3 then 'Wed' " +
      "when 4 then 'Thu' " +
      "when 5 then 'Fri' " +
      "else 'Sat' end as dayofweek, COUNT(timestamp) as count FROM door_opens GROUP BY dayofweek", {
        type: sequelize.QueryTypes.SELECT
      }),
    timestampQ: DoorOpens.findOne({
      order: "timestamp ASC",
      limit: 1,
      attributes: ["timestamp"]
    })
  };

  return Promise.props(queries)
    .then(data => {
      const counts0 = _.object(DAYS_OF_WEEK, _.map(DAYS_OF_WEEK, () => 0));
      const countsDay = _.chain(data.count_per_dayQ).indexBy("dayofweek").mapObject(day => day.count).value();
      return _.extendOwn(counts0, countsDay, {
        since: data.timestampQ ? new Date(data.timestampQ.timestamp).toISOString() : null
      });
    });
}

function openStuff(whatStuff, user, secret, bellServer, serverSecret) {
  if (secret !== serverSecret) return false;

  DoorOpens.create({ user: user.name, email: user.email });
  bellServer.broadcast(whatStuff, "2500");
  return true;
}

function openDoor(userId, secret, slackBot, bellServer, channel, serverSecret) {
  return openStuff("door", userId, secret, slackBot, bellServer, channel, serverSecret);
}

function openGarage(userId, secret, slackBot, bellServer, channel, serverSecret) {
  return openStuff("garage", userId, secret, slackBot, bellServer, channel, serverSecret);
}

export default { openDoor, openGarage, getStats };
