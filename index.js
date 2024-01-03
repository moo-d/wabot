const {
  default: Baileys,
  makeInMemoryStore,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys')

const Pino = require('pino')
const { Boom } = require('@hapi/boom')
const { readFeatures } = require('./lib')

const attr = {}
attr.uptime = new Date()
attr.command = new Map()

let store = makeInMemoryStore({
  logger: Pino().child({
    level: 'silent',
    stream: 'store'
  })
})

readFeatures(attr)

async function start() {
  try {
    let { version } = await fetchLatestBaileysVersion()
    let { state, saveCreds } = await useMultiFileAuthState('./session')

    const conn = Baileys({
      auth: state,
      logger: Pino({ level: "silent" }),
      version,
      printQRInTerminal: true,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 10000,
      linkPreviewImageThumbnailWidth: 300,
      generateHighQualityLinkPreview: true,
      patchMessageBeforeSending: (message) => {
        const requiresPatch = !!(
          message.buttonsMessage ||
          message.templateMessage ||
          message.listMessage
        );
        if (requiresPatch) {
          message = {
            viewOnceMessage: {
              message: {
                messageContextInfo: {
                  deviceListMetadataVersion: 2,
                  deviceListMetadata: {},
                },
                ...message,
              },
            },
          };
        }
        return message;
      },
      getMessage: async (key) => {
        if (store) {
          const msg = await store.loadMessage(key.remoteJid, key.id);
          return msg.message || undefined;
        }
        return {
          conversation: "hello world",
        };
      },
    });

    store.bind(conn.ev)

    conn.ev.on("creds.update", saveCreds)

    conn.ev.on("connection.update", async (update) => {
      const { lastDisconnect, connection } = update;
      if (connection) console.log("Connecting to the WhatsApp bot...");
      if (connection == "connecting")
        console.log("Connecting to the WhatsApp bot...");
      if (connection) {
        if (connection != "connecting") console.log("Connection: " + connection);
      }
      if (connection == "open") console.log("Successfully connected to whatsapp");
      if (connection === "close") {
        let reason = new Boom(lastDisconnect.error).output.statusCode;
        if (reason === DisconnectReason.badSession) {
          console.log(`Bad Session File, Please Delete session and Scan Again`);
          conn.logout();
        } else if (reason === DisconnectReason.connectionClosed) {
          console.log("Connection closed, reconnecting....");
          start();
        } else if (reason === DisconnectReason.connectionLost) {
          console.log("Connection Lost from Server, reconnecting...");
          start();
        } else if (reason === DisconnectReason.connectionReplaced) {
          console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First");
          conn.logout();
        } else if (reason === DisconnectReason.loggedOut) {
          console.log(`Device Logged Out, Please Delete session and Scan Again.`);
          conn.logout();
        } else if (reason === DisconnectReason.restartRequired) {
          console.log("Restart Required, Restarting...");
          start();
        } else if (reason === DisconnectReason.timedOut) {
          console.log("Connection TimedOut, Reconnecting...");
          start();
        } else {
          conn.end(`Unknown DisconnectReason: ${reason}|${lastDisconnect.error}`);
        }
      }
    });
    conn.ev.on("messages.upsert", async (message) => {
      require('./handler')(message, conn, attr)
    })
  } catch (e) {
    console.error(e)
  }
}

start()