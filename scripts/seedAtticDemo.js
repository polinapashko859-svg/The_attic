require('dotenv').config();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sequelize, Sketch, User } = require('../models');

const demoUsers = [
  {
    key: 'anna',
    name: 'Анна Ветрова',
    email: 'anna.vetrova@attic.example.com',
    bio: 'Собираю старые открытки, семейные истории и запахи дождя.',
    avatarUrl: '/avatars/anna.svg'
  },
  {
    key: 'mikhail',
    name: 'Михаил Орлов',
    email: 'mikhail.orlov@attic.example.com',
    bio: 'Путешествую по маленьким станциям и отмечаю их на бумажных картах.',
    avatarUrl: '/avatars/mikhail.svg'
  },
  {
    key: 'vera',
    name: 'Вера Лунина',
    email: 'vera.lunina@attic.example.com',
    bio: 'Храню в книгах сухие цветы и истории, которые не хочется забывать.',
    avatarUrl: '/avatars/vera.svg'
  },
  {
    key: 'lidia',
    name: 'Лидия Соколова',
    email: 'lidia.sokolova@attic.example.com',
    bio: 'Записываю домашние рецепты, тихие вечера и простые радости.',
    avatarUrl: '/avatars/lidia.svg'
  }
];

const demoSketches = [
  {
    author: 'anna',
    title: 'Часы, остановившиеся в полночь',
    paperType: 'parchment',
    content: 'За стопкой атласов нашлась маленькая шкатулка с латунными часами. Стрелки замерли ровно на двенадцати, а под бархатной подкладкой лежала записка: «Заведи их, когда будешь готова услышать правду». Я не стала торопиться. Сначала вытерла пыль, потом поставила рядом свечу и долго смотрела, как в стекле отражается пламя. Иногда находка просит не ответа, а немного тишины.'
  },
  {
    author: 'anna',
    title: 'Письмо с незнакомым почерком',
    paperType: 'parchment',
    content: 'Внутри старой книги обнаружился конверт без марки. На нём было написано только имя моей бабушки, хотя почерк я никогда раньше не видела. Письмо оказалось коротким: кто-то благодарил её за лето у реки и за смелость, которой сам тогда не нашёл. Бумага пахла сухой мятой. Я положила письмо обратно между страниц — пусть у этой истории останется её собственное место.'
  },
  {
    author: 'mikhail',
    title: 'Станция за сосновым лесом',
    paperType: 'kraft',
    content: 'На старой карте станция была отмечена карандашной точкой, но поезд туда не ходил уже много лет. Мы всё равно свернули с шоссе и нашли платформу среди сосен. В расписании висела единственная строка, выцветшая от дождя: «Следующий поезд — когда перестанете ждать». Мы оставили на скамье билет без даты и пошли дальше пешком. Дорога оказалась важнее пункта назначения.'
  },
  {
    author: 'mikhail',
    title: 'Дорога к маяку',
    paperType: 'kraft',
    content: 'К маяку вела узкая тропа, отмеченная белыми камешками. После поворота море исчезло из виду, и казалось, что мы идём по суше в самую глубь облаков. У дверей смотрителя ждала жестяная кружка с тёплым чаем и записка: «Оставьте здесь то, что мешает идти налегке». Я оставил билет обратной дороги. Утром он лежал на подоконнике, сложенный корабликом.'
  },
  {
    author: 'vera',
    title: 'Фиалка между страницами',
    paperType: 'pressed-flower',
    content: 'В маминой книге рецептов нашлась фиалка, тонкая, как цветная тень. На полях её рукой было выведено: «Первый день в новом доме». Я представила маленькую кухню, коробки вместо стульев и эту веточку, которую она решила сохранить. Теперь цветок почти прозрачный, но его пять лепестков всё ещё держат форму. Я вложила рядом чистый лист — для следующей истории нашей семьи.'
  },
  {
    author: 'vera',
    title: 'Письмо, которое не отправили',
    paperType: 'pressed-flower',
    content: 'Письмо было сложено вчетверо и перевязано выцветшей лентой. В нём не было адреса, только несколько честных строк о прощении и надежде на встречу. Между листами сохранился крошечный лист клёна. Я не стала искать адресата: иногда слова уже выполнили свою работу, даже если их никто не прочитал. На обратной стороне я написала дату сегодняшнего дня и вернула письмо в коробку.'
  },
  {
    author: 'lidia',
    title: 'Запах пирога и дождя',
    paperType: 'linen',
    content: 'Когда за окном начинался дождь, бабушка доставала большую миску и просила принести яблоки. В её рецепте не было точных граммов: мука — пока тесто не станет мягким, корица — чтобы пахло домом. Я записала пропорции на полях, но всё равно каждый раз добавляю щепотку на глаз. Пирог поднимается, стекло запотевает, и на несколько минут весь мир становится очень простым.'
  },
  {
    author: 'lidia',
    title: 'Тихий вечер у окна',
    paperType: 'linen',
    content: 'Вечером я переставила кресло к окну и достала штопаное одеяло. На подоконнике остывал чай, по стеклу медленно стекали капли, а в комнате пахло сушёной липой. Я ничего не планировала и никуда не спешила. В старом блокноте появилась всего одна строка: «Сегодня мне было хорошо». Иногда этого достаточно, чтобы сохранить целый день.'
  }
];

async function seedAtticDemo() {
  await sequelize.authenticate();

  await sequelize.transaction(async (transaction) => {
    const usersByKey = new Map();

    for (const demoUser of demoUsers) {
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const [user] = await User.findOrCreate({
        where: { email: demoUser.email },
        defaults: {
          email: demoUser.email,
          passwordHash,
          name: demoUser.name,
          bio: demoUser.bio,
          avatarUrl: demoUser.avatarUrl,
          role: 'user'
        },
        transaction
      });
      usersByKey.set(demoUser.key, user);
    }

    for (const demoSketch of demoSketches) {
      const author = usersByKey.get(demoSketch.author);
      const words = demoSketch.content.trim().split(/\s+/).length;
      await Sketch.findOrCreate({
        where: { userId: author.id, title: demoSketch.title },
        defaults: {
          title: demoSketch.title,
          content: demoSketch.content,
          author: author.name,
          paperType: demoSketch.paperType,
          readingTime: Math.max(1, Math.ceil(words / 150)),
          imageUrl: null,
          userId: author.id
        },
        transaction
      });
    }
  });

  console.log(`Добавлены демонстрационные профили: ${demoUsers.length}, наброски: ${demoSketches.length}.`);
}

seedAtticDemo()
  .catch((error) => {
    console.error('Не удалось заполнить чердак демонстрационными данными:', error);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
