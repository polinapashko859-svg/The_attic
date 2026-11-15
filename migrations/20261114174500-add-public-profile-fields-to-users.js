'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('Users', 'bio', {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
        transaction
      });
      await queryInterface.addColumn('Users', 'avatarUrl', {
        type: Sequelize.STRING,
        allowNull: true,
        transaction
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('Users', 'avatarUrl', { transaction });
      await queryInterface.removeColumn('Users', 'bio', { transaction });
    });
  }
};
