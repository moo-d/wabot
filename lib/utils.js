function or() {
  for (let arg of arguments) {
    if (arg) return arg;
  }
  return arguments[arguments.length - 1];
}

function parseOptions(defaultOptions = {}, providedOptions = {}) {
  let options = {};
  let entries = Object.entries(defaultOptions);
  for (let i = 0; i < Object.keys(defaultOptions).length; i++) {
    let [key, val] = entries[i];
    options[key] = or(providedOptions[key], val);
  }
  return options;
}

module.exports = { or, parseOptions };
