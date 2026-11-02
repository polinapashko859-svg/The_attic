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
      // Описываем связь здесь!
      Sketch.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  
  Sketch.init({
    title: DataTypes.STRING,
    content: DataTypes.TEXT,
    author: DataTypes.STRING,
    paperType: DataTypes.STRING,
    readingTime: DataTypes.INTEGER,
    imageUrl: DataTypes.STRING,
    userId: DataTypes.INTEGER 
  }, {
    sequelize,
    modelName: 'Sketch',
  });
  
  return Sketch; 
};