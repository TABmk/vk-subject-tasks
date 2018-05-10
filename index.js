const { Bot } = require('node-vk-bot');
const subjectProcessor = require('./subjectProcessor.js');
const CONFIG = require('./config.json');
const fs = require('fs');

const BOT = new Bot(CONFIG.bot).start();
const subject = new subjectProcessor(CONFIG);

// Check for exist main path for data storage
if (!fs.existsSync(CONFIG.path)) {
  console.log(`[ERROR] Can\'t find important path: ${CONFIG.path}`);
  process.exit(1);
}

BOT.api('users.get').then(data => {
  console.log(`[Info] Starting bot ${data[0].first_name} ${data[0].last_name} (ID:${data[0].id})...`);
});

// TODO access system
// TODO show names in 'free' command instead of ids
// TODO configure each debug message
// TODO rewrite try...catch in processor (current version is only for test)

// crutch due module bug, when event 'update' slice vk response, lol
// since that using another method to handle messages with full data
BOT.get(/(.*)/i, msg => {

  /** @type {String} to lower case all message */
  msgbody = msg.body.toLocaleLowerCase();

  /** @type {Object} commands and em locales */
  let commands = {};

  /** fill commands object */
  for(let cmd in CONFIG.commands) {
    commands[CONFIG.commands[cmd].locale] = cmd;
  }

  /** @type {String} current executed command */
  let command = msgbody.split(' ')[0].slice(1);

  /** @type {Array} command arguments */
  let args = msgbody.split(' ');

  // delete command from arguments list
  args.shift();

  if (Object.keys(commands).includes(command)) {
    subject[commands[command]](r => {
        BOT.send(r.data, msg.peer_id);
        if (r.error && CONFIG.debug) console.log(`[ERROR] Some error occured. Time: ${+new Date()}. Text: ${r.data}`);
    }, args, msg.user_id);
  }

});
