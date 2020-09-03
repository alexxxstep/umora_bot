const functions = require('firebase-functions');

const Telegraf = require('telegraf');
const { Extra, Markup, Stage, session } = Telegraf;

const axios = require('axios');
const request = require('request');
const iconv = require('iconv-lite');

let config = require('./env.json');

if (Object.keys(functions.config()).length) {
  config = functions.config();
}

const TELEGRAM_BOT_TOKEN = config.service.telegram_key;

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

async function getSourcesUmorili() {
  try {
    const url = 'http://umorili.herokuapp.com/api/sources';
    const response = await axios.get(url);
    return response.data.flat().filter((i, idx) => idx < 4 && idx !== 1);
  } catch (err) {
    console.log(err);
  }
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //Максимум не включается, минимум включается
}

function getUrl(source, site, name) {
  return `http://umorili.herokuapp.com/api/get?site=${site}&name=${name}`;
}
// http://www.umori.li/api/get?site=bash.im&name=bash&num=100
async function getJokeUmor(url) {
  try {
    const response = await axios.get(url);

    // console.log(response.data[0]);

    const randNumber = getRandomInt(0, response.data.length - 1);
    const joke = response.data.filter((i, idx) => idx === randNumber)[0]
      .elementPureHtml;

    // console.log(strip_tags(joke));
    try {
      return strip_tags(joke).replace('&quot', '').replace('&nbsp;', ' ');
    } catch (err) {
      return joke.replace('&quot', '').replace('&nbsp;', ' ');
    }
  } catch (err) {
    console.log(err);
  }
}

bot.command('start', ctx => {
  return ctx.replyWithHTML(
    'Выбор источника:',
    Markup.inlineKeyboard([
      Markup.callbackButton('umori.li', 'umori.li'),
      Markup.callbackButton('rzhunemogu', 'rzhunemogu'),
    ]).extra()
  );
});

// UMORILI
bot.action('umori.li', (ctx, next) => {
  getSourcesUmorili()
    .then(result => {
      const sources = result.map(i => Markup.callbackButton(i.site, i.site));

      sources.push(Markup.callbackButton('Назад', 'back1'));
      return ctx.reply(
        'Выбор источника:',
        Markup.inlineKeyboard(sources).extra()
      );
    })
    .catch(err => {
      console.error(err);
    });
});

bot.action('bash.im', ctx => {
  const url = getUrl('umorili', 'bash.im', 'bash');

  getJokeUmor(url)
    .then(result => {
      return ctx.reply(
        result,
        Markup.inlineKeyboard([
          Markup.callbackButton('Еще', 'bash.im'),
          Markup.callbackButton('Назад', 'umori.li'),
        ]).extra()
      );
    })
    .catch(err => {
      console.error(err);
    });
});

bot.action('zadolba.li', ctx => {
  const url = getUrl('umorili', 'zadolba.li', 'zadolbali');
  //   console.log('URL', url);
  getJokeUmor(url)
    .then(result => {
      return ctx.reply(
        result,
        Markup.inlineKeyboard([
          Markup.callbackButton('Еще', 'zadolba.li'),
          Markup.callbackButton('Назад', 'umori.li'),
        ]).extra()
      );
    })
    .catch(err => {
      console.error(err);
    });
});

bot.action('anekdot.ru', ctx => {
  const url = getUrl('umorili', 'anekdot.ru', 'new anekdot');
  //   console.log('URL', url);
  getJokeUmor(url)
    .then(result => {
      return ctx.reply(
        result,
        Markup.inlineKeyboard([
          Markup.callbackButton('Еще', 'anekdot.ru'),
          Markup.callbackButton('Назад', 'umori.li'),
        ]).extra()
      );
    })
    .catch(err => {
      console.error(err);
    });
});

bot.action('back1', ctx => {
  return ctx.reply(
    'Выбор источника:',
    Markup.inlineKeyboard([
      Markup.callbackButton('umori.li', 'umori.li'),
      Markup.callbackButton('rzhunemogu', 'rzhunemogu'),
    ]).extra()
  );
});

strip_tags = function (e) {
  var _hasTag, _tag_string;
  if (!(e === void 0 || e === null || e === '')) {
    _tag_string = e;
    if (typeof _tag_string === 'object') {
      _tag_string = _tag_string.outerHTML;
    }
    _hasTag = _tag_string.match(/(<([^>]+)>)/gi);

    if (_hasTag) {
      return trim(_tag_string.replace(/(<([^>]+)>)/gi, ''));
    } else {
      return trim(_tag_string);
    }
  } else {
    throw new Error(
      "The 'strip_tags' function expects one argument in the form of a string or object."
    );
  }
};

trim = function (e) {
  if (!(e === '' || e === null || e === void 0)) {
    return e
      .replace(/^\s+/, '')
      .replace(/\s+$/, '')
      .replace('&quot', '')
      .replace('&nbsp;', ' ');
  } else {
    throw new Error('Please specify an argument!');
  }
};

count = function (e) {
  var string, _count;
  if (!(e === '' || e === null || e === void 0)) {
    if (typeof e === 'string') {
      string = e;
      string = trim(e);
      _count = string.split(/\s+/);
      if (_count) {
        return _count.length;
      } else {
        return console.log("Couldn't count " + string);
      }
    }
  }
};

// RZHUNEMOGU
bot.action('rzhunemogu', (ctx, next) => {
  const sources = [
    Markup.callbackButton('1-Анекдот', 'anekdot'),
    Markup.callbackButton('2-Рассказы', 'rasskasy'),
    Markup.callbackButton('3-Афоризмы', 'aforismy'),
    Markup.callbackButton('4-Назад', 'back1'),
  ];

  return ctx.reply('Выбор источника:', Markup.inlineKeyboard(sources).extra());
});

bot.action('anekdot', ctx => {
  const url = 'http://rzhunemogu.ru/RandJSON.aspx?CType=1';

  request(
    {
      uri: url,
      method: 'GET',
      encoding: 'binary',
    },
    function (err, resp, body) {
      body = iconv.decode(body, 'win1251');

      const jokeObj = body.slice(11, -1).toString();

      return ctx.reply(
        jokeObj,
        Markup.inlineKeyboard([
          Markup.callbackButton('Еще', 'anekdot'),
          Markup.callbackButton('Назад', 'rzhunemogu'),
        ]).extra()
      );
    }
  );
});

bot.action('rasskasy', ctx => {
  const url = 'http://rzhunemogu.ru/RandJSON.aspx?CType=2';

  request(
    {
      uri: url,
      method: 'GET',
      encoding: 'binary',
    },
    function (err, resp, body) {
      body = iconv.decode(body, 'win1251');

      const jokeObj = body.slice(11, -1).toString();

      return ctx.reply(
        jokeObj,
        Markup.inlineKeyboard([
          Markup.callbackButton('Еще', 'rasskasy'),
          Markup.callbackButton('Назад', 'rzhunemogu'),
        ]).extra()
      );
    }
  );
});

bot.action('aforismy', ctx => {
  const url = 'http://rzhunemogu.ru/RandJSON.aspx?CType=4';

  request(
    {
      uri: url,
      method: 'GET',
      encoding: 'binary',
    },
    function (err, resp, body) {
      body = iconv.decode(body, 'win1251');

      const jokeObj = body.slice(11, -1).toString();

      return ctx.reply(
        jokeObj,
        Markup.inlineKeyboard([
          Markup.callbackButton('Еще', 'aforismy'),
          Markup.callbackButton('Назад', 'rzhunemogu'),
        ]).extra()
      );
    }
  );
});

bot.launch();
