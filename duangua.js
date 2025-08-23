
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs-extra');
const axios = require('axios');

module.exports.config = {
    name: "duangua",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Kaori Waguri",
    description: "Game đua ngựa siêu vip với nhiều tính năng cược",
    commandCategory: "GAME",
    usages: "[tạo/join/start/thống_kê/top] [số_tiền]",
    cooldowns: 5
};

module.exports.onLoad = async function() {
    const horseImages = [
        'https://i.imgur.com/horse1.png',
        'https://i.imgur.com/horse2.png', 
        'https://i.imgur.com/horse3.png',
        'https://i.imgur.com/horse4.png',
        'https://i.imgur.com/horse5.png'
    ];
    
    if (!fs.existsSync(__dirname + '/cache/duangua/')) {
        fs.mkdirSync(__dirname + '/cache/duangua/', { recursive: true });
    }

    // Tạo ảnh track đua
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');
    
    // Background xanh lá
    ctx.fillStyle = '#2E8B57';
    ctx.fillRect(0, 0, 800, 600);
    
    // Vẽ 5 đường đua
    for (let i = 0; i < 5; i++) {
        const y = 80 + (i * 100);
        
        // Đường viền track
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(50, y - 10, 700, 60);
        
        // Track chính
        ctx.fillStyle = '#D2B48C';
        ctx.fillRect(55, y - 5, 690, 50);
        
        // Vạch đích
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(700, y - 10, 5, 60);
        
        // Số thứ tự ngựa
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.fillText(`${i + 1}`, 20, y + 20);
    }
    
    // Tiêu đề
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏇 ĐUA NGỰA VIP 🏇', 400, 40);
    
    // Lưu ảnh track
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(__dirname + '/cache/duangua/track.png', buffer);
    
    // Tạo 5 ngựa với màu khác nhau
    const horseColors = ['#8B4513', '#A0522D', '#CD853F', '#DEB887', '#F4A460'];
    const horseNames = ['Thunder', 'Lightning', 'Storm', 'Wind', 'Fire'];
    
    for (let i = 0; i < 5; i++) {
        const horseCanvas = createCanvas(80, 60);
        const horseCtx = horseCanvas.getContext('2d');
        
        // Vẽ ngựa đơn giản
        horseCtx.fillStyle = horseColors[i];
        
        // Thân ngựa
        horseCtx.fillRect(20, 25, 50, 20);
        
        // Đầu ngựa
        horseCtx.fillRect(10, 20, 25, 25);
        
        // Chân ngựa
        horseCtx.fillRect(25, 45, 8, 15);
        horseCtx.fillRect(35, 45, 8, 15);
        horseCtx.fillRect(50, 45, 8, 15);
        horseCtx.fillRect(60, 45, 8, 15);
        
        // Mắt
        horseCtx.fillStyle = '#FFFFFF';
        horseCtx.fillRect(15, 25, 5, 5);
        horseCtx.fillStyle = '#000000';
        horseCtx.fillRect(16, 26, 3, 3);
        
        const horseBuffer = horseCanvas.toBuffer('image/png');
        fs.writeFileSync(__dirname + `/cache/duangua/horse${i + 1}.png`, horseBuffer);
    }
};

const races = new Map();

module.exports.run = async function({ api, event, args, Currencies }) {
    const { threadID, senderID, messageID } = event;
    const send = (msg, attachment = null) => api.sendMessage({ body: msg, attachment }, threadID, messageID);
    
    if (!global.moduleData) global.moduleData = {};
    if (!global.moduleData.duangua) global.moduleData.duangua = new Map();
    
    const userData = await Currencies.getData(senderID);
    const userMoney = userData.money;
    
    switch (args[0]?.toLowerCase()) {
        case 'tạo':
        case 'create': {
            if (global.moduleData.duangua.has(threadID)) {
                return send("🏇 Đang có một cuộc đua diễn ra trong nhóm này!");
            }
            
            const betAmount = parseInt(args[1]);
            if (!betAmount || betAmount < 1000) {
                return send("💰 Số tiền cược tối thiểu là 1,000đ!\n📝 Sử dụng: duangua tạo [số_tiền]");
            }
            
            if (userMoney < betAmount) {
                return send("💸 Bạn không đủ tiền để tạo cuộc đua này!");
            }
            
            const raceData = {
                creator: senderID,
                betAmount: betAmount,
                players: [{ id: senderID, horse: null, bet: betAmount }],
                status: 'waiting',
                horses: [
                    { id: 1, name: 'Thunder ⚡', position: 0, odds: 2.5 },
                    { id: 2, name: 'Lightning 🌩️', position: 0, odds: 3.0 },
                    { id: 3, name: 'Storm 🌪️', position: 0, odds: 2.8 },
                    { id: 4, name: 'Wind 💨', position: 0, odds: 3.2 },
                    { id: 5, name: 'Fire 🔥', position: 0, odds: 2.7 }
                ]
            };
            
            await Currencies.decreaseMoney(senderID, betAmount);
            global.moduleData.duangua.set(threadID, raceData);
            
            return send(`🏇 Cuộc đua ngựa đã được tạo!
💰 Tiền cược: ${betAmount.toLocaleString()}đ
👥 Để tham gia: duangua join [số_ngựa] [số_tiền]
🐎 Danh sách ngựa:
1. Thunder ⚡ (tỷ lệ x2.5)
2. Lightning 🌩️ (tỷ lệ x3.0)  
3. Storm 🌪️ (tỷ lệ x2.8)
4. Wind 💨 (tỷ lệ x3.2)
5. Fire 🔥 (tỷ lệ x2.7)

⏰ Chờ 30s để bắt đầu hoặc dùng: duangua start`);
        }
        
        case 'join':
        case 'tham_gia': {
            const raceData = global.moduleData.duangua.get(threadID);
            if (!raceData) {
                return send("🏇 Không có cuộc đua nào đang diễn ra!\n📝 Tạo cuộc đua: duangua tạo [số_tiền]");
            }
            
            if (raceData.status !== 'waiting') {
                return send("🏁 Cuộc đua đã bắt đầu, không thể tham gia!");
            }
            
            const horseId = parseInt(args[1]);
            const betAmount = parseInt(args[2]);
            
            if (!horseId || horseId < 1 || horseId > 5) {
                return send("🐎 Chọn ngựa từ 1-5!\n📝 Sử dụng: duangua join [số_ngựa] [số_tiền]");
            }
            
            if (!betAmount || betAmount < 500) {
                return send("💰 Số tiền cược tối thiểu là 500đ!");
            }
            
            if (userMoney < betAmount) {
                return send("💸 Bạn không đủ tiền để đặt cược!");
            }
            
            // Kiểm tra đã tham gia chưa
            const existingPlayer = raceData.players.find(p => p.id === senderID);
            if (existingPlayer) {
                return send("🎯 Bạn đã tham gia cuộc đua này rồi!");
            }
            
            await Currencies.decreaseMoney(senderID, betAmount);
            raceData.players.push({ id: senderID, horse: horseId, bet: betAmount });
            
            const horseName = raceData.horses[horseId - 1].name;
            return send(`✅ Bạn đã cược ${betAmount.toLocaleString()}đ vào ngựa ${horseName}!
👥 Số người tham gia: ${raceData.players.length}
⏰ Chờ thêm người hoặc chủ phòng start cuộc đua!`);
        }
        
        case 'start':
        case 'bắt_đầu': {
            const raceData = global.moduleData.duangua.get(threadID);
            if (!raceData) {
                return send("🏇 Không có cuộc đua nào để bắt đầu!");
            }
            
            if (raceData.creator !== senderID) {
                return send("⚠️ Chỉ người tạo cuộc đua mới có thể bắt đầu!");
            }
            
            if (raceData.players.length < 2) {
                return send("👥 Cần ít nhất 2 người chơi để bắt đầu cuộc đua!");
            }
            
            raceData.status = 'racing';
            
            // Bắt đầu đua
            send("🏁 CUỘC ĐUA BẮT ĐẦU! 🏁", fs.createReadStream(__dirname + '/cache/duangua/track.png'));
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Mô phỏng đua ngựa
            let winner = null;
            let round = 1;
            
            while (!winner && round <= 10) {
                // Random tiến độ cho mỗi ngựa
                for (let horse of raceData.horses) {
                    const speed = Math.floor(Math.random() * 20) + 10;
                    horse.position += speed;
                    
                    if (horse.position >= 650 && !winner) {
                        winner = horse;
                    }
                }
                
                // Tạo ảnh trạng thái đua
                const canvas = createCanvas(800, 600);
                const ctx = canvas.getContext('2d');
                
                // Vẽ lại track
                ctx.fillStyle = '#2E8B57';
                ctx.fillRect(0, 0, 800, 600);
                
                for (let i = 0; i < 5; i++) {
                    const y = 80 + (i * 100);
                    
                    // Track
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(50, y - 10, 700, 60);
                    ctx.fillStyle = '#D2B48C';
                    ctx.fillRect(55, y - 5, 690, 50);
                    
                    // Vạch đích
                    ctx.fillStyle = '#FF0000';
                    ctx.fillRect(700, y - 10, 5, 60);
                    
                    // Vị trí ngựa
                    const horsePos = Math.min(raceData.horses[i].position, 650);
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(55 + horsePos, y - 5, 30, 30);
                    
                    // Tên ngựa và vị trí
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 16px Arial';
                    ctx.fillText(`${i + 1}. ${raceData.horses[i].name}`, 20, y + 35);
                    
                    // Số thứ tự
                    ctx.fillStyle = '#FFD700';
                    ctx.font = 'bold 24px Arial';
                    ctx.fillText(`${i + 1}`, 20, y + 15);
                }
                
                // Tiêu đề
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 32px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`🏇 VÒNG ${round} 🏇`, 400, 40);
                
                const buffer = canvas.toBuffer('image/png');
                fs.writeFileSync(__dirname + `/cache/duangua/race_${round}.png`, buffer);
                
                api.sendMessage({
                    body: `🏁 Vòng ${round}/10\n⚡ Đang đua...`,
                    attachment: fs.createReadStream(__dirname + `/cache/duangua/race_${round}.png`)
                }, threadID);
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                round++;
            }
            
            // Công bố kết quả
            if (!winner) {
                // Chọn ngựa có vị trí xa nhất
                winner = raceData.horses.reduce((max, horse) => 
                    horse.position > max.position ? horse : max
                );
            }
            
            let resultMsg = `🏆 KẾT QUẢ CUỘC ĐUA 🏆\n\n🥇 Thắng: ${winner.name}\n\n💰 DANH SÁCH THƯỞNG:\n`;
            let totalPrize = 0;
            
            for (const player of raceData.players) {
                const userName = global.data.userName.get(player.id) || "Unknown";
                
                if (player.horse === winner.id) {
                    const prize = Math.floor(player.bet * winner.odds);
                    await Currencies.increaseMoney(player.id, prize);
                    resultMsg += `✅ ${userName}: +${prize.toLocaleString()}đ (cược ${player.bet.toLocaleString()}đ)\n`;
                    totalPrize += prize;
                } else {
                    resultMsg += `❌ ${userName}: -${player.bet.toLocaleString()}đ\n`;
                }
            }
            
            resultMsg += `\n💎 Tổng tiền thưởng: ${totalPrize.toLocaleString()}đ`;
            resultMsg += `\n\n🎯 Credit: Kaori Waguri`;
            
            send(resultMsg);
            global.moduleData.duangua.delete(threadID);
            break;
        }
        
        case 'thống_kê':
        case 'stats': {
            const raceData = global.moduleData.duangua.get(threadID);
            if (!raceData) {
                return send("🏇 Không có cuộc đua nào đang diễn ra!");
            }
            
            let statsMsg = `📊 THỐNG KÊ CUỘC ĐUA\n\n💰 Tiền cược gốc: ${raceData.betAmount.toLocaleString()}đ\n👥 Người tham gia: ${raceData.players.length}\n\n🐎 DANH SÁCH CƯỢC:\n`;
            
            for (const player of raceData.players) {
                const userName = global.data.userName.get(player.id) || "Unknown";
                const horseName = player.horse ? raceData.horses[player.horse - 1].name : "Chưa chọn";
                statsMsg += `• ${userName}: ${horseName} (${player.bet.toLocaleString()}đ)\n`;
            }
            
            return send(statsMsg);
        }
        
        case 'help':
        case 'hướng_dẫn':
        default: {
            return send(`🏇 GAME ĐUA NGỰA VIP 🏇

📝 CÁCH SỬ DỤNG:
• duangua tạo [tiền] - Tạo cuộc đua
• duangua join [ngựa] [tiền] - Tham gia cược  
• duangua start - Bắt đầu đua (chỉ chủ phòng)
• duangua thống_kê - Xem thông tin cuộc đua

🐎 DANH SÁCH NGỰA:
1. Thunder ⚡ (tỷ lệ x2.5)
2. Lightning 🌩️ (tỷ lệ x3.0)
3. Storm 🌪️ (tỷ lệ x2.8)  
4. Wind 💨 (tỷ lệ x3.2)
5. Fire 🔥 (tỷ lệ x2.7)

💰 Tiền cược tối thiểu: 500đ
🎯 Credit: Kaori Waguri`);
        }
    }
};
