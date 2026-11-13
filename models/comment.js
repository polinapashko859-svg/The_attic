'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Comment extends Model {
    static associate(models) {
      Comment.belongsTo(models.Sketch, { foreignKey: 'sketchId', as: 'sketch' });
    }
  }

  Comment.init({
    author: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    text: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    sketchId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Comment'
  });

  return Comment;
};
