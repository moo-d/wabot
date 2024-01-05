module.exports = {
  // Command details
  name: "help",
  alias: ["menu", "allmenu"],
  desc: "",
  use: "",
  type: "",
  category: "main",
  example: "",

  // Command execution function
  async run({ msg }, { map }) {
    const { command } = map;
    const cmds = command.keys();
    let category = [];

    // Iterate through each command
    for (let cmd of cmds) {
      let info = command.get(cmd);
      // Skip invalid or hidden commands
      if (!cmd) continue;
      if (["umum"].includes(info.category.toLowerCase())) continue;
      cteg = info.category || "No Category";
      if (info.type == "changelog") continue;
      if (cteg == "hidden") continue;
      if (!cteg || cteg === "private") cteg = "owner";

      // Organize commands by category
      if (Object.keys(category).includes(cteg)) category[cteg].push(info);
      else {
        category[cteg] = [];
        category[cteg].push(info);
      }
    }

    let str = ``;

    // Iterate through each category and format the response
    const keys = Object.keys(category);
    for (const key of keys) {
      str += `◩ 【 *${key.toUpperCase()}* 】\n${
        category[key].map((cmd) => `┠❏ ${cmd.name} ${
          cmd.category == "private"
            ? ""
            : cmd.use
            ? cmd.use.replace(">", "").replace("<", "")
            : ""
        }`
      ).join("\n")}\n╰────\n\n`;
    }

    // Send the formatted help message
    msg.reply(str);
  },
};
