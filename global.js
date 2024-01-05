const fs = require('fs');

// Function to pick a random element from an array
global.pickRandom = function(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Function to check if a string starts with a specified prefix (supports both string and regex prefixes)
global.checkPrefix = (prefix, body) => {
  if (!body) return false;

  if (typeof prefix == "string") {
    // Handling string prefix
    return {
      match: body.startsWith(prefix),
      prefix: prefix,
      body: body.replace(prefix, ""),
    }
  } else if (typeof prefix == "object") {
    // Handling array of string prefixes or regex prefixes
    if (Array.isArray(prefix)) {
      for (const value of prefix) {
        if (typeof value == "string") {
          if (body.startsWith(value))
            return {
              match: true,
              prefix: value,
              body: body.replace(value, ""),
            }
        } else if (typeof value == "object") {
          if (value instanceof RegExp) {
            if (body.match(value))
              return {
                match: true,
                prefix: value.exec(body)?.[0],
                body: body.replace(value, ""),
              }
          }
        }
      }
    } else if (prefix instanceof RegExp) {
      // Handling regex prefix
      if (body.match(prefix))
        return {
          match: true,
          prefix: prefix.exec(body)?.[0],
          body: body.replace(prefix, ""),
        }
    }
  }
  return false;
}

// Function to reload a module when changes are detected
global.reloadFile = (file, options = {}) => {
  nocache(file, () => {
    console.log(`File "${file}" has been updated!\nRestarting!`);
    process.send("reset");
  });
};

// Internal function to watch file changes and trigger a callback
function nocache(module, cb = () => {}) {
  fs.watchFile(require.resolve(module), async () => {
    await uncache(require.resolve(module));
    cb(module);
  });
}

// Internal function to remove a module from the cache
function uncache(module = ".") {
  return new Promise((resolve, reject) => {
    try {
      delete require.cache[require.resolve(module)];
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}