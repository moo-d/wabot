module.exports = {
  name: "help",
  alias: ["menu", "allmenu"],
  desc: "",
  use: "",
  type: "",
  category: "main",
  example: "",
  async run({ conn, msg }, { map }) {
    const { command } = map;
    const cmds = command.keys();
    let category = [];

    for (let cmd of cmds) {
      let info = command.get(cmd);
      if (!cmd) continue;
      if (["umum"].includes(info.category.toLowerCase())) continue;
      cteg = info.category || "No Category";
      if (info.type == "changelog") continue;
      if (cteg == "hidden") continue;
      if (!cteg || cteg === "private") cteg = "owner";
      if (Object.keys(category).includes(cteg)) category[cteg].push(info);
      else {
        category[cteg] = [];
        category[cteg].push(info);
      }
    }

    let str = ``
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
    msg.reply(str)
  },
};