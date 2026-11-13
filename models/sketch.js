'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Sketch extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Sketch.hasMany(models.Comment, { foreignKey: 'sketchId', as: 'comments' });
    }
  }
  Sketch.init({
    title: DataTypes.STRING,
    content: DataTypes.TEXT,
    author: DataTypes.STRING,
    paperType: DataTypes.STRING,
    imageUrl: DataTypes.STRING(2048),
    readingTime: DataTypes.INTEGER,
    warmth: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    }
  }, {
    sequelize,
    modelName: 'Sketch',
  });
  return Sketch;
};