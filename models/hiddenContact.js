'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HiddenContact extends Model {}

  HiddenContact.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: { model: 'Users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    contactId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: { model: 'Users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  }, {
    sequelize,
    modelName: 'HiddenContact',
    timestamps: false
  });

  return HiddenContact;
};
