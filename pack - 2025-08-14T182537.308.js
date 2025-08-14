
module.exports.config = {
  name: "pack",
  version: "1.0.0", 
  hasPermssion: 0,
  credits: "FIFA Pack",
  description: "Mở pack FIFA nhanh",
  commandCategory: "Game",
  usages: "[bronze|silver|gold|premium|ultimate]",
  cooldowns: 2
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  
  const fs = global.nodemodule["fs-extra"];
  const DATA_DIR = __dirname + '/../commands/cache/fifa_data';
  const USERS_FILE = DATA_DIR + '/fifa_users.json';
  
  if (!fs.existsSync(USERS_FILE)) {
    return api.sendMessage("❌ Bạn chưa đăng ký FIFA! Dùng 'fifa register'", threadID, messageID);
  }
  
  const users = fs.readJsonSync(USERS_FILE);
  const userData = users[senderID];
  
  if (!userData || !userData.starter_claimed) {
    return api.sendMessage("❌ Bạn chưa đăng ký FIFA! Dùng 'fifa register'", threadID, messageID);
  }
  
  const packMsg = "📦 MUA PACK NHANH\n\n" +
    `💰 Số dư: ${userData.fifa_coins.toLocaleString()} FC\n\n` +
    "Chọn gói bạn muốn mở:\n" +
    "• Bronze Pack - 100 FC\n" +
    "• Silver Pack - 300 FC\n" +
    "• Gold Pack - 1,000 FC\n" +
    "• Premium Pack - 3,000 FC\n" +
    "• Ultimate Pack - 10,000 FC\n\n" +
    "💡 Phản hồi tin nhắn này với tên gói!";
  
  return api.sendMessage(packMsg, threadID, (err, info) => {
    global.client.handleReply.push({
      name: "fifa",
      messageID: info.messageID,
      author: senderID,
      type: "pack_menu"
    });
  }, messageID);
};
