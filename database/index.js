const fs = require('fs');
const path = require('path');

class Database {
  constructor(msg, cmd) {
    // this.type = 'mongodb' || 'json'
    this.replacements = {
      ":name:": msg.pushName,
      ":botname:": this.read('setting').bot.name,
      ":command:": msg.command,
      ":cmd.category:": cmd.category.replace(/ /gi, ""),
      ":cmd.description:": cmd.desc,
      ":cmd.example:": cmd.example.replace(/%cmd/gi, msg.command)
    }
  }

  // Method to read data from a JSON file
  read(identifier) {
    var jsonData = JSON.parse(fs.readFileSync(this.getFilePath(identifier), 'utf8'));
    return this.recursiveReplace(jsonData);
  }

  // Method to save data to a JSON file
  save(identifier, data) {
    var jsonString = JSON.stringify(this.recursiveReplace(data), null, 2);
    fs.writeFileSync(this.getFilePath(identifier), jsonString, 'utf8');
  }

  // Method to get the file path based on the identifier
  getFilePath(identifier) {
    // Concatenate the data directory with the JSON file name
    if (identifier == 'setting') return './setting.json'
    else return path.join(`./database/${identifier}.json`);
  }

  // Method for recursive replacement in a JSON object
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

  // Method for multiple replacements in a string
  replaceMultiple(str, replacements) {
    for (let key in replacements) {
      const pattern = new RegExp(key, 'g');
      str = str.replace(pattern, replacements[key]);
    }
    return str;
  }
}

module.exports = Database;
