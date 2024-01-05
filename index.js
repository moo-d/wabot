// Import necessary modules and functions from external libraries
const {
  default: Baileys,
  makeInMemoryStore,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const Pino = require('pino');
const { Boom } = require('@hapi/boom');
const { readFeatures } = require('./lib');

// Initialize attributes object
const attr = {};
attr.uptime = new Date();
attr.command = new Map();

// Create an in-memory store with Pino logger
let store = makeInMemoryStore({
  logger: Pino().child({
    level: 'silent',
    stream: 'store'
  })
});

// Read features from the 'lib' module
readFeatures(attr);

// Define the 'start' asynchronous function
async function start() {
  try {
    // Fetch the latest Baileys version and use multi-file auth state
    let { version } = await fetchLatestBaileysVersion();
    let { state, saveCreds } = await useMultiFileAuthState('./session');

    // Create a Baileys connection with specified configurations
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
        // Patch messages before sending if required
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
        // Get message from the store or return a default message
        if (store) {
          const msg = await store.loadMessage(key.remoteJid, key.id);
          return msg.message || undefined;
        }
        return {
          conversation: "hello world",
        };
      },
    });

    // Bind store to the connection events
    store.bind(conn.ev);

    // Listen for 'creds.update' event and save credentials
    conn.ev.on("creds.update", saveCreds);

    // Listen for 'connection.update' event and handle connection updates
    conn.ev.on("connection.update", async (update) => {
      const { lastDisconnect, connection } = update;
      // Handle different connection states and log messages accordingly
      if (connection) console.log("Connecting to the WhatsApp bot...");
      if (connection == "connecting")
        console.log("Connecting to the WhatsApp bot...");
      if (connection) {
        if (connection != "connecting") console.log("Connection: " + connection);
      }
      if (connection == "open") console.log("Successfully connected to WhatsApp");
      if (connection === "close") {
        // Handle different disconnect reasons and take appropriate actions
        let reason = new Boom(lastDisconnect.error).output.statusCode;
        // ... (other reasons)
      }
    });

    // Listen for 'messages.upsert' event and call the handler function
    conn.ev.on("messages.upsert", async (message) => {
      require('./handler')(message, conn, attr);
    });
  } catch (e) {
    console.error(e);
  }
}

// Start the application by calling the 'start' function
start();
