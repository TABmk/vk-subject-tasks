module.exports = subjectProcessor;

const fs = require('fs');

/**
 * Subject Processor constructor
 *
 * @constructor
 * @param  {Object} config
 */
function subjectProcessor(config) {
  this.config = config;
  this.response = { 'error' : false, 'data': false };
}
/**
 * Get list of commands
 *
 * @param  {Function} callback
 * @return {Object}
 */
subjectProcessor.prototype.help = function (callback) {
  let res = { ...this.response };
  try {
    let text = this.config.helpHeader + '\n';
    for (let cmd in this.config.commands) {
      text += `📎 - /${this.config.commands[cmd].locale} ${this.config.commands[cmd].description}\n`;
    }
    res.data = text;
  } catch (e) {
    res.error = true;
    res.data  = e;
  } finally {
    callback(res);
  }
};

/**
 * Create storage for subject
 *
 * @param  {Function} callback
 * @param  {Array} args
 * @return {Object}
 */
subjectProcessor.prototype.add = function (callback, args) {
  let res = { ...this.response };
  let sub   = args[0];
  let count = args[1];
  try {
    if (!!sub && !!count && !isNaN(parseInt(count)) && count > 0 && count <= this.config.maxTasks) {
      if (!fs.existsSync(`${this.config.path}${sub}.json`)) {
        let tasks = {};
        for (let i = 1; i <= count; i++) {
          tasks[i] = null;
        }
        fs.writeFile(`${this.config.path}${sub}.json`, JSON.stringify(tasks), err => {
          res.error = !!err;
          res.data  = !!err ? this.config.errors.whileCreate : this.config.addedSuccessfully.replace('%sub%', sub).replace('%count%', count);
        });
      } else {
        res.error = true;
        res.data  = this.config.errors.alreadyExist;
      }
    } else {
      res.error = true;
      res.data  = this.config.errors.incorrectUsage;
    }
  } catch (e) {
    res.error = true;
    res.data  = e;
  } finally {
    setTimeout(() => callback(res), 200 );
  }
};

/**
 * Delete subject storage
 *
 * @param  {Function} callback
 * @param  {Array} args
 * @return {Object}
 */
subjectProcessor.prototype.delete = function (callback, args) {
  let sub = args[0];
  let res = { ...this.response };
  try {
    if(!!sub) {
      fs.unlink(`${this.config.path}${sub}.json`, (err) => {
        res.error = !!err;
        res.data  = !!err ? this.config.errors.whileDelete : this.config.deletedSuccessfully.replace('%sub%', sub);
      });
    } else {
      res.error = true;
      res.data  = this.config.errors.incorrectUsage;
    }
  } catch (e) {
    res.error = true;
    res.data  = e;
  } finally {
    setTimeout(() => callback(res), 200 );
  }
};

/**
 * get subjects from storage
 *
 * @param  {Function} callback
 * @return {Object}
 */
subjectProcessor.prototype.subjects = function (callback) {
  let res = { ...this.response };
  try {
    fs.readdir(this.config.path, (err, files) => {
      res.error = !!err;
      if (!err) {
        let text = this.config.subjectsList + '\n';
        files.map(x => {
          let file = require(this.config.path + x);
          let subName = x.slice(0, -5);
          text += this.config.subjectsListEntry.replace('%sub%', subName).replace('%count%', _freeInSubject(file).length);
        });
        res.data = text;
      } else {
        res.data = this.config.errors.whileRead;
      }
    });
  } catch (e) {
    res.error = true;
    res.data  = e;
  } finally {
    setTimeout(() => callback(res), 200 );
  }
};

/**
 * Get free tasks in subject
 *
 * @param  {Object} file
 * @return {(Array|Null)}
 */
const _freeInSubject = file => {
  return Object.keys(file).filter(task => {
    if (!file[task]) return task;
  });
}

/**
 * Process 'free' command and show free tasks
 *
 * @param  {Function} callback
 * @param  {Array}   args
 * @return {Object}
 */
subjectProcessor.prototype.free = function (callback, args) {
  let res = { ...this.response };
  let sub = args[0];
  let isAll = args[1];
  try {
    if (!!sub) {
      let filePath = `${this.config.path}${sub}.json`;
      if (fs.existsSync(filePath)) {
        let file = require(filePath);
        if (isAll == 'все') {
          let text = this.config.subjectsListHeader.replace('%sub%', sub) + '\n';
          Object.keys(file).filter(task => {
            text += this.config.freeAll.replace('%task%', task).replace('%user%', file[task] ? ((this.config.freeAllMode ? 'vk.com/id' : '@id') + file[task]) : this.config.freeTask);
          });
          res.data = text;
        } else {
          res.data = _freeInSubject(file).join();
        }
      } else {
        res.error = true;
        res.data  = this.config.errors.noSubject;
      }
    } else {
      res.error = true;
      res.data  = this.config.errors.incorrectUsage;
    }
  } catch (e) {
    res.error = true;
    res.data  = e;
  } finally {
    setTimeout(() => callback(res), 1000 );
  }
};

/**
 * Check if task booked
 *
 * @param  {Object}  file
 * @param  {Number}  ID
 * @return {Boolean}
 */
const _isBooked = (file, ID) => {
  return !!Object.keys(file).find(x => {
    if (typeof file[x] == 'string' && file[x] == ID) return true;
  });
};

/**
 * Process 'book' command
 *
 * @param  {Function}          callback
 * @param  {Array}             args
 * @param  {(Number|String)}   ID
 * @return {Object}
 */
subjectProcessor.prototype.book = function (callback, args, ID) {
  let res = { ...this.response };
  let sub  = args[0];
  let task = args[1];
  try {
    if (!!sub && !!task && !isNaN(parseInt(task))) {
      let filePath = `${this.config.path}${sub}.json`;
      if (fs.existsSync(filePath)) {
        let file = require(filePath);
        if (task > 0 && task <= Object.keys(file).length) {
          if (!_isBooked(file, ID)) {
            file[task] = ID;
            fs.writeFile(filePath, JSON.stringify(file), err => {
              res.error = !!err;
              res.data  = !!err ? this.config.errors.whileAdd : this.config.onBooking.replace('%sub%', sub).replace('%task%', task).replace('%user%', `@id${ID}`);
            });
          } else {
            res.error = true;
            res.data  = this.config.errors.alreadyBooked;
          }
        } else {
          res.error = true;
          res.data  = this.config.errors.incorrectTask;
        }
      } else {
        res.error = true;
        res.data  = this.config.errors.noSubject;
      }
    } else {
      res.error = true;
      res.data  = this.config.errors.incorrectUsage;
    }
  } catch (e) {
    res.error = true;
    res.data  = e;
  } finally {
    setTimeout(() => callback(res), 200 );
  }
};
