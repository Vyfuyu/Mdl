
module.exports.config = {
  name: "adc",
  version: "2.0.0", 
  hasPermssion: 3,
  credits: "Kaori Waguri - Sĩ Vương",
  description: "Áp dụng code từ nhiều loại link với AI phân tích code tự động",
  commandCategory: "Admin",
  usages: "adc <tên-file> [analyze] (reply link hoặc không để up code local lên dpaste)",
  cooldowns: 0,
  images: [],
};

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const request = require("request");
const cheerio = require("cheerio");
const moment = require("moment-timezone");
const { resolve } = require("path");

// DeepSeek API Ở Đay Bọn Ngu
const DEEPSEEK_API = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_API_KEY = "sk-e4891c5b643e4a50b4d521398143a455"; // Nhớ thêm vào bọn ngu

module.exports.onLoad = function () {
  const configPath = global.client.configPath;
  const appStatePath = require(configPath).APPSTATEPATH;

  try {
    const originalCookie = fs.readFileSync(appStatePath, "utf8");
    const updateCookie = JSON.parse(originalCookie).map(cookie => `${cookie.key}=${cookie.value}`).join("; ");

    const accPath = path.join(__dirname, "./../../acc.json");
    if (fs.existsSync(accPath)) {
      const accData = require(accPath);
      fs.writeFileSync(accPath, JSON.stringify({ ...accData, cookie: updateCookie }, null, 2), "utf8");
    }
  } catch (error) {
    console.error("Đã xảy ra lỗi khi tự động cập nhật cookie:", error);
  }
};

// DeepSeek AI Analysis Function
async function analyzeCodeWithAI(code, fileName) {
  try {
    const response = await axios.post(DEEPSEEK_API, {
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "Bạn là một chuyên gia phân tích code JavaScript. Hãy phân tích code và đưa ra nhận xét về: 1) Chức năng chính, 2) Điểm mạnh, 3) Điểm cần cải thiện, 4) Mức độ bảo mật, 5) Khuyến nghị sử dụng."
        },
        {
          role: "user",
          content: `Phân tích code JavaScript này cho file "${fileName}":\n\n${code}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("DeepSeek API Error:", error);
    return "❌ Không thể phân tích code với AI. Vui lòng kiểm tra API key.";
  }
}

// Enhanced URL Processing Functions
async function processGitHubLink(url) {
  // Convert GitHub blob to raw
  if (url.includes("/blob/")) {
    url = url.replace("/blob/", "/raw/");
  }
  // Handle gist URLs
  if (url.includes("gist.github.com")) {
    url = url.replace("gist.github.com", "gist.githubusercontent.com") + "/raw";
  }
  return url;
}

async function processCodePlatformLinks(url) {
  const platforms = {
    // Anotepad
    'anotepad.com': async (url) => {
      const id = url.split('/').pop();
      return `https://anotepad.com/note/read/${id}`;
    },
    
    // Hastebin
    'hastebin.com': async (url) => {
      const id = url.split('/').pop();
      return `https://hastebin.com/raw/${id}`;
    },
    
    // Pastebin
    'pastebin.com': async (url) => {
      const id = url.split('/').pop();
      return `https://pastebin.com/raw/${id}`;
    },
    
    // JSFiddle
    'jsfiddle.net': async (url) => {
      return url.replace('/edit', '') + '/js/';
    },
    
    // CodePen
    'codepen.io': async (url) => {
      const penId = url.split('/pen/')[1]?.split('/')[0];
      return `https://codepen.io/api/oembed?url=${encodeURIComponent(url)}&format=json`;
    }
  };

  for (const [domain, processor] of Object.entries(platforms)) {
    if (url.includes(domain)) {
      return await processor(url);
    }
  }
  
  return url;
}

async function downloadFromSpecialPlatforms(url, fileName, api, threadID, messageID) {
  try {
    // Handle different platforms
    if (url.includes("buildtool") || url.includes("tinyurl.com")) {
      return new Promise((resolve, reject) => {
        request({ method: "GET", url }, function (error, response, body) {
          if (error) return reject(error);
          const load = cheerio.load(body);
          let code = "";
          load(".language-js, .language-javascript, pre, code").each((index, el) => {
            if (el.children && el.children[0] && el.children[0].data) {
              code = el.children[0].data;
              return false; // break
            }
          });
          if (!code) {
            load("body").each((index, el) => {
              code = load(el).text();
            });
          }
          resolve(code);
        });
      });
    }

    // Handle Google Drive
    if (url.includes("drive.google")) {
      const id = url.match(/[-\w]{25,}/);
      const filePath = resolve(__dirname, `${fileName}.js`);
      const writer = fs.createWriteStream(filePath);
      const response = await axios.get(`https://drive.google.com/u/0/uc?id=${id}&export=download`, { responseType: "stream" });
      return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on("finish", () => {
          const code = fs.readFileSync(filePath, "utf-8");
          resolve(code);
        });
        writer.on("error", reject);
      });
    }

    // Handle CodePen API response
    if (url.includes("codepen.io/api/oembed")) {
      const response = await axios.get(url);
      const penData = response.data;
      // Extract JavaScript from CodePen
      const jsUrl = penData.html.match(/src="([^"]*js[^"]*)"/)?.[1];
      if (jsUrl) {
        const jsResponse = await axios.get(jsUrl);
        return jsResponse.data;
      }
    }

    // Default: try to get content directly
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    return response.data;
  } catch (error) {
    throw new Error(`Không thể tải code từ ${url}: ${error.message}`);
  }
}

module.exports.run = async function({ api, event, args }) {
  // ====== CONFIG DPASTE ======
  const DP_API = "https://dpaste.com/api/v2/";
  const DP_TOKEN = "f64e286c58e1490b";

  if (!global.config.NDH.includes(event.senderID)) {
    api.sendMessage("⚠️ Đã báo cáo về admin vì tội dùng lệnh cấm", event.threadID, event.messageID);
    
    const idad = global.config.NDH;
    const name = global.data.userName.get(event.senderID);
    const threadInfo = await api.getThreadInfo(event.threadID);
    const nameBox = threadInfo.threadName;
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss | DD/MM/YYYY");
    
    return api.sendMessage(
      "🚨 CẢNH BÁO BẢO MẬT\n" +
      "📌 Box: " + nameBox + "\n" +
      "👤 " + name + " đã cố gắng sử dụng lệnh " + this.config.name + "\n" +
      "📎 Profile: https://www.facebook.com/profile.php?id=" + event.senderID + "\n" +
      "⏰ Thời gian: " + time + "\n" +
      "🔒 Hệ thống Premium VIP - Kaori Waguri", 
      idad
    );
  }

  const { threadID, messageID, messageReply, type } = event;
  const fileName = args[0];
  const shouldAnalyze = args.includes("analyze") || args.includes("ai");
  let text;
  if (type === "message_reply") text = messageReply.body;

  if (!text && !fileName) {
    return api.sendMessage(
      `🔰 ADC PREMIUM VIP - KAORI WAGURI\n\n` +
      `📋 Cách sử dụng:\n` +
      `• adc <tên-file> - Upload code local lên dpaste\n` +
      `• adc <tên-file> analyze - Tải code + phân tích AI\n\n` +
      `🌐 Hỗ trợ các platform:\n` +
      `• GitHub (blob/raw/gist)\n` +
      `• Anotepad, Pastebin, Hastebin\n` +
      `• Google Drive, JSFiddle, CodePen\n` +
      `• Buildtool, TinyURL\n\n` +
      `⚡ Powered by DeepSeek AI`, 
      threadID, messageID
    );
  }

  // CASE 1: Upload local code to dpaste
  if (!text && fileName) {
    return fs.readFile(`${__dirname}/${fileName}.js`, "utf-8", async (err, data) => {
      if (err) return api.sendMessage(`❎ Module ${fileName} không tồn tại!`, threadID, messageID);

      try {
        const payload = new URLSearchParams({
          content: data,
          syntax: "js",
          title: `${fileName}.js - Kaori Waguri Premium`,
          expiry_days: "365"
        });

        const response = await axios.post(DP_API, payload, {
          headers: {
            Authorization: `Bearer ${DP_TOKEN}`,
            "Content-Type": "application/x-www-form-urlencoded"
          }
        });

        const link = response.data.toString().trim();
        const rawLink = link.replace(/\/$/, "") + ".txt";

        let message = `✅ UPLOAD THÀNH CÔNG\n\n` +
          `📄 File: ${fileName}.js\n` +
          `🔗 Link: ${link}\n` +
          `📝 Raw: ${rawLink}\n` +
          `⏰ ${moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY")}\n` +
          `👑 Kaori Waguri Premium VIP`;

        if (shouldAnalyze) {
          const analysis = await analyzeCodeWithAI(data, fileName);
          message += `\n\n🤖 AI ANALYSIS:\n${analysis}`;
        }

        return api.sendMessage(message, threadID, messageID);
      } catch (e) {
        return api.sendMessage(`❎ Lỗi upload: ${e.message}`, threadID, messageID);
      }
    });
  }

  // CASE 2: Download code from URL
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
  const urls = text ? text.match(urlRegex) : null;

  if (!urls || !urls[0]) {
    return api.sendMessage("❎ Không tìm thấy URL hợp lệ!", threadID, messageID);
  }

  let url = urls[0];
  
  try {
    // Process different URL types
    if (url.includes("github.com")) {
      url = await processGitHubLink(url);
    } else {
      url = await processCodePlatformLinks(url);
    }

    // Download and process code
    const code = await downloadFromSpecialPlatforms(url, fileName, api, threadID, messageID);
    
    if (!code || code.trim() === "") {
      return api.sendMessage("❎ Không thể lấy code từ link này!", threadID, messageID);
    }

    // Save code to file
    fs.writeFile(`${__dirname}/${fileName}.js`, code, "utf-8", async function (err) {
      if (err) {
        return api.sendMessage(`❎ Lỗi lưu file ${fileName}.js`, threadID, messageID);
      }

      let message = `✅ THÀNH CÔNG!\n\n` +
        `📄 File: ${fileName}.js\n` +
        `📊 Size: ${Math.round(code.length / 1024 * 100) / 100} KB\n` +
        `🔗 Source: ${url}\n` +
        `⏰ ${moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY")}\n` +
        `💡 Sử dụng "load" để cập nhật module\n` +
        `👑 Kaori Waguri Premium VIP`;

      // AI Analysis if requested
      if (shouldAnalyze) {
        api.sendMessage(message + "\n\n🤖 Đang phân tích code với AI...", threadID, messageID);
        const analysis = await analyzeCodeWithAI(code, fileName);
        message += `\n\n🤖 AI ANALYSIS:\n${analysis}`;
      }

      api.sendMessage(message, threadID, messageID);
    });

  } catch (error) {
    return api.sendMessage(`❎ Lỗi: ${error.message}`, threadID, messageID);
  }
};
