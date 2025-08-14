
module.exports.config = {
  name: "dau",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "FIFA Match", 
  description: "Tìm trận đấu FIFA nhanh",
  commandCategory: "Game",
  usages: "",
  cooldowns: 3
};

module.exports.run = async function({ api, event }) {
  const { threadID, messageID, senderID } = event;
  
  // Load FIFA data
  const DATA_DIR = __dirname + '/../../fifa_data';
  const USERS_FILE = DATA_DIR + '/fifa_users.json';
  
  if (!global.nodemodule["fs-extra"].existsSync(USERS_FILE)) {
    return api.sendMessage("❌ Bạn chưa đăng ký FIFA! Dùng 'fifa register'", threadID, messageID);
  }
  
  const users = global.nodemodule["fs-extra"].readJsonSync(USERS_FILE);
  const userData = users[senderID];
  
  if (!userData || !userData.starter_claimed) {
    return api.sendMessage("❌ Bạn chưa đăng ký FIFA! Dùng 'fifa register'", threadID, messageID);
  }
  
  // Check lineup
  const lineup = userData.lineup || {};
  const filledPositions = Object.keys(lineup).filter(pos => lineup[pos]).length;
  
  if (filledPositions < 11) {
    return api.sendMessage(`❌ Đội hình chưa đủ 11 cầu thủ! (${filledPositions}/11)\nDùng 'fifa auto' để AI setup tự động.`, threadID, messageID);
  }
  
  // Check daily limit
  const today = new Date().toDateString();
  const lastMatchDate = userData.last_match_date ? new Date(userData.last_match_date).toDateString() : null;
  
  if (lastMatchDate !== today) {
    userData.daily_matches = 0;
  }
  
  if (userData.daily_matches >= 10) {
    return api.sendMessage("❌ Bạn đã đạt giới hạn trận đấu hôm nay! (10 trận/ngày)", threadID, messageID);
  }
  
  const matchMsg = "⚔️ TÌM TRẬN ĐẤU NHANH\n\n" +
    "🤖 Đang tìm đối thủ AI...\n" +
    "💡 Phản hồi tin nhắn này với 'ai' để bắt đầu!";
  
  return api.sendMessage(matchMsg, threadID, (err, info) => {
    global.client.handleReply.push({
      name: "fifa",
      messageID: info.messageID,
      author: senderID,
      type: "match_opponent"
    });
  }, messageID);
};
