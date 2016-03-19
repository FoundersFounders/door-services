'use strict';

const Sequelize = require('sequelize');
const _ = require('underscore');
const Promise = require('bluebird');

const STATS_DATABASE = 'stats.db'; // sqlite
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const sequelize = new Sequelize(null, null, null, {
  dialect: 'sqlite',
  storage: STATS_DATABASE
});

const DoorOpens = sequelize.define('door_opens', {
  id: {
    type: Sequelize.INTEGER,
    field: 'id',
    primaryKey: true,
    autoIncrement: true
  },
  user: {
    type: Sequelize.STRING,
    field: 'user'
  },
  email: {
    type: Sequelize.STRING,
    field: 'email'
  },
  timestamp: {
    type: Sequelize.DATE,
    field: 'timestamp',
    defaultValue: Sequelize.NOW
  }
}, {
  freezeTableName: true,
  tableName: 'door_opens',
  timestamps: false
});

DoorOpens.sync();

exports.getStats = function () {
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
      order: 'timestamp ASC',
      limit: 1,
      attributes: ['timestamp',],
    })
  };

  return Promise.props(queries)
  .then(data => {
    const counts0 = _.object(DAYS_OF_WEEK, _.map(DAYS_OF_WEEK, val => 0));
    const countsDay = _.chain(data.count_per_dayQ).indexBy('dayofweek').mapObject(day => day.count).value();
    const full = _.extendOwn(counts0, countsDay, { since: data.timestampQ ? new Date(data.timestampQ.timestamp).toISOString() : null });

    return full;
  });
};

exports.openDoor = function(userId, secret, slackBot, bellServer, channel, serverSecret) {
  if (secret != serverSecret) {
    return Promise.resolve(null);
  }

  return slackBot.getUsers().then(usersRaw => {
    const id = userId;
    const users = _.chain(usersRaw.members).indexBy('id').mapObject(user => {
      return {
        email: user.profile ? (user.profile.email ? user.profile.email : '') : '',
        name: user.name
      }
    }).value();

    if (_.has(users, id)) {
      const user = users[id];
      DoorOpens.create({
        user: user.name,
        email: user.email
      });

      bellServer.broadcast('2500');
      slackBot.postMessageToChannel(channel, 'Opening the door as requested by ' + user.name + ' (' + user.email + ')...', { as_user: 'true' });

      return user;
    } else {
      return null;
    }
  });
};
