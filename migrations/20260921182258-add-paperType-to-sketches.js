'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Sketches', 'paperType', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'parchment'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Sketches', 'paperType');
  }
};