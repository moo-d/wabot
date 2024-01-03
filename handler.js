require('./global')

const { default: Baileys, delay } = require("@whiskeysockets/baileys")
const { serialize } = require('./lib/serialize')
const Database = require('./database')


async function handler(m, conn, map) {
  try {
    await delay(2000)
    if (m.type !== "notify") return
    let msg = await serialize(JSON.parse(JSON.stringify(m.messages[0])), conn)
    if (!msg.message) return
    if (Object.keys(msg.message)[0] == "senderKeyDistributionMessage") delete msg.message.senderKeyDistributionMessage
    if (Object.keys(msg.message)[0] == "messageContextInfo") delete msg.message.messageContextInfo
    if (msg.key && msg.key.remoteJid === "status@broadcast") return
    if (
      msg.type === "protocolMessage" ||
      msg.type === "senderKeyDistributionMessage" ||
      !msg.type ||
      msg.type === ""
    ) return
    let { type, isGroup, sender, body, from } = msg
    
    // Get admin group
    async function getAdmin() {
      return new Promise(async (resolve, reject) => {
        try {
          var groupMetadata = await conn.groupMetadata(from)
          var admins = groupMetadata.participants
            .filter((participant) => participant.admin)
            .map((admin) => admin.id)
          resolve(admins)
        } catch (error) {
          reject(error)
        }
      })
    }

    const isAdmin = isGroup
      ? (await getAdmin()).includes(sender)
      : false
    const isPrivate = from.endsWith("@s.whatsapp.net")
    const isBotAdmin = isGroup
      ? (await getAdmin()).includes(conn.decodeJid(conn.user.id))
      : false
    msg.isBot =
      (msg.key.id.startsWith("BAE5") && msg.key.id.length == 16) ||
      (msg.key.id.startsWith("3EB0") && msg.key.id.length == 20) ||
      (msg.key.id.startsWith("FOKUSID") && msg.key.id.length == 32) ||
      (msg.key.id.startsWith("3EB0") && msg.key.id.length == 22)

    if (msg.isBot) return

    if (
      msg.quoted &&
      body === ".." &&
      (msg.quoted?.mtype === "conversation" ||
        msg.quoted?.mtype === "extendedTextMessage" ||
        msg.quoted?.mtype === "imageMessage" ||
        msg.quoted?.mtype === "videoMessage" ||
        msg.quoted?.mtype === "documentMessage" ||
        msg.quoted?.mtype === "audioMessage")
    ) {
      body =
        msg.quoted.mtype == "conversation"
          ? msg.quoted.message?.conversation
          : msg.quoted.message[msg.quoted.mtype]?.caption ||
            msg.quoted.message[msg.quoted.mtype]?.text ||
            msg.quoted.message["viewOnceMessageV2"]?.message["imageMessage"]
              ?.caption ||
            msg.quoted.message["viewOnceMessageV2"]?.message["videoMessage"]
              ?.caption ||
            ""
      message = msg.quoted.message
    }

    const prefa = /^[#$+.?_&<>!/\\]/
    const prefix = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#%^&.©^]/gi.test(body)
      ? body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#%^&.©^]/gi)[0]
      : checkPrefix(prefa, body).prefix ?? "#"

    const clean = msg.body.replace(prefix, "")
    const query = clean.trim().split(/ +/).slice(1).join(" ")
    const arg = body.substring(body.indexOf(" ") + 1)
    const args = body.trim().split(/ +/).slice(1)
    const comand = body.trim().split(/ +/)[0]
    const isCmd = body.startsWith(prefix)
    global.isVideo =
      type === "videoMessage" ||
      /video/.test(msg.message["documentMessage"]?.mimetype)
    global.isImage =
      type === "imageMessage" ||
      /image/.test(msg.message["documentMessage"]?.mimetype)
    global.isAudio = type === "audioMessage"
    global.isDocument = type === "documentMessage"
    global.isSticker = type === "stickerMessage"
    global.isLocation = type === "locationMessage"
    global.isQuoted = msg.quoted
    global.contentQ = msg.quoted ? JSON.stringify(msg.quoted) : []
    global.isQAudio =
      type === "extendedTextMessage" && contentQ.includes("audioMessage")
    global.isQVideo =
      type === "extendedTextMessage" && contentQ.includes("videoMessage")
    global.isQImage =
      type === "extendedTextMessage" && contentQ.includes("imageMessage")
    global.isQDocument =
      type === "extendedTextMessage" && contentQ.includes("documentMessage")
    global.isQSticker =
      type === "extendedTextMessage" && contentQ.includes("stickerMessage")
    global.isQLocation =
      type === "extendedTextMessage" && contentQ.includes("locationMessage")

    const cmdName = body
      .replace(prefix, "")
      .trim()
      .split(/ +/)
      .shift()
      .toLowerCase()
    msg.command = cmdName
    const cmd =
      map.command.get(body.trim().split(/ +/).shift().toLowerCase()) ||
      [...map.command.values()].find((x) =>
        x.alias.find(
          (x) =>
            x.toLowerCase() == body.trim().split(/ +/).shift().toLowerCase()
        )
      ) ||
      map.command.get(cmdName) ||
      [...map.command.values()].find((x) =>
        x.alias.find((x) => x.toLowerCase() == cmdName)
      )

    global.db = new Database(msg, cmd)
    global.setting = db.read('./setting.json')
    global.bot = db.read('./database/Bot/data.json')

    var owner = setting.bot.owner
    let isOwner = owner
      .map((v) => v.replace(/[^0-9]/g, "") + "@s.whatsapp.net")
      .includes(sender)

    global.group = db.read('./database/Group/data.json')
    if (!global.group[from]) {
      global.group[from] = {
        id: from
      }
      db.save('./database/Group/data.json', group)
    }

    global.user = db.read('./database/User/data.json')
    if (!global.user[from]) {
      global.user[sender] = {
        id: sender
      }
      db.save('./database/User/data.json', user)
    }

    if (bot.autoRead) await conn.readMessages([msg.key])

    global.sendEmoteAndReply = async function(chatDB, key) {
      var emote = chatDB.emote
      var text = chatDB.text
      var react = chatDB.react

      let reactionMessage = {
        react: {
          text: emote,
          key: key
        }
      }

      if (
        (typeof text == 'string' ||
        Array.isArray(text)) &&
        text !== ""
      ) {
        if (react && emote !== "" && typeof emote == 'string') conn.sendMessage(from, reactionMessage)
        if (Array.isArray(text)) msg.reply(global.pickRandom(text))
        else msg.reply(text)
      } else if (react && typeof emote == 'string') conn.sendMessage(from, reactionMessage)
    }

    if (cmd) {
      // Wait
      var wait = setting.bot.chat.wait
      await sendEmoteAndReply(wait, msg.key)

      // Group chat only
      var modeGroup = setting.bot.chat.modeGroup
      if (!isGroup && bot.groupChatOnly) await sendEmoteAndReply(modeGroup, msg.key)

      if (!cmd) return
      let options = cmd.options

      var onlyOwner = setting.bot.chat.onlyOwner
      if (options.isOwner && !isOwner && !msg.isSelf) await sendEmoteAndReply(onlyOwner, msg.key)
      var cmdOnlyGroup = setting.bot.chat.cmdOnlyGroup
      if (options.isGroup && !isGroup) await sendEmoteAndReply(cmdOnlyGroup, msg.key)
      var onlyAdmin = setting.bot.chat.cmdAdmin
      if (options.isAdmin && !isAdmin) await sendEmoteAndReply(onlyAdmin, msg.key)
      var onlyBotAdmin = setting.bot.chat.cmdBotAdmin
      if (options.isBotAdmin && !isBotAdmin) await sendEmoteAndReply(onlyBotAdmin, msg.key)
      var cmdNoQuery = setting.bot.chat.withoutQuery
      if (options.isQuery && !q) await sendEmoteAndReply(cmdNoQuery, msg.key)
      var onlyPrivate = setting.bot.chat.cmdPrivate
      if (options.isPrivate && !isPrivate) await sendEmoteAndReply(onlyPrivate, msg.key)
      try {
        await cmd.run(
          { msg, conn },
          { query, map, args, arg, Baileys, prefix, command: comand, cmdName, m }
        )
        var success = setting.bot.chat.success
        await sendEmoteAndReply(success, msg.key)
      } catch (e) {
        var failed = setting.bot.chat.failed
        await sendEmoteAndReply(failed, msg.key)
        console.log(e)
      }
  
      // [ Log ]
      if (isCmd && isGroup) {
        console.log(`[ Group ] ${sender.split("@")[0]} - ${body} - ${msg.key.id}`)
      } else if (!isGroup) {
        console.log(`[ Private ] ${sender.split("@")[0]} - ${body} - ${msg.key.id}`)
      }
    }
  } catch(e) {
    console.error('Error:', e.stack)
  }
}

module.exports = handler