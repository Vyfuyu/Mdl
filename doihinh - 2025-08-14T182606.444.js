
module.exports.config = {
  name: "doihinh",
  version: "1.0.0",
  hasPermssion: 0, 
  credits: "FIFA Squad",
  description: "Xem đội hình FIFA nhanh",
  commandCategory: "Game",
  usages: "",
  cooldowns: 2
};

module.exports.run = async function({ api, event, Users }) {
  const { threadID, messageID, senderID } = event;
  
  const fs = global.nodemodule["fs-extra"];
  const DATA_DIR = __dirname + '/../commands/cache/fifa_data';
  const USERS_FILE = DATA_DIR + '/fifa_users.json';
  const PLAYERS_FILE = DATA_DIR + '/fifa_players.json';
  
  if (!fs.existsSync(USERS_FILE)) {
    return api.sendMessage("❌ Bạn chưa đăng ký FIFA! Dùng 'fifa register'", threadID, messageID);
  }
  
  const users = fs.readJsonSync(USERS_FILE);
  const players = fs.existsSync(PLAYERS_FILE) ? fs.readJsonSync(PLAYERS_FILE) : {};
  
  const userData = users[senderID];
  
  if (!userData || !userData.starter_claimed) {
    return api.sendMessage("❌ Bạn chưa đăng ký FIFA! Dùng 'fifa register'", threadID, messageID);
  }
  
  const FORMATIONS = {
    "4-4-2": ["GK", "RB", "CB", "CB", "LB", "RM", "CM", "CM", "LM", "ST", "ST"],
    "4-3-3": ["GK", "RB", "CB", "CB", "LB", "CDM", "CM", "CAM", "RW", "ST", "LW"],
    "3-5-2": ["GK", "CB", "CB", "CB", "RWB", "CM", "CM", "CM", "LWB", "ST", "ST"],
    "4-2-3-1": ["GK", "RB", "CB", "CB", "LB", "CDM", "CDM", "CAM", "CAM", "CAM", "ST"]
  };
  
  const formationPositions = FORMATIONS[userData.formation] || FORMATIONS["4-4-2"];
  const lineup = userData.lineup || {};
  
  let formationText = "";
  let filled = 0;
  let totalOVR = 0;
  
  for (let i = 0; i < formationPositions.length; i++) {
    const position = formationPositions[i];
    const playerId = lineup[i.toString()];
    
    if (playerId && players[playerId]) {
      const player = players[playerId];
      formationText += `${position}: ${player.name} (${player.ovr})\n`;
      filled++;
      totalOVR += player.ovr;
    } else {
      formationText += `${position}: _Chưa chọn_\n`;
    }
  }
  
  const avgOVR = filled > 0 ? Math.round(totalOVR / filled) : 0;
  const userName = (await Users.getName(senderID)) || "Unknown";
  
  const squadMsg = `⚔️ ĐỘI HÌNH - ${userName}\n\n` +
    `🏆 Sơ đồ: ${userData.formation}\n` +
    `📊 Trạng thái: ${filled}/11 (${avgOVR} OVR)\n` +
    `🏅 Rank: ${userData.rank} Div ${userData.division}\n\n` +
    `👥 Đội hình:\n${formationText}\n` +
    `🔧 Dùng 'fifa auto' để AI setup tự động!`;
  
  api.sendMessage(squadMsg, threadID, messageID);
};
