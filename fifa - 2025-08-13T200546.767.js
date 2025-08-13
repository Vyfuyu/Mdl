
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Credit protection
const originalCredit = "waguri kaori";
const creditCheck = () => {
    const currentCredit = "waguri kaori";
    if (currentCredit !== originalCredit) {
        return false;
    }
    return true;
};

module.exports.config = {
    name: "fifa",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "waguri kaori",
    description: "Game FIFA Online 4 với AI",
    commandCategory: "Game",
    usages: "[menu/batdau/shop/pack/doihinh/rank/napthe]",
    cooldowns: 3,
    dependencies: {
        "axios": ""
    }
};

const DEEPSEEK_API = "sk-eb7832d105d949bf8821a49614ea6004";

// Tạo cầu thủ bằng AI
async function createPlayerWithAI(rarity = "common") {
    try {
        const rarityPrompts = {
            common: "tạo cầu thủ bóng đá thông thường với chỉ số từ 60-75",
            rare: "tạo cầu thủ bóng đá hiếm với chỉ số từ 76-85", 
            epic: "tạo cầu thủ bóng đá epic với chỉ số từ 86-92",
            legendary: "tạo cầu thủ bóng đá huyền thoại với chỉ số từ 93-99"
        };

        const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
            model: "deepseek-chat",
            messages: [{
                role: "user",
                content: `${rarityPrompts[rarity]}. Trả về JSON format: {"name":"Tên cầu thủ","position":"Vị trí","overall":số_chỉ_số_tổng,"pace":số,"shooting":số,"passing":số,"dribbling":số,"defending":số,"physical":số,"nationality":"Quốc tịch","age":tuổi,"rarity":"${rarity}"}`
            }],
            temperature: 0.8
        }, {
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_API}`,
                'Content-Type': 'application/json'
            }
        });

        const content = response.data.choices[0].message.content;
        return JSON.parse(content.match(/\{[\s\S]*\}/)[0]);
    } catch (error) {
        // Fallback nếu API lỗi
        const names = ["Nguyễn Văn A", "Lê Minh B", "Trần Đức C", "Phạm Hoàng D"];
        const positions = ["ST", "CM", "CB", "GK"];
        const nationalities = ["Vietnam", "Brazil", "Argentina", "France"];
        
        const baseStats = {
            common: 65,
            rare: 80, 
            epic: 88,
            legendary: 95
        };

        return {
            name: names[Math.floor(Math.random() * names.length)],
            position: positions[Math.floor(Math.random() * positions.length)],
            overall: baseStats[rarity] + Math.floor(Math.random() * 10),
            pace: baseStats[rarity] + Math.floor(Math.random() * 15),
            shooting: baseStats[rarity] + Math.floor(Math.random() * 15),
            passing: baseStats[rarity] + Math.floor(Math.random() * 15),
            dribbling: baseStats[rarity] + Math.floor(Math.random() * 15),
            defending: baseStats[rarity] + Math.floor(Math.random() * 15),
            physical: baseStats[rarity] + Math.floor(Math.random() * 15),
            nationality: nationalities[Math.floor(Math.random() * nationalities.length)],
            age: 18 + Math.floor(Math.random() * 17),
            rarity: rarity
        };
    }
}

// Setup đội hình bằng AI
async function setupFormationAI(players) {
    try {
        const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
            model: "deepseek-chat", 
            messages: [{
                role: "user",
                content: `Với danh sách cầu thủ: ${JSON.stringify(players)}, hãy setup đội hình tốt nhất 4-3-3. Trả về JSON: {"formation":"4-3-3","lineup":{"GK":"tên cầu thủ","CB1":"","CB2":"","LB":"","RB":"","CM1":"","CM2":"","CM3":"","LW":"","ST":"","RW":""}}`
            }],
            temperature: 0.3
        }, {
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_API}`,
                'Content-Type': 'application/json'
            }
        });

        const content = response.data.choices[0].message.content;
        return JSON.parse(content.match(/\{[\s\S]*\}/)[0]);
    } catch (error) {
        return null;
    }
}

// Mô phỏng trận đấu
async function simulateMatch(team1, team2, isAI = false) {
    const team1Power = team1.reduce((sum, p) => sum + p.overall, 0) / team1.length;
    const team2Power = team2.reduce((sum, p) => sum + p.overall, 0) / team2.length;
    
    const diff = team1Power - team2Power;
    let team1WinChance = 50 + (diff * 2);
    team1WinChance = Math.max(10, Math.min(90, team1WinChance));
    
    const random = Math.random() * 100;
    let result;
    
    if (random < team1WinChance) {
        result = { winner: 1, score: `${Math.floor(Math.random() * 3) + 1}-${Math.floor(Math.random() * 2)}` };
    } else {
        result = { winner: 2, score: `${Math.floor(Math.random() * 2)}-${Math.floor(Math.random() * 3) + 1}` };
    }
    
    return result;
}

module.exports.run = async function({ api, event, args, Users, Currencies }) {
    if (!creditCheck()) {
        return api.sendMessage("❌ Module đã bị thay đổi credit không được phép!", event.threadID);
    }

    const { senderID, threadID, messageID } = event;
    const cacheDir = path.join(__dirname, 'cache', 'fifa');
    
    // Tạo thư mục cache
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    const userDataFile = path.join(cacheDir, `${senderID}.json`);
    const globalDataFile = path.join(cacheDir, 'global.json');
    const matchesFile = path.join(cacheDir, 'matches.json');
    
    // Khởi tạo data user
    let userData = {};
    if (fs.existsSync(userDataFile)) {
        userData = JSON.parse(fs.readFileSync(userDataFile, 'utf8'));
    } else {
        userData = {
            coins: 1000,
            fifaCoins: 0,
            players: [],
            formation: null,
            rank: 1000,
            wins: 0,
            losses: 0,
            packs: 0,
            lastDaily: 0,
            cards: []
        };
        fs.writeFileSync(userDataFile, JSON.stringify(userData, null, 2));
    }

    // Global data
    let globalData = {};
    if (fs.existsSync(globalDataFile)) {
        globalData = JSON.parse(fs.readFileSync(globalDataFile, 'utf8'));
    } else {
        globalData = {
            season: 1,
            seasonEnd: Date.now() + (7 * 24 * 60 * 60 * 1000),
            activeMatches: {},
            marketplace: [],
            leaderboard: []
        };
        fs.writeFileSync(globalDataFile, JSON.stringify(globalData, null, 2));
    }

    if (!args[0]) {
        return api.sendMessage(
            "⚽ FIFA ONLINE 4 - MENU CHÍNH\n" +
            "━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "🎮 LỆNH CƠ BẢN:\n" +
            "• fifa batdau - Bắt đầu chơi game\n" +
            "• fifa shop - Cửa hàng mua pack\n" +
            "• fifa pack - Mở pack cầu thủ\n" +
            "• fifa doihinh - Quản lý đội hình\n" +
            "• fifa rank - Xem bảng xếp hạng\n" +
            "• fifa trandau - Tìm trận đấu\n" +
            "• fifa napthe - Nạp thẻ FIFA coins\n\n" +
            "💰 THÔNG TIN CỦA BẠN:\n" +
            `💎 Aoyama Coins: ${(await Currencies.getData(senderID)).money}\n` +
            `⚽ FIFA Coins: ${userData.fifaCoins}\n` +
            `🏆 Rank: ${userData.rank}\n` +
            `👥 Cầu thủ: ${userData.players.length}\n` +
            `📦 Packs: ${userData.packs}\n\n` +
            "━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "💡 Credit: waguri kaori", 
            threadID, messageID
        );
    }

    switch (args[0].toLowerCase()) {
        case "batdau":
            if (userData.players.length === 0) {
                // Tặng đội hình ban đầu
                const starterPack = [];
                for (let i = 0; i < 11; i++) {
                    const player = await createPlayerWithAI("common");
                    starterPack.push(player);
                }
                userData.players = starterPack;
                userData.packs = 3;
                fs.writeFileSync(userDataFile, JSON.stringify(userData, null, 2));
                
                return api.sendMessage(
                    "🎉 CHÀO MỪNG ĐĐẾ FIFA ONLINE 4!\n\n" +
                    "🎁 Quà tặng người chơi mới:\n" +
                    "• 11 cầu thủ starter\n" +
                    "• 3 packs miễn phí\n" +
                    "• 1000 FIFA coins\n\n" +
                    "📋 Hướng dẫn:\n" +
                    "1. fifa doihinh - Setup đội hình\n" +
                    "2. fifa pack - Mở pack nhận thêm cầu thủ\n" +
                    "3. fifa trandau - Bắt đầu đấu rank\n\n" +
                    "⚽ Chúc bạn chơi vui vẻ!\n\n" +
                    "💡 Credit: waguri kaori",
                    threadID, messageID
                );
            } else {
                return api.sendMessage("⚽ Bạn đã bắt đầu rồi! Dùng 'fifa' để xem menu.", threadID, messageID);
            }

        case "shop":
            return api.sendMessage(
                "🏪 SHOP FIFA ONLINE 4\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━\n" +
                "📦 CÁC LOẠI PACK:\n\n" +
                "1️⃣ Bronze Pack - 500 FIFA coins\n" +
                "   • 3 cầu thủ common (60-75 OVR)\n" +
                "   • Tỷ lệ: 90% Common, 10% Rare\n\n" +
                "2️⃣ Silver Pack - 1500 FIFA coins\n" +
                "   • 5 cầu thủ rare (76-85 OVR)\n" +
                "   • Tỷ lệ: 70% Rare, 25% Epic, 5% Legendary\n\n" +
                "3️⃣ Gold Pack - 3000 FIFA coins\n" +
                "   • 7 cầu thủ epic+ (86-99 OVR)\n" +
                "   • Tỷ lệ: 50% Epic, 40% Legendary, 10% Icon\n\n" +
                "💳 THẺ NẠP (mua bằng Aoyama coins):\n" +
                "• Thẻ 10K - 50,000 Aoyama = 1,000 FIFA\n" +
                "• Thẻ 50K - 200,000 Aoyama = 5,000 FIFA\n" +
                "• Thẻ 100K - 350,000 Aoyama = 10,000 FIFA\n\n" +
                "🛒 Cách mua:\n" +
                "• fifa mua bronze/silver/gold\n" +
                "• fifa napthe 10k/50k/100k\n\n" +
                `💰 FIFA coins của bạn: ${userData.fifaCoins}\n\n` +
                "💡 Credit: waguri kaori",
                threadID, messageID
            );

        case "mua":
            if (!args[1]) {
                return api.sendMessage("⚠️ Cách dùng: fifa mua [bronze/silver/gold]", threadID, messageID);
            }

            const packPrices = { bronze: 500, silver: 1500, gold: 3000 };
            const packType = args[1].toLowerCase();
            
            if (!packPrices[packType]) {
                return api.sendMessage("❌ Loại pack không hợp lệ! (bronze/silver/gold)", threadID, messageID);
            }

            if (userData.fifaCoins < packPrices[packType]) {
                return api.sendMessage(
                    `💸 Không đủ FIFA coins!\n` +
                    `Cần: ${packPrices[packType]} FIFA coins\n` +
                    `Có: ${userData.fifaCoins} FIFA coins\n\n` +
                    "💡 Dùng 'fifa napthe' để nạp thêm!",
                    threadID, messageID
                );
            }

            userData.fifaCoins -= packPrices[packType];
            userData.packs++;
            fs.writeFileSync(userDataFile, JSON.stringify(userData, null, 2));

            return api.sendMessage(
                `✅ Mua thành công ${packType} pack!\n\n` +
                `💰 FIFA coins còn lại: ${userData.fifaCoins}\n` +
                `📦 Tổng packs: ${userData.packs}\n\n` +
                "🎁 Dùng 'fifa pack' để mở pack!\n\n" +
                "💡 Credit: waguri kaori",
                threadID, messageID
            );

        case "pack":
            if (userData.packs <= 0) {
                return api.sendMessage(
                    "📦 Bạn không có pack nào!\n\n" +
                    "🛒 Mua pack tại: fifa shop\n" +
                    "💡 Credit: waguri kaori",
                    threadID, messageID
                );
            }

            // Xác định loại pack random
            const packTypes = ["bronze", "silver", "gold"];
            const randomPackType = packTypes[Math.floor(Math.random() * packTypes.length)];
            
            const packSizes = { bronze: 3, silver: 5, gold: 7 };
            const packSize = packSizes[randomPackType];
            
            userData.packs--;
            let packResult = `🎁 MỞ PACK ${randomPackType.toUpperCase()}!\n\n`;
            
            for (let i = 0; i < packSize; i++) {
                const rarities = {
                    bronze: ["common", "common", "rare"],
                    silver: ["rare", "rare", "epic", "legendary"],
                    gold: ["epic", "legendary", "legendary", "legendary"]
                };
                
                const rarity = rarities[randomPackType][Math.floor(Math.random() * rarities[randomPackType].length)];
                const player = await createPlayerWithAI(rarity);
                userData.players.push(player);
                
                const rarityEmojis = {
                    common: "⚪",
                    rare: "🔵", 
                    epic: "🟣",
                    legendary: "🟡"
                };
                
                packResult += `${rarityEmojis[rarity]} ${player.name} (${player.position}) - ${player.overall} OVR\n`;
            }
            
            fs.writeFileSync(userDataFile, JSON.stringify(userData, null, 2));
            
            packResult += `\n📦 Packs còn lại: ${userData.packs}\n`;
            packResult += `👥 Tổng cầu thủ: ${userData.players.length}\n\n`;
            packResult += "💡 Credit: waguri kaori";
            
            return api.sendMessage(packResult, threadID, messageID);

        case "doihinh":
            if (userData.players.length < 11) {
                return api.sendMessage("❌ Cần ít nhất 11 cầu thủ để tạo đội hình!", threadID, messageID);
            }

            if (!args[1]) {
                return api.sendMessage(
                    "⚙️ QUẢN LÝ ĐỘI HÌNH\n\n" +
                    "🔧 Lệnh:\n" +
                    "• fifa doihinh auto - AI setup tự động\n" +
                    "• fifa doihinh xem - Xem đội hình hiện tại\n" +
                    "• fifa doihinh list - Danh sách cầu thủ\n\n" +
                    "💡 Credit: waguri kaori",
                    threadID, messageID
                );
            }

            switch (args[1].toLowerCase()) {
                case "auto":
                    const formation = await setupFormationAI(userData.players);
                    if (formation) {
                        userData.formation = formation;
                        fs.writeFileSync(userDataFile, JSON.stringify(userData, null, 2));
                        
                        return api.sendMessage(
                            "✅ AI đã setup đội hình tự động!\n\n" +
                            `📋 Đội hình: ${formation.formation}\n\n` +
                            "⚽ Xem chi tiết: fifa doihinh xem\n\n" +
                            "💡 Credit: waguri kaori",
                            threadID, messageID
                        );
                    } else {
                        return api.sendMessage("❌ Lỗi AI! Vui lòng thử lại sau.", threadID, messageID);
                    }

                case "xem":
                    if (!userData.formation) {
                        return api.sendMessage("⚠️ Chưa có đội hình! Dùng 'fifa doihinh auto' để tạo.", threadID, messageID);
                    }

                    let formationDisplay = `⚽ ĐỘI HÌNH CỦA BẠN\n`;
                    formationDisplay += `📋 Sơ đồ: ${userData.formation.formation}\n\n`;
                    
                    for (const [position, playerName] of Object.entries(userData.formation.lineup)) {
                        const player = userData.players.find(p => p.name === playerName);
                        if (player) {
                            formationDisplay += `${position}: ${player.name} (${player.overall} OVR)\n`;
                        }
                    }
                    
                    formationDisplay += "\n💡 Credit: waguri kaori";
                    return api.sendMessage(formationDisplay, threadID, messageID);

                case "list":
                    let playerList = "👥 DANH SÁCH CẦU THỦ\n\n";
                    userData.players.forEach((player, index) => {
                        const rarityEmojis = {
                            common: "⚪",
                            rare: "🔵",
                            epic: "🟣", 
                            legendary: "🟡"
                        };
                        playerList += `${index + 1}. ${rarityEmojis[player.rarity]} ${player.name} (${player.position}) - ${player.overall} OVR\n`;
                    });
                    playerList += "\n💡 Credit: waguri kaori";
                    return api.sendMessage(playerList, threadID, messageID);
            }
            break;

        case "napthe":
            if (!args[1]) {
                return api.sendMessage(
                    "💳 NẠP THẺ FIFA COINS\n\n" +
                    "💰 CÁC LOẠI THẺ:\n" +
                    "• fifa napthe 10k - 50,000 Aoyama coins\n" +
                    "• fifa napthe 50k - 200,000 Aoyama coins  \n" +
                    "• fifa napthe 100k - 350,000 Aoyama coins\n\n" +
                    `💎 Aoyama coins của bạn: ${(await Currencies.getData(senderID)).money}\n\n` +
                    "💡 Credit: waguri kaori",
                    threadID, messageID
                );
            }

            const cardTypes = {
                "10k": { price: 50000, fifa: 1000 },
                "50k": { price: 200000, fifa: 5000 },
                "100k": { price: 350000, fifa: 10000 }
            };

            const cardType = args[1].toLowerCase();
            if (!cardTypes[cardType]) {
                return api.sendMessage("❌ Loại thẻ không hợp lệ! (10k/50k/100k)", threadID, messageID);
            }

            const userMoney = (await Currencies.getData(senderID)).money;
            if (userMoney < cardTypes[cardType].price) {
                return api.sendMessage(
                    `💸 Không đủ Aoyama coins!\n` +
                    `Cần: ${cardTypes[cardType].price.toLocaleString()}\n` +
                    `Có: ${userMoney.toLocaleString()}\n\n` +
                    "💰 Kiếm thêm coin bằng các lệnh khác!",
                    threadID, messageID
                );
            }

            // Tạo mã code
            const code = Math.random().toString(36).substring(2, 10).toUpperCase();
            const cardData = {
                code: code,
                value: cardTypes[cardType].fifa,
                buyer: senderID,
                created: Date.now(),
                used: false
            };

            userData.cards.push(cardData);
            await Currencies.decreaseMoney(senderID, cardTypes[cardType].price);
            fs.writeFileSync(userDataFile, JSON.stringify(userData, null, 2));

            return api.sendMessage(
                `✅ Mua thành công thẻ ${cardType}!\n\n` +
                `🎫 Mã code: ${code}\n` +
                `💰 Giá trị: ${cardTypes[cardType].fifa} FIFA coins\n\n` +
                `🔄 Sử dụng: fifa sudung ${code}\n\n` +
                "💡 Credit: waguri kaori",
                threadID, messageID
            );

        case "sudung":
            if (!args[1]) {
                return api.sendMessage("⚠️ Cách dùng: fifa sudung <code>", threadID, messageID);
            }

            const inputCode = args[1].toUpperCase();
            const card = userData.cards.find(c => c.code === inputCode && !c.used);
            
            if (!card) {
                return api.sendMessage("❌ Mã code không hợp lệ hoặc đã được sử dụng!", threadID, messageID);
            }

            card.used = true;
            userData.fifaCoins += card.value;
            fs.writeFileSync(userDataFile, JSON.stringify(userData, null, 2));

            return api.sendMessage(
                `✅ Nạp thành công!\n\n` +
                `💰 Nhận được: ${card.value} FIFA coins\n` +
                `⚽ Tổng FIFA coins: ${userData.fifaCoins}\n\n` +
                "💡 Credit: waguri kaori",
                threadID, messageID
            );

        case "trandau":
            if (!userData.formation) {
                return api.sendMessage("⚠️ Cần setup đội hình trước! Dùng 'fifa doihinh auto'", threadID, messageID);
            }

            if (globalData.activeMatches[senderID]) {
                return api.sendMessage("⚽ Bạn đang trong trận đấu! Chờ kết quả...", threadID, messageID);
            }

            // Bắt đầu trận đấu
            const opponent = await createOpponentTeam();
            globalData.activeMatches[senderID] = {
                opponent: opponent,
                startTime: Date.now(),
                threadID: threadID
            };
            fs.writeFileSync(globalDataFile, JSON.stringify(globalData, null, 2));

            api.sendMessage(
                `⚽ TRẬN ĐẤU BẮT ĐẦU!\n\n` +
                `🆚 ${opponent.name}\n` +
                `💪 Sức mạnh: ${opponent.power}\n` +
                `🏆 Rank: ${opponent.rank}\n\n` +
                `⏱️ Trận đấu sẽ kết thúc sau 60 giây...\n\n` +
                "💡 Credit: waguri kaori",
                threadID, messageID
            );

            // Kết thúc trận sau 60s
            setTimeout(async () => {
                await endMatch(senderID, api);
            }, 60000);
            break;

        case "rank":
            // Cập nhật bảng xếp hạng
            globalData.leaderboard = globalData.leaderboard.filter(p => p.id !== senderID);
            globalData.leaderboard.push({
                id: senderID,
                name: (await Users.getInfo(senderID)).name,
                rank: userData.rank,
                wins: userData.wins,
                losses: userData.losses
            });
            globalData.leaderboard.sort((a, b) => b.rank - a.rank);
            fs.writeFileSync(globalDataFile, JSON.stringify(globalData, null, 2));

            let rankDisplay = `🏆 BẢNG XẾP HẠNG FIFA\n`;
            rankDisplay += `🏅 Mùa giải: ${globalData.season}\n\n`;
            
            globalData.leaderboard.slice(0, 10).forEach((player, index) => {
                const medal = index < 3 ? ["🥇", "🥈", "🥉"][index] : `${index + 1}.`;
                rankDisplay += `${medal} ${player.name} - ${player.rank} pts (${player.wins}W-${player.losses}L)\n`;
            });

            const userRankIndex = globalData.leaderboard.findIndex(p => p.id === senderID);
            if (userRankIndex >= 10) {
                rankDisplay += `\n📍 Hạng của bạn: ${userRankIndex + 1}\n`;
            }

            rankDisplay += `\n⏰ Mùa kết thúc: ${new Date(globalData.seasonEnd).toLocaleString()}\n`;
            rankDisplay += "\n💡 Credit: waguri kaori";
            
            return api.sendMessage(rankDisplay, threadID, messageID);

        default:
            return api.sendMessage("❌ Lệnh không hợp lệ! Dùng 'fifa' để xem menu.", threadID, messageID);
    }
};

// Tạo đội bù AI
async function createOpponentTeam() {
    const names = ["Real Madrid", "Barcelona", "Manchester United", "Liverpool", "PSG", "Bayern Munich"];
    const name = names[Math.floor(Math.random() * names.length)] + " AI";
    const power = 70 + Math.floor(Math.random() * 30);
    const rank = 800 + Math.floor(Math.random() * 400);
    
    return { name, power, rank };
}

// Kết thúc trận đấu
async function endMatch(userID, api) {
    const globalDataFile = path.join(__dirname, 'cache', 'fifa', 'global.json');
    const userDataFile = path.join(__dirname, 'cache', 'fifa', `${userID}.json`);
    
    let globalData = JSON.parse(fs.readFileSync(globalDataFile, 'utf8'));
    let userData = JSON.parse(fs.readFileSync(userDataFile, 'utf8'));
    
    const match = globalData.activeMatches[userID];
    if (!match) return;
    
    // Mô phỏng kết quả
    const userPower = userData.players.slice(0, 11).reduce((sum, p) => sum + p.overall, 0) / 11;
    const opponentPower = match.opponent.power;
    
    const winChance = Math.max(20, Math.min(80, 50 + (userPower - opponentPower) * 2));
    const isWin = Math.random() * 100 < winChance;
    
    let result = `⚽ KẾT QUÀ TRẬN ĐẤU\n\n`;
    
    if (isWin) {
        const score1 = Math.floor(Math.random() * 3) + 1;
        const score2 = Math.floor(Math.random() * score1);
        result += `🎉 THẮNG! ${score1}-${score2}\n`;
        result += `🆚 ${match.opponent.name}\n\n`;
        
        userData.wins++;
        userData.rank += 25;
        userData.fifaCoins += 100;
        
        // Tỷ lệ nhận pack
        if (Math.random() < 0.3) {
            userData.packs++;
            result += `🎁 Nhận được 1 pack!\n`;
        }
        
        result += `💰 +100 FIFA coins\n`;
        result += `📈 +25 rank points\n`;
    } else {
        const score1 = Math.floor(Math.random() * 2);
        const score2 = Math.floor(Math.random() * 3) + 1;
        result += `😢 THUA! ${score1}-${score2}\n`;
        result += `🆚 ${match.opponent.name}\n\n`;
        
        userData.losses++;
        userData.rank = Math.max(0, userData.rank - 15);
        userData.fifaCoins += 25;
        
        result += `💰 +25 FIFA coins\n`;
        result += `📉 -15 rank points\n`;
    }
    
    result += `\n🏆 Rank hiện tại: ${userData.rank}\n`;
    result += `📊 Thành tích: ${userData.wins}W-${userData.losses}L\n\n`;
    result += "💡 Credit: waguri kaori";
    
    delete globalData.activeMatches[userID];
    fs.writeFileSync(globalDataFile, JSON.stringify(globalData, null, 2));
    fs.writeFileSync(userDataFile, JSON.stringify(userData, null, 2));
    
    api.sendMessage(result, match.threadID);
}

module.exports.handleEvent = async function({ api, event, Users }) {
    if (!creditCheck()) return;
    
    // Check season reset
    const globalDataFile = path.join(__dirname, 'cache', 'fifa', 'global.json');
    if (fs.existsSync(globalDataFile)) {
        let globalData = JSON.parse(fs.readFileSync(globalDataFile, 'utf8'));
        
        if (Date.now() > globalData.seasonEnd) {
            // Reset season
            globalData.season++;
            globalData.seasonEnd = Date.now() + (7 * 24 * 60 * 60 * 1000);
            globalData.leaderboard = [];
            
            // Reset user ranks
            const cacheDir = path.join(__dirname, 'cache', 'fifa');
            if (fs.existsSync(cacheDir)) {
                const files = fs.readdirSync(cacheDir);
                files.forEach(file => {
                    if (file.endsWith('.json') && file !== 'global.json' && file !== 'matches.json') {
                        const userData = JSON.parse(fs.readFileSync(path.join(cacheDir, file), 'utf8'));
                        userData.rank = 1000;
                        userData.wins = 0;
                        userData.losses = 0;
                        fs.writeFileSync(path.join(cacheDir, file), JSON.stringify(userData, null, 2));
                    }
                });
            }
            
            fs.writeFileSync(globalDataFile, JSON.stringify(globalData, null, 2));
            
            // Announce new season
            api.sendMessage(
                `🎉 MÙA GIẢI MỚI BẮT ĐẦU!\n\n` +
                `🏆 Mùa giải ${globalData.season}\n` +
                `🔄 Tất cả rank đã được reset về 1000\n` +
                `⏰ Thời gian: 7 ngày\n\n` +
                `🎮 Bắt đầu leo rank ngay: fifa trandau\n\n` +
                "💡 Credit: waguri kaori",
                event.threadID
            );
        }
    }
};

// Lệnh noprefix
module.exports.handleEvent = async function({ api, event }) {
    if (!creditCheck()) return;
    
    const quickCommands = {
        "fifa": "fifa",
        "pack": "fifa pack", 
        "đấu": "fifa trandau",
        "rank fifa": "fifa rank"
    };
    
    if (quickCommands[event.body?.toLowerCase()]) {
        const args = quickCommands[event.body.toLowerCase()].split(' ');
        const command = args.shift();
        
        if (command === "fifa") {
            return this.run({ api, event, args, Users: global.data.users, Currencies: global.data.currencies });
        }
    }
};
