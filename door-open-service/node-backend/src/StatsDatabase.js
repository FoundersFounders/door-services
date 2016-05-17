import Promise from "bluebird";
import Sequelize from "sequelize";
import _ from "underscore";

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
  },
  type: {
    type: Sequelize.STRING,
    field: "type"
  }
}, {
  freezeTableName: true,
  tableName: "door_opens",
  timestamps: false
});

DoorOpens.sync();

/**
 * An entrypoint for querying and updating the door opening stats database.
 */
// TODO: convert static to instance methods and parameterize StatsDatabase instances with DB file and options
class StatsDatabase {

  static registerDoorOpen({ name, email }) {
    DoorOpens.create({ user: name, email: email, type: "door" });
  }

  static registerGarageOpen({ name, email }) {
    DoorOpens.create({ user: name, email: email, type: "garage" });
  }

  static getStats() {
    const queries = type => {
      return {
        count_per_dayQ: sequelize.query(
          "SELECT case cast(strftime('%w', timestamp) as integer) " +
            "when 0 then 'Sun' " +
            "when 1 then 'Mon' " +
            "when 2 then 'Tue' " +
            "when 3 then 'Wed' " +
            "when 4 then 'Thu' " +
            "when 5 then 'Fri' " +
            "else 'Sat' end as dayofweek, COUNT(timestamp) as count FROM door_opens " +
            `WHERE type = '${type}' GROUP BY dayofweek`, {
              type: sequelize.QueryTypes.SELECT
            }),
        timestampQ: DoorOpens.findOne({
          order: "timestamp ASC",
          where: { type },
          limit: 1,
          attributes: ["timestamp"]
        })
      };
    };

    const types = ["door", "garage"];

    return Promise.all(types.map(t => Promise.props(queries(t)))).then(data => {
      return _.map(data, val => {
        const counts0 = _.object(DAYS_OF_WEEK, _.map(DAYS_OF_WEEK, () => 0));
        const countsDay = _.chain(val.count_per_dayQ).indexBy("dayofweek").mapObject(day => day.count).value();
        return _.extendOwn(counts0, countsDay, {
          since: val.timestampQ ? new Date(val.timestampQ.timestamp).toISOString() : null
        });
      });
    }).then(res => _.object(types, res));
  }
}

export default StatsDatabase;
