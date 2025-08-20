
const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs-extra');
const axios = require('axios');

module.exports.config = {
    name: "xocdia",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Kaori Waguri",
    description: "🎰 Game xóc đĩa VIP với nhiều tính năng đặc biệt và giao diện canvas đẹp mắt!",
    commandCategory: "GAME VIP",
    usages: "[tài/xỉu/lẻ/chẵn] [số tiền] hoặc [create/join/start/info/leave]",
    cooldowns: 3,
    dependencies: {
        "canvas": "",
        "axios": ""
    }
};

module.exports.onLoad = async function() {
    // Tạo thư mục cache nếu chưa có
    const cacheDir = __dirname + '/cache';
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    // Tải font chữ đẹp
    try {
        const fontPath = __dirname + '/cache/font.ttf';
        if (!fs.existsSync(fontPath)) {
            const fontResponse = await axios.get('https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Bold.ttf', {
                responseType: 'arraybuffer'
            });
            fs.writeFileSync(fontPath, fontResponse.data);
        }
        registerFont(fontPath, { family: 'Roboto' });
    } catch (error) {
        console.log('Font loading error:', error.message);
    }
    
    console.log("🎰 XOC DIA VIP GAME LOADED SUCCESSFULLY! 🎰");
};

// Hàm tạo canvas cho kết quả xóc đĩa
async function createXocDiaCanvas(result, coins, isWin, betAmount, winAmount) {
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');
    
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, 800, 600);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 600);
    
    // Vẽ khung viền đẹp
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 8;
    ctx.setLineDash([20, 10]);
    ctx.strokeRect(20, 20, 760, 560);
    ctx.setLineDash([]);
    
    // Title
    ctx.font = 'bold 48px Roboto, Arial';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText('🎰 XÓC ĐĨA VIP 🎰', 400, 80);
    
    // Vẽ đĩa xóc
    const centerX = 400;
    const centerY = 250;
    const plateRadius = 120;
    
    // Đĩa chính
    const plateGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, plateRadius);
    plateGradient.addColorStop(0, '#8b4513');
    plateGradient.addColorStop(1, '#654321');
    ctx.fillStyle = plateGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, plateRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Vẽ 4 xu
    const coinPositions = [
        { x: centerX - 40, y: centerY - 40 },
        { x: centerX + 40, y: centerY - 40 },
        { x: centerX - 40, y: centerY + 40 },
        { x: centerX + 40, y: centerY + 40 }
    ];
    
    for (let i = 0; i < 4; i++) {
        const pos = coinPositions[i];
        const coinResult = coins[i];
        
        // Bóng đổ
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(pos.x + 2, pos.y + 2, 25, 0, 2 * Math.PI);
        ctx.fill();
        
        // Xu
        const coinGradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 25);
        if (coinResult === 'sấp') {
            coinGradient.addColorStop(0, '#ffd700');
            coinGradient.addColorStop(1, '#ffb347');
        } else {
            coinGradient.addColorStop(0, '#c0c0c0');
            coinGradient.addColorStop(1, '#808080');
        }
        ctx.fillStyle = coinGradient;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 25, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Text trên xu
        ctx.font = 'bold 12px Roboto, Arial';
        ctx.fillStyle = coinResult === 'sấp' ? '#000' : '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(coinResult === 'sấp' ? 'SẤP' : 'NGỬA', pos.x, pos.y + 4);
    }
    
    // Kết quả
    ctx.font = 'bold 36px Roboto, Arial';
    ctx.fillStyle = isWin ? '#00ff00' : '#ff4757';
    ctx.textAlign = 'center';
    ctx.fillText(`KẾT QUẢ: ${result.toUpperCase()}`, 400, 400);
    
    // Thông tin cược
    ctx.font = 'bold 24px Roboto, Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Tiền cược: ${betAmount.toLocaleString()}$`, 400, 450);
    
    if (isWin) {
        ctx.fillStyle = '#00ff00';
        ctx.fillText(`🎉 THẮNG: +${winAmount.toLocaleString()}$ 🎉`, 400, 480);
    } else {
        ctx.fillStyle = '#ff4757';
        ctx.fillText(`💸 THUA: -${betAmount.toLocaleString()}$ 💸`, 400, 480);
    }
    
    // Thống kê
    const sapCount = coins.filter(c => c === 'sấp').length;
    const nguaCount = 4 - sapCount;
    
    ctx.font = 'bold 20px Roboto, Arial';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`Sấp: ${sapCount} | Ngửa: ${nguaCount}`, 400, 520);
    
    return canvas.toBuffer();
}

// Hàm tạo bàn chơi nhóm
function createGameRoom(threadID, authorID, betAmount) {
    if (!global.moduleData.xocdia) global.moduleData.xocdia = new Map();
    
    global.moduleData.xocdia.set(threadID, {
        author: authorID,
        betAmount: betAmount,
        players: [{ id: authorID, bet: null }],
        status: "waiting", // waiting, playing, finished
        startTime: Date.now(),
        round: 1
    });
}

module.exports.run = async function({ api, event, args, Currencies, Users }) {
    const { senderID, threadID, messageID } = event;
    
    if (!global.moduleData.xocdia) global.moduleData.xocdia = new Map();
    
    // Lệnh quản lý phòng chơi
    if (["create", "tạo"].includes(args[0]?.toLowerCase())) {
        if (global.moduleData.xocdia.has(threadID)) {
            return api.sendMessage("⚠️ Đã có phòng xóc đĩa trong nhóm này rồi!", threadID, messageID);
        }
        
        const betAmount = parseInt(args[1]);
        if (!betAmount || betAmount < 1000) {
            return api.sendMessage("💰 Vui lòng nhập số tiền cược tối thiểu 1000$\n📝 Cách dùng: xocdia create [số tiền]", threadID, messageID);
        }
        
        const userData = await Currencies.getData(senderID);
        if (userData.money < betAmount) {
            return api.sendMessage("💸 Bạn không đủ tiền để tạo phòng!", threadID, messageID);
        }
        
        createGameRoom(threadID, senderID, betAmount);
        await Currencies.decreaseMoney(senderID, betAmount);
        
        const setupMessage = `🎰 PHÒNG XÓC ĐĨA VIP ĐÃ MỞ 🎰

👑 Chủ phòng: ${await Users.getNameUser(senderID)}
💰 Tiền cược: ${betAmount.toLocaleString()}$
👥 Số người chơi: 1/8
⏰ Thời gian: ${new Date().toLocaleString()}

🎯 CÁCH CHƠI:
• xocdia join - Tham gia phòng
• xocdia start - Bắt đầu game (chủ phòng)
• xocdia info - Xem thông tin phòng
• xocdia leave - Rời phòng

🎲 CÁC LOẠI CƯỢC:
• Tài (3-4 sấp) | Xỉu (0-1 sấp)
• Chẵn (0,2,4 sấp) | Lẻ (1,3 sấp)

📊 TỶ LỆ THẮNG: x2 tiền cược`;
        
        return api.sendMessage(setupMessage, threadID, messageID);
    }
    
    if (["join", "tham gia"].includes(args[0]?.toLowerCase())) {
        const gameData = global.moduleData.xocdia.get(threadID);
        if (!gameData) {
            return api.sendMessage("❌ Chưa có phòng xóc đĩa nào! Dùng 'xocdia create [số tiền]' để tạo phòng", threadID, messageID);
        }
        
        if (gameData.players.find(p => p.id === senderID)) {
            return api.sendMessage("⚠️ Bạn đã tham gia phòng này rồi!", threadID, messageID);
        }
        
        if (gameData.players.length >= 8) {
            return api.sendMessage("🚫 Phòng đã đầy (8/8 người chơi)", threadID, messageID);
        }
        
        const userData = await Currencies.getData(senderID);
        if (userData.money < gameData.betAmount) {
            return api.sendMessage("💸 Bạn không đủ tiền để tham gia phòng!", threadID, messageID);
        }
        
        gameData.players.push({ id: senderID, bet: null });
        await Currencies.decreaseMoney(senderID, gameData.betAmount);
        
        return api.sendMessage(`✅ ${await Users.getNameUser(senderID)} đã tham gia phòng!\n👥 Số người chơi: ${gameData.players.length}/8`, threadID, messageID);
    }
    
    if (["start", "bắt đầu"].includes(args[0]?.toLowerCase())) {
        const gameData = global.moduleData.xocdia.get(threadID);
        if (!gameData) {
            return api.sendMessage("❌ Chưa có phòng xóc đĩa nào!", threadID, messageID);
        }
        
        if (gameData.author !== senderID) {
            return api.sendMessage("🚫 Chỉ chủ phòng mới có thể bắt đầu game!", threadID, messageID);
        }
        
        if (gameData.players.length < 2) {
            return api.sendMessage("⚠️ Cần ít nhất 2 người chơi để bắt đầu!", threadID, messageID);
        }
        
        gameData.status = "playing";
        
        return api.sendMessage(`🎰 GAME BẮT ĐẦU! 🎰

👥 Số người chơi: ${gameData.players.length}
💰 Tổng tiền thưởng: ${(gameData.betAmount * gameData.players.length).toLocaleString()}$

🎯 HÃY ĐẶT CƯỢC:
• xocdia tài [số tiền bổ sung]
• xocdia xỉu [số tiền bổ sung] 
• xocdia chẵn [số tiền bổ sung]
• xocdia lẻ [số tiền bổ sung]

⏱️ Thời gian đặt cược: 60 giây`, threadID, messageID);
    }
    
    // Đặt cược cá nhân (không cần phòng)
    const betTypes = ["tài", "xỉu", "chẵn", "lẻ"];
    const betType = args[0]?.toLowerCase();
    
    if (betTypes.includes(betType)) {
        const betAmount = parseInt(args[1]) || 0;
        
        if (betAmount < 1000) {
            return api.sendMessage("💰 Số tiền cược tối thiểu là 1000$!", threadID, messageID);
        }
        
        const userData = await Currencies.getData(senderID);
        if (userData.money < betAmount) {
            return api.sendMessage("💸 Bạn không đủ tiền để đặt cược!", threadID, messageID);
        }
        
        // Tạo kết quả xóc đĩa
        const coins = [];
        for (let i = 0; i < 4; i++) {
            coins.push(Math.random() < 0.5 ? 'sấp' : 'ngửa');
        }
        
        const sapCount = coins.filter(c => c === 'sấp').length;
        let result, isWin = false;
        
        // Xác định kết quả
        if (betType === "tài" && sapCount >= 3) {
            result = `tài (${sapCount} sấp)`;
            isWin = true;
        } else if (betType === "xỉu" && sapCount <= 1) {
            result = `xỉu (${sapCount} sấp)`;
            isWin = true;
        } else if (betType === "chẵn" && sapCount % 2 === 0) {
            result = `chẵn (${sapCount} sấp)`;
            isWin = true;
        } else if (betType === "lẻ" && sapCount % 2 === 1) {
            result = `lẻ (${sapCount} sấp)`;
            isWin = true;
        } else {
            result = `${sapCount >= 3 ? 'tài' : sapCount <= 1 ? 'xỉu' : sapCount % 2 === 0 ? 'chẵn' : 'lẻ'} (${sapCount} sấp)`;
        }
        
        const winAmount = isWin ? betAmount * 2 : 0;
        
        // Cập nhật tiền
        if (isWin) {
            await Currencies.increaseMoney(senderID, winAmount);
        } else {
            await Currencies.decreaseMoney(senderID, betAmount);
        }
        
        // Tạo canvas
        try {
            const canvasBuffer = await createXocDiaCanvas(result, coins, isWin, betAmount, winAmount);
            const imagePath = __dirname + `/cache/xocdia_${senderID}_${Date.now()}.png`;
            fs.writeFileSync(imagePath, canvasBuffer);
            
            const userName = await Users.getNameUser(senderID);
            const resultMessage = `🎰 KẾT QUẢ XÓC ĐĨA VIP 🎰

👤 Người chơi: ${userName}
🎯 Đặt cược: ${betType.toUpperCase()}
🎲 Kết quả: ${result.toUpperCase()}
${isWin ? '🎉 CHÚC MỪNG BỬN THẮNG!' : '😢 Chúc bạn may mắn lần sau!'}

💰 Thay đổi số dư: ${isWin ? '+' : '-'}${betAmount.toLocaleString()}$
💳 Số dư hiện tại: ${(userData.money + (isWin ? winAmount : -betAmount)).toLocaleString()}$`;
            
            api.sendMessage({
                body: resultMessage,
                attachment: fs.createReadStream(imagePath)
            }, threadID, () => {
                setTimeout(() => {
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                }, 30000);
            }, messageID);
            
        } catch (error) {
            console.log("Canvas error:", error);
            // Fallback message without image
            const fallbackMessage = `🎰 KẾT QUẢ XÓC ĐĨA 🎰

🎯 Bạn cược: ${betType.toUpperCase()}
🎲 Kết quả: ${result.toUpperCase()}
🪙 Xu: ${coins.map(c => c === 'sấp' ? '🟡' : '⚪').join(' ')}

${isWin ? '🎉 THẮNG: +' + winAmount.toLocaleString() + '$' : '💸 THUA: -' + betAmount.toLocaleString() + '$'}`;
            
            return api.sendMessage(fallbackMessage, threadID, messageID);
        }
        
        return;
    }
    
    // Các lệnh khác
    if (["info", "thông tin"].includes(args[0]?.toLowerCase())) {
        const gameData = global.moduleData.xocdia.get(threadID);
        if (!gameData) {
            return api.sendMessage("❌ Chưa có phòng xóc đĩa nào!", threadID, messageID);
        }
        
        let playerList = "";
        for (const player of gameData.players) {
            const name = await Users.getNameUser(player.id);
            playerList += `• ${name}${player.id === gameData.author ? ' (Chủ phòng)' : ''}\n`;
        }
        
        const infoMessage = `🎰 THÔNG TIN PHÒNG XÓC ĐĨA 🎰

👥 Danh sách người chơi (${gameData.players.length}/8):
${playerList}
💰 Tiền cược: ${gameData.betAmount.toLocaleString()}$
🏆 Tổng giải thưởng: ${(gameData.betAmount * gameData.players.length).toLocaleString()}$
📊 Trạng thái: ${gameData.status === 'waiting' ? 'Đang chờ' : 'Đang chơi'}
⏰ Tạo lúc: ${new Date(gameData.startTime).toLocaleString()}`;
        
        return api.sendMessage(infoMessage, threadID, messageID);
    }
    
    if (["leave", "rời"].includes(args[0]?.toLowerCase())) {
        const gameData = global.moduleData.xocdia.get(threadID);
        if (!gameData) {
            return api.sendMessage("❌ Chưa có phòng xóc đĩa nào!", threadID, messageID);
        }
        
        const playerIndex = gameData.players.findIndex(p => p.id === senderID);
        if (playerIndex === -1) {
            return api.sendMessage("⚠️ Bạn chưa tham gia phòng này!", threadID, messageID);
        }
        
        // Hoàn tiền
        await Currencies.increaseMoney(senderID, gameData.betAmount);
        gameData.players.splice(playerIndex, 1);
        
        if (gameData.author === senderID || gameData.players.length === 0) {
            // Hoàn tiền cho tất cả
            for (const player of gameData.players) {
                await Currencies.increaseMoney(player.id, gameData.betAmount);
            }
            global.moduleData.xocdia.delete(threadID);
            return api.sendMessage("🚪 Chủ phòng đã rời, phòng bị giải tán!", threadID, messageID);
        }
        
        return api.sendMessage(`🚪 ${await Users.getNameUser(senderID)} đã rời phòng!`, threadID, messageID);
    }
    
    // Hướng dẫn
    const helpMessage = `🎰 HƯỚNG DẪN XÓC ĐĨA VIP 🎰

🎯 LỆNH CÁ NHÂN:
• xocdia tài [tiền] - Cược tài (3-4 sấp)
• xocdia xỉu [tiền] - Cược xỉu (0-1 sấp)  
• xocdia chẵn [tiền] - Cược chẵn (0,2,4 sấp)
• xocdia lẻ [tiền] - Cược lẻ (1,3 sấp)

🏠 LỆNH PHÒNG CHƠI:
• xocdia create [tiền] - Tạo phòng
• xocdia join - Tham gia phòng
• xocdia start - Bắt đầu (chủ phòng)
• xocdia info - Xem thông tin
• xocdia leave - Rời phòng

💰 Tỷ lệ thắng: x2 tiền cược
💸 Cược tối thiểu: 1000$`;
    
    return api.sendMessage(helpMessage, threadID, messageID);
};
