'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Sketches', [
      {
        title: 'Утренний кофе',
        content: 'Запах свежемолотых зерен и старая книга при свечах.',
        author: 'Lydia',
        paperType: 'parchment',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Тайник на чердаке',
        content: 'Нашла деревянную шкатулку с пожелтевшими письмами.',
        author: 'Admin',
        paperType: 'kraft',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Sketches', null, {});
  }
};