'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('Sketches');

    if (!columns.imageUrl) {
      await queryInterface.addColumn('Sketches', 'imageUrl', {
        type: Sequelize.STRING(2048),
        allowNull: true
      });
    } else {
      await queryInterface.changeColumn('Sketches', 'imageUrl', {
        type: Sequelize.STRING(2048),
        allowNull: true
      });
    }
    if (!columns.warmth) {
      await queryInterface.addColumn('Sketches', 'warmth', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      });
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('Sketches');
    if (columns.warmth) {
      await queryInterface.removeColumn('Sketches', 'warmth');
    }
  }
};
