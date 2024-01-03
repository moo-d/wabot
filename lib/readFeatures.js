require('../global')

const { delay } = require('@whiskeysockets/baileys')
const fs = require('fs')
const path = require('path')
const { parseOptions } = require('./utils')

async function readFeatures(attr) {
  try {
    const pathDir = path.join(__dirname, "../command")
    const features = fs.readdirSync(pathDir)

    console.log("Loading... Please wait while the system checks the commands.")

    for (const feature of features) {
      const commands = fs.readdirSync(`${pathDir}/${feature}`).filter((file) => file.endsWith(".js"))

      for (const file of commands) {
        const command = require(`${pathDir}/${feature}/${file}`)

        if (typeof command.run !== "function") continue

        const defaultCmdOptions = {
          name: "command",
          alias: [""],
          desc: "",
          use: "",
          example: "",
          url: "",
          category: typeof command.category === "undefined" ? "" : feature.toLowerCase(),
          wait: false,
          isOwner: false,
          isAdmin: false,
          isQuoted: false,
          isGroup: false,
          isBotAdmin: false,
          isQuery: false,
          isPrivate: false,
          isUrl: false,
          run: () => {},
        }

        const cmdOptions = parseOptions(defaultCmdOptions, command)

        const options = Object.fromEntries(
          Object.entries(cmdOptions)
            .filter(([k, v]) => typeof v === "boolean" || k === "query" || k === "isMedia")
        )

        const cmdObject = {
          name: cmdOptions.name,
          alias: cmdOptions.alias,
          desc: cmdOptions.desc,
          use: cmdOptions.use,
          type: cmdOptions.type,
          example: cmdOptions.example,
          url: cmdOptions.url,
          category: cmdOptions.category,
          options,
          run: cmdOptions.run,
        }

        attr.command.set(cmdOptions.name, cmdObject)
        await delay(2000)
        global.reloadFile(`./command/${feature}/${file}`)
      }
    }

    console.log("Loading... Command loaded successfully.")
  } catch (error) {
    console.error("Error: ", error)
  }
}

module.exports = readFeatures