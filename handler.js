// Import required modules and functions
require('./global')

const { default: Baileys, delay } = require("@whiskeysockets/baileys")
const { serialize } = require('./lib/serialize')
const Database = require('./database')

// Initialize a cooldown map
const cooldown = new Map()

// Define the main handler function
async function handler(m, conn, map) {
  try {
    // Add a delay to avoid immediate processing
    await delay(2000)

    // Check if the message type is "notify"
    if (m.type !== "notify") return

    // Serialize the message and handle some message properties
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

    // Extract relevant information from the message
    let { type, isGroup, sender, body, from } = msg

    // Function to get admin users in a group
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

    // Check if the sender is an admin, if the chat is private, and if the bot is an admin
    const isAdmin = isGroup
      ? (await getAdmin()).includes(sender)
      : false
    const isPrivate = from.endsWith("@s.whatsapp.net")
    const isBotAdmin = isGroup
      ? (await getAdmin()).includes(conn.decodeJid(conn.user.id))
      : false

    // Check if the message is from a bot and return if true
    msg.isBot =
      (msg.key.id.startsWith("BAE5") && msg.key.id.length == 16) ||
      (msg.key.id.startsWith("3EB0") && msg.key.id.length == 20) ||
      (msg.key.id.startsWith("FOKUSID") && msg.key.id.length == 32) ||
      (msg.key.id.startsWith("3EB0") && msg.key.id.length == 22)

    if (msg.isBot) return

    // Process quoted messages and update 'body' and 'message'
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

    // Define regular expressions for checking prefixes
    const prefa = /^[#$+.?_&<>!/\\]/
    const prefix = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#%^&.©^]/gi.test(body)
      ? body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#%^&.©^]/gi)[0]
      : checkPrefix(prefa, body).prefix ?? "#"

    // Extract additional information from the message
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

    // Extract the command name from the message
    const cmdName = body
      .replace(prefix, "")
      .trim()
      .split(/ +/)
      .shift()
      .toLowerCase()
    msg.command = cmdName

    // Get the command from the map
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

    // Initialize global database and setting variables
    global.db = new Database(msg, cmd)
    global.setting = db.read('setting')
    global.bot = db.read('bot')

    var owner = setting.bot.owner
    let isOwner = owner
      .map((v) => v.replace(/[^0-9]/g, "") + "@s.whatsapp.net")
      .includes(sender)

    global.group = db.read('group')
    if (!global.group[from] && isGroup) {
      global.group[from] = {
        id: from
      }
      db.save('group', group)
    }

    global.user = db.read('user')
    if (!global.user[from]) {
      global.user[sender] = {
        id: sender
      }
      db.save('user', user)
    }

    global.largeFileSize = setting.chat.largeFileSize
    global.failed = setting.chat.failed
    global.missingMedia = setting.chat.missingMedia

    // Auto-read messages if enabled
    if (bot.autoRead) await conn.readMessages([msg.key])

    // Function to send emotes and reply based on chat settings
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

      if (react && emote !== "" && typeof emote == 'string') conn.sendMessage(from, reactionMessage)
      if (typeof text == 'string' && text !== "") return msg.reply(text)
      else if (Array.isArray(text)) return msg.reply(global.pickRandom(text))
    }

    if (cmd) {
      // Wait
      var wait = setting.chat.wait
      await sendEmoteAndReply(wait, msg.key)

      // Group chat only
      var modeGroup = setting.chat.modeGroup
      if (!isGroup && bot.groupChatOnly) await sendEmoteAndReply(modeGroup, msg.key)

      if (!cmd) return
      let options = cmd.options

      // Anti Spam
      var spam = setting.chat.spam
      if (!cooldown.has(msg.from)) cooldown.set(msg.from, new Map())
      const now = Date.now()
      const timestamps = cooldown.get(msg.from)
      const cdAmount = (options.cooldown || setting.defaultCooldown) * 1000
      if (timestamps.has(msg.from)) {
        const expiration = timestamps.get(msg.from) + cdAmount
        let timeLeft = (expiration - now) / 1000
        db.setTimeLeft(timeLeft.toFixed(1));
        if (now < expiration) {
          return await sendEmoteAndReply(spam, msg.key)
        }
      }

      setTimeout(() => timestamps.delete(msg.from), cdAmount);

      if (options.isSpam) {
        timestamps.set(msg.from, now);
      }

      var onlyOwner = setting.chat.onlyOwner
      if (options.isOwner && !isOwner && !msg.isSelf) await sendEmoteAndReply(onlyOwner, msg.key)
      var cmdOnlyGroup = setting.chat.cmdOnlyGroup
      if (options.isGroup && !isGroup) await sendEmoteAndReply(cmdOnlyGroup, msg.key)
      var onlyAdmin = setting.chat.cmdAdmin
      if (options.isAdmin && !isAdmin) await sendEmoteAndReply(onlyAdmin, msg.key)
      var onlyBotAdmin = setting.chat.cmdBotAdmin
      if (options.isBotAdmin && !isBotAdmin) await sendEmoteAndReply(onlyBotAdmin, msg.key)
      var cmdNoQuery = setting.chat.withoutQuery
      if (options.isQuery && !q) await sendEmoteAndReply(cmdNoQuery, msg.key)
      var onlyPrivate = setting.chat.cmdPrivate
      if (options.isPrivate && !isPrivate) await sendEmoteAndReply(onlyPrivate, msg.key)
      try {
        // Run the command and handle success
        await cmd.run(
          { msg, conn },
          { query, map, args, arg, Baileys, prefix, command: comand, cmdName, m }
        )
        var success = setting.chat.success
        await sendEmoteAndReply(success, msg.key)
      } catch (e) {
        // Handle command execution failure
        var failed = setting.chat.failed
        await sendEmoteAndReply(failed, msg.key)
        console.log(e)
      }
  
      // Log command execution
      if (isCmd && isGroup) {
        console.log(`[ Group ] ${sender.split("@")[0]} - ${body} - ${msg.key.id}`)
      } else if (!isGroup) {
        console.log(`[ Private ] ${sender.split("@")[0]} - ${body} - ${msg.key.id}`)
      }
    }
  } catch(e) {
    // Handle errors
    console.error('Error:', e.stack)
  }
}

// Export the handler function
module.exports = handler
