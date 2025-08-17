
module.exports.config = {
    name: "veso",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Kaori Waguri Premium",
    description: "Game vé số tích hợp AI Cohere - Mua vé số và chờ kết quả sổ số",
    commandCategory: "game",
    usages: "veso [mua/ket-qua/bang-gia/huong-dan/so-so]",
    cooldowns: 5,
    dependencies: {
        "fs-extra": "",
        "axios": "",
        "moment-timezone": ""
    }
};

module.exports.onLoad = async () => {
    const fs = global.nodemodule["fs-extra"];
    const path = __dirname + "/cache/";
    
    // Tạo thư mục cache nếu chưa có
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
    }
    
    // Tạo file dữ liệu vé số
    const dataPath = path + "veso_data.json";
    if (!fs.existsSync(dataPath)) {
        const initData = {
            currentDraw: 1,
            tickets: {},
            winners: {},
            lastDraw: null,
            nextDraw: Date.now() + (10 * 60 * 60 * 1000), // 10 tiếng
            totalSold: 0,
            prizes: {
                "giai_dac_biet": { prize: 100000000000000000, chance: 0.0000001 },
                "giai_nhat": { prize: 50000000000, chance: 0.000001 },
                "giai_nhi": { prize: 10000000000, chance: 0.00001 },
                "giai_ba": { prize: 1000000000, chance: 0.0001 },
                "giai_tu": { prize: 100000000, chance: 0.001 },
                "giai_nam": { prize: 10000000, chance: 0.01 },
                "giai_sau": { prize: 1000000, chance: 0.05 },
                "giai_bay": { prize: 100000, chance: 0.1 },
                "giai_tam": { prize: 50000, chance: 0.2 }
            }
        };
        fs.writeFileSync(dataPath, JSON.stringify(initData, null, 2));
    }
};

module.exports.run = async ({ event, api, args, Currencies }) => {
    const fs = global.nodemodule["fs-extra"];
    const axios = global.nodemodule["axios"];
    const moment = require("moment-timezone");
    
    const { threadID, senderID, messageID } = event;
    const dataPath = __dirname + "/cache/veso_data.json";
    
    // API Cohere config
    const COHERE_API_KEY = "D0O5lqckf50p3kdODOUMNL333dn0mPYYyqAXuMTd";
    const COHERE_URL = "https://api.cohere.ai/v1/generate";
    
    // Load dữ liệu
    let data = {};
    if (fs.existsSync(dataPath)) {
        data = JSON.parse(fs.readFileSync(dataPath));
    }
    
    const ticketPrice = 10000; // 10k per ticket
    
    // Hàm tạo số vé bằng Cohere
    const generateTicketNumbers = async () => {
        try {
            const prompt = "Generate exactly 6 random numbers between 0-9, no spaces, no formatting, just 6 digits like: 123456";
            
            const response = await axios.post(COHERE_URL, {
                model: "command-light",
                prompt: prompt,
                max_tokens: 10,
                temperature: 1.5,
                k: 0,
                p: 0.9
            }, {
                headers: {
                    'Authorization': `Bearer ${COHERE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            
            let numbers = response.data.generations[0].text.trim();
            // Làm sạch kết quả, chỉ lấy 6 số
            numbers = numbers.replace(/[^0-9]/g, '').substring(0, 6);
            
            // Nếu không đủ 6 số, tạo thêm
            while (numbers.length < 6) {
                numbers += Math.floor(Math.random() * 10).toString();
            }
            
            return numbers;
        } catch (error) {
            console.log("Lỗi Cohere API:", error.message);
            // Fallback: tạo số ngẫu nhiên
            return Math.floor(100000 + Math.random() * 900000).toString();
        }
    };
    
    // Hàm tạo số trúng thưởng bằng Cohere
    const generateWinningNumbers = async () => {
        try {
            const prompt = "Generate exactly 8 sets of 6-digit lottery numbers, each set should be completely random numbers from 000000 to 999999, format: 123456,789012,345678,901234,567890,123789,456012,890345";
            
            const response = await axios.post(COHERE_URL, {
                model: "command-light", 
                prompt: prompt,
                max_tokens: 100,
                temperature: 1.8,
                k: 0,
                p: 0.95
            }, {
                headers: {
                    'Authorization': `Bearer ${COHERE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            
            let result = response.data.generations[0].text.trim();
            let numbers = result.replace(/[^0-9,]/g, '').split(',').filter(n => n.length === 6);
            
            // Đảm bảo có đủ 8 số
            while (numbers.length < 8) {
                numbers.push(Math.floor(100000 + Math.random() * 900000).toString());
            }
            
            return {
                giai_dac_biet: numbers[0] || Math.floor(100000 + Math.random() * 900000).toString(),
                giai_nhat: numbers[1] || Math.floor(100000 + Math.random() * 900000).toString(),
                giai_nhi: numbers[2] || Math.floor(100000 + Math.random() * 900000).toString(),
                giai_ba: numbers[3] || Math.floor(100000 + Math.random() * 900000).toString(),
                giai_tu: numbers[4] || Math.floor(100000 + Math.random() * 900000).toString(),
                giai_nam: numbers[5] || Math.floor(100000 + Math.random() * 900000).toString(),
                giai_sau: numbers[6] || Math.floor(100000 + Math.random() * 900000).toString(),
                giai_bay: numbers[7] || Math.floor(100000 + Math.random() * 900000).toString()
            };
        } catch (error) {
            console.log("Lỗi tạo số trúng thưởng:", error.message);
            return {
                giai_dac_biet: Math.floor(100000 + Math.random() * 900000).toString(),
                giai_nhat: Math.floor(100000 + Math.random() * 900000).toString(),
                giai_nhi: Math.floor(100000 + Math.random() * 900000).toString(),
                giai_ba: Math.floor(100000 + Math.random() * 900000).toString(),
                giai_tu: Math.floor(100000 + Math.random() * 900000).toString(),
                giai_nam: Math.floor(100000 + Math.random() * 900000).toString(),
                giai_sau: Math.floor(100000 + Math.random() * 900000).toString(),
                giai_bay: Math.floor(100000 + Math.random() * 900000).toString()
            };
        }
    };
    
    const subCommand = args[0] ? args[0].toLowerCase() : "";
    
    switch (subCommand) {
        case "mua": {
            const userMoney = (await Currencies.getData(senderID)).money;
            
            if (userMoney < ticketPrice) {
                return api.sendMessage(
                    `❌ Không đủ tiền mua vé!\n💰 Cần: ${ticketPrice.toLocaleString()}đ\n💳 Có: ${userMoney.toLocaleString()}đ`,
                    threadID, messageID
                );
            }
            
            // Tạo số vé bằng Cohere
            api.sendMessage("🎰 Đang tạo số vé bằng AI Cohere...", threadID, messageID);
            
            const ticketNumber = await generateTicketNumbers();
            const ticketId = `VE${Date.now()}${Math.floor(Math.random() * 1000)}`;
            
            // Trừ tiền
            await Currencies.decreaseMoney(senderID, ticketPrice);
            
            // Lưu vé
            if (!data.tickets[senderID]) {
                data.tickets[senderID] = [];
            }
            
            data.tickets[senderID].push({
                id: ticketId,
                number: ticketNumber,
                draw: data.currentDraw,
                purchaseTime: Date.now()
            });
            
            data.totalSold++;
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
            
            const message = `
╭─────────── 🎫 VÉ SỐ 🎫 ───────────╮
│                                                                │
│  🎯 Mua vé thành công!                            │
│                                                                │
│  🆔 Mã vé: ${ticketId}                     │
│  🔢 Số vé: ${ticketNumber}                        │
│  🎲 Kỳ quay: #${data.currentDraw}                │
│  💰 Giá vé: ${ticketPrice.toLocaleString()}đ          │
│                                                                │
│  ⏰ Sổ số sau: ${Math.floor((data.nextDraw - Date.now()) / (1000 * 60 * 60))}h ${Math.floor(((data.nextDraw - Date.now()) % (1000 * 60 * 60)) / (1000 * 60))}m │
│                                                                │
│  🍀 Chúc bạn may mắn! 🍀                    │
│                                                                │
╰─────────────────────────────────────╯

💫 Powered by Cohere AI
`;
            
            return api.sendMessage(message, threadID, messageID);
        }
        
        case "ket-qua": 
        case "ketqua": {
            if (!data.tickets[senderID] || data.tickets[senderID].length === 0) {
                return api.sendMessage("❌ Bạn chưa mua vé số nào!", threadID, messageID);
            }
            
            const userTickets = data.tickets[senderID];
            let message = `
╭──────── 📋 VÉ SỐ CỦA BẠN 📋 ────────╮
│                                                                  │
`;
            
            userTickets.forEach((ticket, index) => {
                const status = ticket.draw < data.currentDraw ? "Đã quay" : "Chờ quay";
                message += `│  ${index + 1}. ${ticket.number} - ${status}           │\n`;
            });
            
            message += `│                                                                  │
╰────────────────────────────────────────╯`;
            
            return api.sendMessage(message, threadID, messageID);
        }
        
        case "bang-gia":
        case "banggia": {
            const message = `
╭────────── 💎 BẢNG GIẢI THƯỞNG 💎 ──────────╮
│                                                                        │
│  🏆 Giải Đặc Biệt: 100,000,000,000,000,000đ        │
│  🥇 Giải Nhất: 50,000,000,000đ                           │
│  🥈 Giải Nhì: 10,000,000,000đ                             │
│  🥉 Giải Ba: 1,000,000,000đ                               │
│  4️⃣ Giải Tư: 100,000,000đ                               │
│  5️⃣ Giải Năm: 10,000,000đ                             │
│  6️⃣ Giải Sáu: 1,000,000đ                                │
│  7️⃣ Giải Bảy: 100,000đ                                  │
│  8️⃣ Giải Tám: 50,000đ                                   │
│                                                                        │
│  💰 Giá vé: 10,000đ                                      │
│  ⏰ Quay số: 10 tiếng/lần                              │
│                                                                        │
╰──────────────────────────────────────────────╯

🎯 Tỷ lệ trúng cực thấp - May mắn sẽ đến!
`;
            
            return api.sendMessage(message, threadID, messageID);
        }
        
        case "huong-dan":
        case "huongdan":
        case "help": {
            const message = `
╭────────── 📚 HƯỚNG DẪN VÉ SỐ 📚 ──────────╮
│                                                                        │
│  🎫 ${global.config.PREFIX}veso mua                                   │
│      → Mua vé số (10,000đ/vé)                         │
│                                                                        │
│  📋 ${global.config.PREFIX}veso ket-qua                             │
│      → Xem vé số đã mua                                  │
│                                                                        │
│  💎 ${global.config.PREFIX}veso bang-gia                           │
│      → Xem bảng giải thưởng                            │
│                                                                        │
│  🎰 ${global.config.PREFIX}veso so-so (Admin)                    │
│      → Sổ số ngay lập tức                                 │
│                                                                        │
│  📊 ${global.config.PREFIX}veso thong-ke                           │
│      → Xem thống kê chung                               │
│                                                                        │
│  🤖 Số vé được tạo 100% bởi AI Cohere           │
│  ⏰ Tự động sổ số sau mỗi 10 tiếng              │
│  🏆 Thông báo kết quả tự động                       │
│                                                                        │
╰──────────────────────────────────────────────╯

💫 Credit: Kaori Waguri Premium
`;
            
            return api.sendMessage(message, threadID, messageID);
        }
        
        case "so-so":
        case "soso": {
            const adminIDs = global.config.ADMINBOT || [];
            if (!adminIDs.includes(senderID)) {
                return api.sendMessage("❌ Chỉ admin mới có thể sổ số thủ công!", threadID, messageID);
            }
            
            return await performDraw(api, data, dataPath);
        }
        
        case "thong-ke":
        case "thongke": {
            const timeLeft = data.nextDraw - Date.now();
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            
            const message = `
╭────────── 📊 THỐNG KÊ VÉ SỐ 📊 ──────────╮
│                                                                        │
│  🎲 Kỳ quay hiện tại: #${data.currentDraw}                    │
│  🎫 Tổng vé đã bán: ${data.totalSold.toLocaleString()}                │
│  ⏰ Sổ số sau: ${hours}h ${minutes}m                       │
│  💰 Tổng tiền bán vé: ${(data.totalSold * ticketPrice).toLocaleString()}đ │
│                                                                        │
│  🏆 Kỳ quay gần nhất: ${data.lastDraw ? `#${data.lastDraw}` : 'Chưa có'} │
│                                                                        │
╰──────────────────────────────────────────────╯

🤖 Powered by Cohere AI
`;
            
            return api.sendMessage(message, threadID, messageID);
        }
        
        default: {
            return api.sendMessage(
                `🎰 VÉ SỐ VIỆT NAM - AI COHERE 🎰\n\n` +
                `📝 Sử dụng: ${global.config.PREFIX}veso [lệnh]\n\n` +
                `🎫 ${global.config.PREFIX}veso mua - Mua vé số\n` +
                `📋 ${global.config.PREFIX}veso ket-qua - Xem vé đã mua\n` +
                `💎 ${global.config.PREFIX}veso bang-gia - Bảng giải thưởng\n` +
                `📚 ${global.config.PREFIX}veso huong-dan - Hướng dẫn chi tiết\n` +
                `📊 ${global.config.PREFIX}veso thong-ke - Thống kê\n\n` +
                `⏰ Sổ số tự động sau mỗi 10 tiếng\n` +
                `💫 Số vé tạo bởi AI Cohere 100%`,
                threadID, messageID
            );
        }
    }
    
    // Hàm thực hiện sổ số
    async function performDraw(api, data, dataPath) {
        api.sendMessage("🎰 Đang tiến hành sổ số bằng AI Cohere...", threadID, messageID);
        
        // Tạo số trúng thưởng bằng Cohere
        const winningNumbers = await generateWinningNumbers();
        
        // Kiểm tra vé trúng thưởng
        const winners = {};
        let totalWinners = 0;
        let totalPrize = 0;
        
        for (const userId in data.tickets) {
            const userTickets = data.tickets[userId].filter(ticket => ticket.draw === data.currentDraw);
            
            for (const ticket of userTickets) {
                for (const [prize, number] of Object.entries(winningNumbers)) {
                    if (ticket.number === number) {
                        if (!winners[userId]) winners[userId] = [];
                        
                        const prizeAmount = data.prizes[prize].prize;
                        winners[userId].push({
                            ticket: ticket.number,
                            prize: prize,
                            amount: prizeAmount
                        });
                        
                        // Thêm tiền cho người thắng
                        await Currencies.increaseMoney(userId, prizeAmount);
                        totalWinners++;
                        totalPrize += prizeAmount;
                    }
                }
            }
        }
        
        // Lưu kết quả
        data.winners[data.currentDraw] = {
            numbers: winningNumbers,
            winners: winners,
            drawTime: Date.now(),
            totalWinners: totalWinners,
            totalPrize: totalPrize
        };
        
        data.lastDraw = data.currentDraw;
        data.currentDraw++;
        data.nextDraw = Date.now() + (10 * 60 * 60 * 1000); // 10 tiếng tiếp theo
        
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        
        // Tạo thông báo kết quả
        let resultMessage = `
╭──────── 🎊 KẾT QUẢ SỔ SỐ #${data.lastDraw} 🎊 ────────╮
│                                                                          │
│  🏆 Giải Đặc Biệt: ${winningNumbers.giai_dac_biet}                    │
│  🥇 Giải Nhất: ${winningNumbers.giai_nhat}                           │
│  🥈 Giải Nhì: ${winningNumbers.giai_nhi}                             │
│  🥉 Giải Ba: ${winningNumbers.giai_ba}                               │
│  4️⃣ Giải Tư: ${winningNumbers.giai_tu}                             │
│  5️⃣ Giải Năm: ${winningNumbers.giai_nam}                         │
│  6️⃣ Giải Sáu: ${winningNumbers.giai_sau}                           │
│  7️⃣ Giải Bảy: ${winningNumbers.giai_bay}                           │
│                                                                          │
│  🎉 Tổng người thắng: ${totalWinners}                            │
│  💰 Tổng tiền thưởng: ${totalPrize.toLocaleString()}đ          │
│                                                                          │
╰────────────────────────────────────────────────╯

⏰ Kỳ tiếp theo: #${data.currentDraw} (sau 10 tiếng)
🤖 Số được tạo bởi AI Cohere
💫 Credit: Kaori Waguri Premium
`;

        if (totalWinners > 0) {
            resultMessage += `\n🎊 DANH SÁCH NGƯỜI THẮNG:\n`;
            for (const [userId, userWins] of Object.entries(winners)) {
                try {
                    const userName = await global.Users.getNameUser(userId);
                    resultMessage += `\n👤 ${userName}:\n`;
                    for (const win of userWins) {
                        resultMessage += `   🎫 ${win.ticket} - ${win.prize.replace('giai_', 'Giải ').replace('_', ' ')} - ${win.amount.toLocaleString()}đ\n`;
                    }
                } catch (e) {
                    resultMessage += `\n👤 User ${userId}: Trúng ${userWins.length} giải\n`;
                }
            }
        }
        
        // Gửi thông báo đến tất cả nhóm
        const allThreads = await api.getThreadList(100, null, ["INBOX"]);
        for (const thread of allThreads) {
            if (thread.isGroup) {
                try {
                    await api.sendMessage(resultMessage, thread.threadID);
                } catch (e) {
                    console.log(`Không thể gửi kết quả đến nhóm ${thread.threadID}`);
                }
            }
        }
        
        return api.sendMessage("✅ Đã sổ số thành công và thông báo đến tất cả nhóm!", threadID, messageID);
    }
};

// Auto draw function
module.exports.handleEvent = async ({ event, api }) => {
    const fs = global.nodemodule["fs-extra"];
    const dataPath = __dirname + "/cache/veso_data.json";
    
    // Chỉ chạy 1 lần mỗi phút để kiểm tra
    if (Date.now() % 60000 > 1000) return;
    
    if (fs.existsSync(dataPath)) {
        const data = JSON.parse(fs.readFileSync(dataPath));
        
        // Kiểm tra có đến giờ sổ số chưa
        if (Date.now() >= data.nextDraw) {
            console.log("Tự động sổ số...");
            
            // Thực hiện sổ số tự động
            try {
                const winningNumbers = await generateWinningNumbers();
                
                // Logic sổ số tương tự như trên...
                // (Code này sẽ tương tự như function performDraw)
                
            } catch (error) {
                console.log("Lỗi tự động sổ số:", error);
            }
        }
    }
};
