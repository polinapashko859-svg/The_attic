'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Sketches', 'readingTime', {
      type: Sequelize.INTEGER,
      defaultValue: 2
    });
    await queryInterface.addColumn('Sketches', 'imageUrl', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Sketches', 'readingTime');
    await queryInterface.removeColumn('Sketches', 'imageUrl');
  }
};