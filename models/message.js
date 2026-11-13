'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Message extends Model {}

  Message.init({
    fromUser: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    toUser: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    messageText: {
      type: DataTypes.STRING(1000),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Message'
  });

  return Message;
};
