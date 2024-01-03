const fs = require('fs')

class Database {
  constructor(msg, cmd) {
    // this.type = 'mongodb' || 'json'
    this.replacements = {
      ":name:": msg.pushName,
      ":botname:": this.read('./setting.json').bot.name,
      ":command:": msg.command,
      ":cmd.category:": cmd.category.replace(/ /gi, ""),
      ":cmd.description:": cmd.desc,
      ":cmd.example:": cmd.example.replace(/%cmd/gi, msg.command)
    }
  }
  read(file) {
    var jsonData = JSON.parse(fs.readFileSync(file, 'utf8'))
    return this.recursiveReplace(jsonData)
  }
  save(file, data) {
    var jsonString = JSON.stringify(this.recursiveReplace(data), null, 2);
    return fs.writeFileSync(file, jsonString, 'utf8');
  }
  recursiveReplace(obj) {
    for (let prop in obj) {
      if (obj[prop] instanceof Object) {
        // Recursively call recursiveReplace for nested objects
        obj[prop] = this.recursiveReplace(obj[prop]);
      } else if (typeof obj[prop] === 'string') {
        // Perform the replacement in string values
        obj[prop] = this.replaceMultiple(obj[prop], this.replacements);
      }
    }
    return obj;
  }

  replaceMultiple(str, replacements) {
    for (let key in replacements) {
      const pattern = new RegExp(key, 'g');
      str = str.replace(pattern, replacements[key]);
    }
    return str;
  }
}

module.exports = Database