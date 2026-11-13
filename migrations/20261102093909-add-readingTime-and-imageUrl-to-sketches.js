'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('Sketches');

    if (!columns.readingTime) {
      await queryInterface.addColumn('Sketches', 'readingTime', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 2
      });
    }
    if (!columns.imageUrl) {
      await queryInterface.addColumn('Sketches', 'imageUrl', {
        type: Sequelize.STRING(2048),
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('Sketches');
    if (columns.imageUrl) {
      await queryInterface.removeColumn('Sketches', 'imageUrl');
    }
    if (columns.readingTime) {
      await queryInterface.removeColumn('Sketches', 'readingTime');
    }
  }
};
