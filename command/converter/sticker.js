const axios = require("axios").default;

// Creating an instance of Axios for Sticker API
const sticker = axios.create({
  baseURL: "https://sticker-api-tpe3wet7da-uc.a.run.app"
});

module.exports = {
  name: 'sticker',
  alias: ['s', 'stiker', 'stickergif', 'stikergif', 'gifsticker', 'gifstiker', 'take'],
  category: 'converter',
  isSpam: true,
  cooldown: 5,
  async run({ conn, msg }, { query }) {
    // Splitting the command arguments
    q = query.split('|');

    // Extracting packname and author from arguments or using default values
    let packname = q[0] ? q[0] : setting.defaultSticker.packname;
    let author = q[1] ? q[0] : setting.defaultSticker.author;

    let buffer;

    try {
      // Handling image or sticker
      if (isImage || isQImage || isQSticker) {
        let buffer = isQImage || isQSticker ? await msg.quoted.download() : await msg.download();
        const data = {
          image: `data:image/jpeg;base64,${buffer.toString("base64")}`,
          stickerMetadata: {
            pack: author,
            author: author,
            keepScale: true,
            circle: false,
            removebg: false
          }
        };
        res = await sticker.post("/prepareWebp", data);

        // Sending the sticker
        conn.sendMessage(msg.from, { sticker: Buffer.from(res.data.webpBase64, "base64") }, { quoted: msg });
      } else if (isVideo || isQVideo) {
        // Handling video
        if (
          isQVideo
            ? msg.quoted?.message?.videoMessage?.seconds >= 10
            : msg.message?.videoMessage?.seconds >= 10
        ) return sendEmoteAndReply(global.largeFileSize, msg.key);

        let buffer = isQVideo ? await msg.quoted.download() : await msg.download();
        const data = {
          file: `data:video/mp4;base64,${buffer.toString("base64")}`,
          stickerMetadata: {
            pack: packname,
            author: author,
            keepScale: true,
          },
          processOptions: {
            crop: false,
            fps: 10,
            startTime: "00:00:00.0",
            endTime: "00:00:7.0",
            loop: 0,
          }
        };

        res = await sticker.post("/convertMp4BufferToWebpDataUrl", data);

        // Sending the sticker
        conn.sendMessage(
          msg.from,
          { sticker: Buffer.from(res.data.split(";base64,")[1], "base64") },
          { quoted: msg }
        );
      } else if (
        isQDocument &&
        (/image/.test(msg.quoted?.message?.documentMessage?.mimetype) ||
          /video/.test(msg.quoted?.message?.documentMessage?.mimetype))
      ) {
        // Handling document (image or video)
        inImage = /image/.test(msg.quoted?.message?.documentMessage?.mimetype);
        inVideo = /video/.test(msg.quoted?.message?.documentMessage?.mimetype);

        let buffer = await msg.quoted.download();

        if (inImage) {
          const data = {
            image: `data:image/jpeg;base64,${buffer.toString("base64")}`,
            stickerMetadata: {
              pack: packname,
              author: author,
              keepScale: true,
              circle: false,
              removebg: false
            }
          };

          res = await sticker.post("/prepareWebp", data);

          // Sending the sticker
          conn.sendMessage(
            msg.from,
            { sticker: Buffer.from(res.data.webpBase64, "base64") },
            { quoted: msg }
          );
        } else if (inVideo) {
          // Handling video from document
          const data = {
            file: `data:video/mp4;base64,${buffer.toString("base64")}`,
            stickerMetadata: {
              pack: packname,
              author: author,
              keepScale: true,
            },
            processOptions: {
              crop: false,
              fps: 10,
              startTime: "00:00:00.0",
              endTime: "00:00:7.0",
              loop: 0
            }
          };

          res = await sticker.post("/convertMp4BufferToWebpDataUrl", data);

          // Sending the sticker
          conn.sendMessage(
            msg.from,
            { sticker: Buffer.from(res.data.split(";base64,")[1], "base64") },
            { quoted: msg }
          );
        }
      } else {
        // Handling missing media
        return await sendEmoteAndReply(global.missingMedia, msg.key);
      }
      (buffer = null), (stickerBuff = null);
    } catch (err) {
      console.log(err);
      await sendEmoteAndReply(global.failed, msg.key);
    }
  }
}
