'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RequestLog extends Model {}

  RequestLog.init({
    method: {
      type: DataTypes.STRING,
      allowNull: false
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    requestedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'RequestLog'
  });

  return RequestLog;
};
