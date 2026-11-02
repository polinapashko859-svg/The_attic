'use strict';
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Sketches', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true, // true, чтобы старые наброски не сломались
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },
  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Sketches', 'userId');
  }
};