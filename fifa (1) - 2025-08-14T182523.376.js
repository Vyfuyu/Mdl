
module.exports.config = {
  name: "fifa",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "FIFA Online 4 Module",
  description: "Hệ thống game FIFA Online 4 với AI",
  commandCategory: "Game",
  usages: "[register|profile|shop|squad|match|ranking]",
  cooldowns: 3,
  dependencies: {
    "axios": "",
    "fs-extra": ""
  }
};

module.exports.languages = {
  "vi": {
    "welcome": "🎉 CHÀO MỪNG ĐẾN FIFA ONLINE 4!\n**{name}** đã tạo tài khoản thành công!\n\n💰 FIFA Coins: {coins:,} FC\n⚽ Cầu thủ: {players} cầu thủ\n🏆 Rank: {rank} Div {division}\n\n🎁 Starter Pack:\n{starterPlayers}\n\n🎮 Dùng 'fifa squad' để xem đội hình!",
    "alreadyRegistered": "✅ Bạn đã có tài khoản FIFA Online 4!",
    "notRegistered": "❌ Bạn chưa đăng ký FIFA! Dùng 'fifa register'",
    "profile": "⚽ Hồ Sơ FIFA - {name}\n\n💰 FIFA Coins: {coins:,} FC\n⚽ Cầu thủ: {playersCount}\n🏆 Rank: {rank} Div {division}\n\n📊 Thống Kê:\n**Trận:** {matches}\n**Thắng:** {wins}\n**Hòa:** {draws}\n**Thua:** {losses}\n**Tỷ lệ thắng:** {winRate}%\n\n⚽ Bàn thắng:\n**Ghi:** {goalsFor}\n**Thủng lưới:** {goalsAgainst}\n\n🎯 Điểm: {points} điểm\n⚔️ Đội hình: {formation} ({filledPositions}/11)"
  },
  "en": {}
};

// File paths
const fs = global.nodemodule["fs-extra"];
const DATA_DIR = __dirname + '/../commands/cache/fifa_data';
const USERS_FILE = DATA_DIR + '/fifa_users.json';
const PLAYERS_FILE = DATA_DIR + '/fifa_players.json';
const MARKET_FILE = DATA_DIR + '/fifa_market.json';
const MATCHES_FILE = DATA_DIR + '/fifa_matches.json';
const CARDS_FILE = DATA_DIR + '/fifa_cards.json';

// Game configuration
const PACK_TYPES = {
  "bronze": {
    price: 500,
    fifa_price: 100,
    description: "Gói thường - Cơ hội nhận cầu thủ Bronze-Silver",
    odds: { bronze: 70, silver: 25, gold: 4.5, inform: 0.5 }
  },
  "silver": {
    price: 1500,
    fifa_price: 300,
    description: "Gói bạc - Cơ hội cao nhận Gold và IF",
    odds: { bronze: 40, silver: 35, gold: 20, inform: 4, tots: 1 }
  },
  "gold": {
    price: 5000,
    fifa_price: 1000,
    description: "Gói vàng - Đảm bảo có Gold, cơ hội IF/TOTS",
    odds: { silver: 30, gold: 50, inform: 15, tots: 4, icon: 1 }
  },
  "premium": {
    price: 15000,
    fifa_price: 3000,
    description: "Gói cao cấp - Cơ hội cao TOTS/ICON",
    odds: { gold: 40, inform: 30, tots: 25, icon: 4, toty: 1 }
  },
  "ultimate": {
    price: 50000,
    fifa_price: 10000,
    description: "Gói tối thượng - Đảm bảo ICON hoặc TOTY",
    odds: { inform: 20, tots: 30, icon: 35, toty: 14, moments: 1 }
  }
};

const FORMATIONS = {
  "4-4-2": {
    positions: ["GK", "RB", "CB", "CB", "LB", "RM", "CM", "CM", "LM", "ST", "ST"],
    description: "Đội hình cân bằng tấn công và phòng thủ"
  },
  "4-3-3": {
    positions: ["GK", "RB", "CB", "CB", "LB", "CDM", "CM", "CAM", "RW", "ST", "LW"],
    description: "Đội hình tấn công với cánh"
  },
  "3-5-2": {
    positions: ["GK", "CB", "CB", "CB", "RWB", "CM", "CM", "CM", "LWB", "ST", "ST"],
    description: "Đội hình kiểm soát giữa sân"
  },
  "4-2-3-1": {
    positions: ["GK", "RB", "CB", "CB", "LB", "CDM", "CDM", "CAM", "CAM", "CAM", "ST"],
    description: "Đội hình phòng thủ chắc chắn"
  }
};

// Utility functions
function ensureDataFolder() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadData(filePath, defaultData = {}) {
  ensureDataFolder();
  if (!fs.existsSync(filePath)) {
    fs.writeJsonSync(filePath, defaultData, { spaces: 2 });
    return defaultData;
  }
  try {
    return fs.readJsonSync(filePath);
  } catch (err) {
    return defaultData;
  }
}

function saveData(filePath, data) {
  ensureDataFolder();
  fs.writeJsonSync(filePath, data, { spaces: 2 });
}

function getUserData(userID) {
  const users = loadData(USERS_FILE, {});
  if (!users[userID]) {
    users[userID] = {
      fifa_coins: 1000,
      players: [],
      formation: "4-4-2",
      lineup: {},
      rank: "Bronze",
      division: 10,
      points: 0,
      matches_played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goals_for: 0,
      goals_against: 0,
      daily_matches: 0,
      last_match_date: null,
      joined_date: new Date().toISOString(),
      season_rewards_claimed: false,
      starter_claimed: false
    };
    saveData(USERS_FILE, users);
  }
  return users[userID];
}

function saveUserData(userID, userData) {
  const users = loadData(USERS_FILE, {});
  users[userID] = userData;
  saveData(USERS_FILE, users);
}

function generateFallbackPlayer(cardType, ovr) {
  const positions = ["ST", "CAM", "CM", "CDM", "CB", "LB", "RB", "GK", "LW", "RW"];
  const names = ["Silva", "Santos", "Rodriguez", "Johnson", "Williams", "Brown", "Garcia", "Martinez"];
  const countries = ["Brazil", "Argentina", "Spain", "England", "France", "Germany", "Italy", "Portugal"];
  const clubs = ["FC Barcelona", "Real Madrid", "Manchester United", "Liverpool", "Bayern Munich", "PSG"];

  const baseStat = Math.max(30, ovr - 15);
  const variation = 20;

  const playerId = `pl_${Math.floor(Math.random() * 900000) + 100000}`;
  
  const playerData = {
    id: playerId,
    name: `${names[Math.floor(Math.random() * names.length)]} ${Math.floor(Math.random() * 99) + 1}`,
    position: positions[Math.floor(Math.random() * positions.length)],
    ovr: ovr,
    pace: Math.floor(Math.random() * variation) + baseStat,
    shooting: Math.floor(Math.random() * variation) + baseStat,
    passing: Math.floor(Math.random() * variation) + baseStat,
    dribbling: Math.floor(Math.random() * variation) + baseStat,
    defending: Math.floor(Math.random() * variation) + baseStat,
    physical: Math.floor(Math.random() * variation) + baseStat,
    nationality: countries[Math.floor(Math.random() * countries.length)],
    club: clubs[Math.floor(Math.random() * clubs.length)],
    card_type: cardType,
    market_value: ovr * 1000 + Math.floor(Math.random() * 1500) + 500,
    created_at: new Date().toISOString()
  };

  // Save player to database
  const players = loadData(PLAYERS_FILE, {});
  players[playerId] = playerData;
  saveData(PLAYERS_FILE, players);

  return playerData;
}

async function generatePlayerWithAI(cardType) {
  const ovrRanges = {
    bronze: [65, 74],
    silver: [75, 79],
    gold: [80, 85],
    inform: [86, 89],
    tots: [90, 94],
    icon: [89, 95],
    toty: [95, 99],
    moments: [96, 99]
  };

  const [minOvr, maxOvr] = ovrRanges[cardType] || [70, 80];
  const targetOvr = Math.floor(Math.random() * (maxOvr - minOvr + 1)) + minOvr;

  return generateFallbackPlayer(cardType, targetOvr);
}

function autoSetupFormation(userData) {
  const players = loadData(PLAYERS_FILE, {});
  const availablePlayers = userData.players
    .map(id => players[id])
    .filter(p => p)
    .sort((a, b) => b.ovr - a.ovr);

  const formationPositions = FORMATIONS[userData.formation].positions;
  const newLineup = {};
  const usedPlayers = new Set();

  for (let i = 0; i < formationPositions.length; i++) {
    const position = formationPositions[i];
    
    let bestPlayer = null;
    for (const player of availablePlayers) {
      if (!usedPlayers.has(player.id)) {
        if (player.position === position || 
            (position === "CB" && ["CB", "CDM"].includes(player.position)) ||
            (position === "CM" && ["CM", "CAM", "CDM"].includes(player.position))) {
          bestPlayer = player;
          break;
        }
      }
    }
    
    if (!bestPlayer) {
      for (const player of availablePlayers) {
        if (!usedPlayers.has(player.id)) {
          bestPlayer = player;
          break;
        }
      }
    }
    
    if (bestPlayer) {
      newLineup[i.toString()] = bestPlayer.id;
      usedPlayers.add(bestPlayer.id);
    }
  }

  userData.lineup = newLineup;
  return newLineup;
}

function checkRankPromotion(userData) {
  const pointsPerDivision = 100;
  
  if (userData.points >= pointsPerDivision) {
    userData.points -= pointsPerDivision;
    
    if (userData.division > 1) {
      userData.division -= 1;
    } else {
      const rankOrder = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Elite"];
      const currentIndex = rankOrder.indexOf(userData.rank);
      if (currentIndex < rankOrder.length - 1) {
        userData.rank = rankOrder[currentIndex + 1];
        userData.division = 10;
      }
    }
    return true;
  }
  return false;
}

async function startAIMatch(api, event) {
  const { threadID, messageID, senderID } = event;
  const userData = getUserData(senderID);

  const lineup = userData.lineup || {};
  const filledPositions = Object.keys(lineup).filter(pos => lineup[pos]).length;
  
  if (filledPositions < 11) {
    return api.sendMessage(`❌ Đội hình chưa đủ 11 cầu thủ! (Hiện có: ${filledPositions}/11)\nDùng 'fifa auto' để AI setup tự động.`, threadID, messageID);
  }

  const today = new Date().toDateString();
  const lastMatchDate = userData.last_match_date ? new Date(userData.last_match_date).toDateString() : null;
  
  if (lastMatchDate !== today) {
    userData.daily_matches = 0;
  }

  if (userData.daily_matches >= 10) {
    return api.sendMessage("❌ Bạn đã đạt giới hạn trận đấu hôm nay! (10 trận/ngày)", threadID, messageID);
  }

  api.sendMessage("⚽ TRẬN ĐẤU BẮT ĐẦU!\n\n" +
    "🏟️ Đang thi đấu với AI Bot...\n" +
    "⏱️ Thời gian: 30 giây\n" +
    "📊 Tỷ số: 0 - 0\n\n" +
    "⏳ Trận đấu sẽ tự động kết thúc...", threadID, messageID);

  setTimeout(() => {
    const playerScore = Math.floor(Math.random() * 4);
    const aiScore = Math.floor(Math.random() * 4);

    let result = '';
    let pointsEarned = 0;
    let coinsEarned = Math.floor(Math.random() * 151) + 50;

    if (playerScore > aiScore) {
      result = '🏆 CHIẾN THẮNG!';
      userData.wins += 1;
      pointsEarned = 3;
      coinsEarned *= 2;
    } else if (playerScore < aiScore) {
      result = '😢 THẤT BẠI';
      userData.losses += 1;
      pointsEarned = 0;
    } else {
      result = '🤝 HÒA';
      userData.draws += 1;
      pointsEarned = 1;
    }

    userData.matches_played += 1;
    userData.daily_matches += 1;
    userData.last_match_date = new Date().toISOString();
    userData.points += pointsEarned;
    userData.goals_for += playerScore;
    userData.goals_against += aiScore;
    userData.fifa_coins += coinsEarned;

    const rankChanged = checkRankPromotion(userData);
    saveUserData(senderID, userData);

    let resultMsg = `⚽ KẾT QUẢ TRẬN ĐẤU - ${result}\n\n` +
      `📊 **Tỷ số cuối:** ${playerScore} - ${aiScore}\n` +
      `💰 Thưởng: +${coinsEarned:,} FIFA Coins\n` +
      `🏆 Điểm: +${pointsEarned} điểm\n` +
      `📊 Rank: ${userData.rank} Div ${userData.division}`;

    if (rankChanged) {
      resultMsg += `\n\n📈 THĂNG HẠNG!\nChúc mừng! Bạn đã lên ${userData.rank} Division ${userData.division}!`;
    }

    if (Math.random() < 0.1) {
      resultMsg += '\n\n🎁 Phần thưởng đặc biệt: Nhận được Bronze Pack!';
      setTimeout(async () => {
        const bonusPlayer = await generatePlayerWithAI('bronze');
        userData.players.push(bonusPlayer.id);
        saveUserData(senderID, userData);
        api.sendMessage(`🎁 Bonus: Nhận được cầu thủ ${bonusPlayer.name} (OVR ${bonusPlayer.ovr})!`, threadID);
      }, 1000);
    }

    api.sendMessage(resultMsg, threadID);
  }, 30000);
}

module.exports.handleReply = async function({ api, event, handleReply, getText }) {
  const { type, author } = handleReply;
  const { threadID, messageID, senderID } = event;
  let body = event.body || "";
  
  if (author != senderID) return;

  const reply = (msg) => api.sendMessage(msg, threadID, messageID);

  if (type === 'pack_menu') {
    const userData = getUserData(senderID);
    const packType = body.toLowerCase();
    
    if (!PACK_TYPES[packType]) {
      return reply("❌ Gói không hợp lệ! Chọn: bronze, silver, gold, premium, ultimate");
    }

    const packInfo = PACK_TYPES[packType];
    const packPrice = packInfo.fifa_price;

    if (userData.fifa_coins < packPrice) {
      return reply(`❌ Bạn không đủ ${packPrice.toLocaleString()} FIFA Coins! (Hiện có: ${userData.fifa_coins.toLocaleString()} FC)`);
    }

    userData.fifa_coins -= packPrice;

    const packOdds = packInfo.odds;
    let rand = Math.random() * 100;
    let cumulative = 0;
    let selectedType = "bronze";

    for (const [cardType, probability] of Object.entries(packOdds)) {
      cumulative += probability;
      if (rand <= cumulative) {
        selectedType = cardType;
        break;
      }
    }

    reply("📦 Đang mở pack... Vui lòng chờ...");

    setTimeout(async () => {
      const player = await generatePlayerWithAI(selectedType);
      userData.players.push(player.id);
      saveUserData(senderID, userData);

      const cardEmojis = {
        bronze: "🥉",
        silver: "🥈", 
        gold: "🥇",
        inform: "🔥",
        tots: "💙",
        icon: "💜",
        toty: "❤️",
        moments: "💎"
      };

      const resultMsg = `🎉 ${cardEmojis[selectedType]} ${selectedType.toUpperCase()} CARD!\n\n` +
        `⚽ **${player.name}** (${player.position})\n` +
        `⭐ Overall: **${player.ovr}**\n` +
        `🏃 Pace: ${player.pace}\n` +
        `⚽ Shooting: ${player.shooting}\n` +
        `🎯 Passing: ${player.passing}\n` +
        `⚡ Dribbling: ${player.dribbling}\n` +
        `🛡️ Defending: ${player.defending}\n` +
        `💪 Physical: ${player.physical}\n` +
        `🌍 Nationality: ${player.nationality}\n` +
        `🏟️ Club: ${player.club}\n` +
        `💰 Market Value: ${player.market_value.toLocaleString()} FC\n\n` +
        `💰 Số dư: ${userData.fifa_coins.toLocaleString()} FC`;

      reply(resultMsg);
    }, 3000);
  }
  else if (type === 'formation_menu') {
    const formation = body.trim();
    if (!FORMATIONS[formation]) {
      return reply("❌ Sơ đồ không hợp lệ! Chọn: 4-4-2, 4-3-3, 3-5-2, 4-2-3-1");
    }

    const userData = getUserData(senderID);
    userData.formation = formation;
    userData.lineup = {};
    saveUserData(senderID, userData);

    reply(`✅ Đã chuyển sang sơ đồ **${formation}**!\n\n` +
      `📝 Mô tả: ${FORMATIONS[formation].description}\n` +
      `👥 Vị trí: ${FORMATIONS[formation].positions.join(' - ')}\n\n` +
      `🔧 Dùng 'fifa auto' để AI setup tự động!`);
  }
  else if (type === 'match_opponent') {
    const opponentType = body.toLowerCase();
    
    if (opponentType === 'ai' || opponentType === 'bot') {
      await startAIMatch(api, event);
    } else {
      reply("🔄 Tính năng PvP sẽ được cập nhật sớm!");
    }
  }
};

module.exports.run = async function({ api, event, args, getText, Users }) {
  const { threadID, messageID, senderID } = event;
  const reply = (msg) => api.sendMessage(msg, threadID, messageID);

  if (args.length === 0) {
    const helpMsg = "⚽ FIFA ONLINE 4 - HƯỚNG DẪN CHƠI\n\n" +
      "🎮 Lệnh Cơ Bản:\n" +
      "• fifa register - Đăng ký tài khoản\n" +
      "• fifa profile - Xem hồ sơ\n" +
      "• fifa shop - Cửa hàng\n" +
      "• fifa squad - Đội hình\n\n" +
      "⚔️ Trận Đấu:\n" +
      "• fifa match - Đấu với AI\n" +
      "• fifa ranking - Bảng xếp hạng\n\n" +
      "🏪 Thương Mại:\n" +
      "• fifa market - Chợ cầu thủ\n" +
      "• fifa auction - Đấu giá\n\n" +
      "🎯 Lệnh Nhanh:\n" +
      "• pack - Mở pack nhanh\n" +
      "• đội hình - Xem đội hình\n" +
      "• đấu - Tìm trận đấu";
    
    return reply(helpMsg);
  }

  const command = args[0].toLowerCase();

  switch (command) {
    case 'register':
      const userData = getUserData(senderID);
      
      if (userData.starter_claimed) {
        return reply("✅ Bạn đã có tài khoản FIFA Online 4!");
      }

      const starterPlayers = [];
      for (let i = 0; i < 3; i++) {
        const player = await generatePlayerWithAI('bronze');
        starterPlayers.push(player);
        userData.players.push(player.id);
      }

      userData.starter_claimed = true;
      userData.fifa_coins += 2000;
      saveUserData(senderID, userData);

      const starterText = starterPlayers.map(p => 
        `⭐ **${p.name}** (${p.position}) - OVR ${p.ovr}`
      ).join('\n');

      const userName = (await Users.getName(senderID)) || "Unknown";
      const welcomeMsg = `🎉 CHÀO MỪNG ĐẾN FIFA ONLINE 4!\n**${userName}** đã tạo tài khoản thành công!\n\n💰 FIFA Coins: ${userData.fifa_coins.toLocaleString()} FC\n⚽ Cầu thủ: ${userData.players.length} cầu thủ\n🏆 Rank: ${userData.rank} Div ${userData.division}\n\n🎁 Starter Pack:\n${starterText}\n\n🎮 Dùng 'fifa squad' để xem đội hình!`;

      reply(welcomeMsg);
      break;

    case 'profile':
      const profileData = getUserData(senderID);
      
      if (!profileData.starter_claimed) {
        return reply("❌ Bạn chưa đăng ký FIFA! Dùng 'fifa register'");
      }

      const totalMatches = profileData.matches_played;
      const winRate = totalMatches > 0 ? ((profileData.wins / totalMatches) * 100).toFixed(1) : 0;
      const filledPositions = Object.keys(profileData.lineup || {}).filter(pos => profileData.lineup[pos]).length;
      const profileUserName = (await Users.getName(senderID)) || "Unknown";

      const profileMsg = `⚽ Hồ Sơ FIFA - ${profileUserName}\n\n💰 FIFA Coins: ${profileData.fifa_coins.toLocaleString()} FC\n⚽ Cầu thủ: ${profileData.players.length}\n🏆 Rank: ${profileData.rank} Div ${profileData.division}\n\n📊 Thống Kê:\n**Trận:** ${totalMatches}\n**Thắng:** ${profileData.wins}\n**Hòa:** ${profileData.draws}\n**Thua:** ${profileData.losses}\n**Tỷ lệ thắng:** ${winRate}%\n\n⚽ Bàn thắng:\n**Ghi:** ${profileData.goals_for}\n**Thủng lưới:** ${profileData.goals_against}\n\n🎯 Điểm: ${profileData.points} điểm\n⚔️ Đội hình: ${profileData.formation} (${filledPositions}/11)`;

      reply(profileMsg);
      break;

    case 'shop':
      const shopData = getUserData(senderID);
      if (!shopData.starter_claimed) {
        return reply("❌ Bạn chưa đăng ký! Dùng 'fifa register'");
      }

      const shopMsg = "🏪 FIFA SHOP - POWERED BY AI\n\n" +
        `💰 **Số dư:** ${shopData.fifa_coins.toLocaleString()} FIFA Coins\n\n` +
        "📦 GÓI CẦU THỦ:\n" +
        "• Bronze Pack - 100 FC\n" +
        "• Silver Pack - 300 FC\n" +
        "• Gold Pack - 1,000 FC\n" +
        "• Premium Pack - 3,000 FC\n" +
        "• Ultimate Pack - 10,000 FC\n\n" +
        "🤖 AI Features:\n" +
        "• Cầu thủ được AI tạo ra\n" +
        "• Tên và stats độc đáo\n" +
        "• Không trùng lặp\n\n" +
        "💡 Phản hồi tin nhắn này với tên gói để mua!";

      return api.sendMessage(shopMsg, threadID, (err, info) => {
        global.client.handleReply.push({
          name: this.config.name,
          messageID: info.messageID,
          author: senderID,
          type: "pack_menu"
        });
      }, messageID);

    case 'squad':
      const squadData = getUserData(senderID);
      if (!squadData.starter_claimed) {
        return reply("❌ Bạn chưa đăng ký! Dùng 'fifa register'");
      }

      const players = loadData(PLAYERS_FILE, {});
      const formationPositions = FORMATIONS[squadData.formation].positions;
      const lineup = squadData.lineup || {};
      
      let formationText = "";
      let filled = 0;

      for (let i = 0; i < formationPositions.length; i++) {
        const position = formationPositions[i];
        const playerId = lineup[i.toString()];
        
        if (playerId && players[playerId]) {
          const player = players[playerId];
          formationText += `**${position}:** ${player.name} (OVR ${player.ovr})\n`;
          filled++;
        } else {
          formationText += `**${position}:** _Chưa chọn_\n`;
        }
      }

      let playersText = "";
      for (const playerId of squadData.players.slice(0, 10)) {
        if (players[playerId]) {
          const player = players[playerId];
          playersText += `⚽ **${player.name}** (${player.position}) - OVR ${player.ovr}\n`;
        }
      }
      
      if (squadData.players.length > 10) {
        playersText += `... và ${squadData.players.length - 10} cầu thủ khác\n`;
      }

      const squadUserName = (await Users.getName(senderID)) || "Unknown";
      const squadMsg = `⚔️ ĐỘI HÌNH - ${squadUserName}\n\n` +
        `**Sơ đồ:** ${squadData.formation}\n\n` +
        `👥 Đội hình chính:\n${formationText}\n` +
        `📊 Trạng thái: ${filled}/11 vị trí đã chọn\n\n` +
        `👥 Cầu thủ sở hữu:\n${playersText || "Không có"}\n\n` +
        `🔧 Chỉnh đội hình:\n` +
        `• fifa formation - Đổi sơ đồ\n` +
        `• fifa auto - AI setup tự động`;

      reply(squadMsg);
      break;

    case 'formation':
      const formationData = getUserData(senderID);
      if (!formationData.starter_claimed) {
        return reply("❌ Bạn chưa đăng ký! Dùng 'fifa register'");
      }

      let formationsMsg = "⚔️ CHỌN SƠ ĐỒ ĐỘI HÌNH\n\n" +
        "Chọn sơ đồ phù hợp với lối chơi của bạn:\n\n";
      
      for (const [formation, data] of Object.entries(FORMATIONS)) {
        formationsMsg += `**${formation}**\n${data.description}\n\n`;
      }
      
      formationsMsg += "💡 Phản hồi tin nhắn này với sơ đồ bạn muốn chọn!";

      return api.sendMessage(formationsMsg, threadID, (err, info) => {
        global.client.handleReply.push({
          name: this.config.name,
          messageID: info.messageID,
          author: senderID,
          type: "formation_menu"
        });
      }, messageID);

    case 'auto':
      const autoData = getUserData(senderID);
      if (!autoData.starter_claimed) {
        return reply("❌ Bạn chưa đăng ký! Dùng 'fifa register'");
      }

      if (autoData.players.length === 0) {
        return reply("❌ Bạn chưa có cầu thủ nào!");
      }

      const newLineup = autoSetupFormation(autoData);
      saveUserData(senderID, autoData);

      const playersData = loadData(PLAYERS_FILE, {});
      const autoFormationPositions = FORMATIONS[autoData.formation].positions;
      
      let autoFormationText = "";
      for (let i = 0; i < autoFormationPositions.length; i++) {
        const position = autoFormationPositions[i];
        const playerId = newLineup[i.toString()];
        
        if (playerId && playersData[playerId]) {
          const player = playersData[playerId];
          autoFormationText += `**${position}:** ${player.name} (OVR ${player.ovr})\n`;
        } else {
          autoFormationText += `**${position}:** _Chưa chọn_\n`;
        }
      }

      const autoMsg = `🤖 AI ĐÃ SETUP ĐỘI HÌNH!\n\n` +
        `AI đã tự động setup đội hình tối ưu cho sơ đồ **${autoData.formation}**:\n\n` +
        `👥 Đội hình đã setup:\n${autoFormationText}\n` +
        `✅ Hoàn thành: Đội hình đã được setup tự động! Bạn có thể bắt đầu đấu!`;

      reply(autoMsg);
      break;

    case 'match':
      const matchData = getUserData(senderID);
      if (!matchData.starter_claimed) {
        return reply("❌ Bạn chưa đăng ký! Dùng 'fifa register'");
      }

      const matchLineup = matchData.lineup || {};
      const matchFilledPositions = Object.keys(matchLineup).filter(pos => matchLineup[pos]).length;
      
      if (matchFilledPositions < 11) {
        return reply(`❌ Đội hình chưa đủ 11 cầu thủ! (Hiện có: ${matchFilledPositions}/11)\nDùng 'fifa auto' để AI setup tự động.`);
      }

      const matchMsg = "⚔️ TÌM TRẬN ĐẤU\n\n" +
        "Chọn đối thủ của bạn:\n\n" +
        "🤖 **AI** - Đấu với bot\n" +
        "👥 **PvP** - Đấu với người chơi (sắp có)\n\n" +
        "💡 Phản hồi tin nhắn này với 'ai' hoặc 'bot'!";

      return api.sendMessage(matchMsg, threadID, (err, info) => {
        global.client.handleReply.push({
          name: this.config.name,
          messageID: info.messageID,
          author: senderID,
          type: "match_opponent"
        });
      }, messageID);

    case 'ranking':
      const users = loadData(USERS_FILE, {});
      const rankedUsers = [];
      
      for (const [userID, data] of Object.entries(users)) {
        if (data.starter_claimed) {
          rankedUsers.push([parseInt(userID), data]);
        }
      }

      const rankOrder = { Elite: 6, Diamond: 5, Platinum: 4, Gold: 3, Silver: 2, Bronze: 1 };
      
      rankedUsers.sort((a, b) => {
        const [, dataA] = a;
        const [, dataB] = b;
        
        const rankA = rankOrder[dataA.rank] || 0;
        const rankB = rankOrder[dataB.rank] || 0;
        
        if (rankA !== rankB) return rankB - rankA;
        if (dataA.division !== dataB.division) return dataA.division - dataB.division;
        return dataB.points - dataA.points;
      });

      let rankingMsg = "🏆 BẢNG XẾP HẠNG FIFA ONLINE 4\n\n";
      
      for (let i = 0; i < Math.min(10, rankedUsers.length); i++) {
        const [userID, data] = rankedUsers[i];
        try {
          const name = (await Users.getName(userID)) || "Unknown";
          
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `**#${i+1}**`;
          
          rankingMsg += `${medal} **${name}**\n`;
          rankingMsg += `   ${data.rank} Div ${data.division} • ${data.points} điểm\n`;
          rankingMsg += `   ${data.wins}-${data.draws}-${data.losses} • ${data.fifa_coins.toLocaleString()} FC\n\n`;
        } catch (error) {
          continue;
        }
      }
      
      rankingMsg += "🔄 Reset hàng tuần vào Chủ nhật";
      reply(rankingMsg);
      break;

    case 'market':
      reply("🏪 CHỢ CẦU THỦ FIFA\n\n" +
        "💼 Mua bán và đấu giá cầu thủ với người chơi khác\n\n" +
        "🔨 Đấu Giá - Đặt cầu thủ lên đấu giá cho người khác đấu thầu\n" +
        "💱 Chuyển Nhượng - Bán cầu thủ với giá cố định\n" +
        "📊 Xem Đấu Giá - Xem các đấu giá đang hoạt động\n\n" +
        "🔄 Tính năng sẽ được cập nhật sớm!");
      break;

    default:
      reply("❌ Lệnh không hợp lệ! Dùng 'fifa' để xem hướng dẫn.");
  }
};

module.exports.onLoad = function() {
  ensureDataFolder();
};
