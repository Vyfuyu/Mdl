
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');

module.exports.config = {
    name: "dechete",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Kaori Waguri",
    description: "Game Đế Chế Tài Chính - Xây dựng đế chế kinh doanh của bạn",
    commandCategory: "game",
    usages: "[batdau/trangthai/nangcap/vayngan/trano/bangxephang/dautus/banthuong]",
    cooldowns: 3,
    dependencies: {
        "canvas": "",
        "axios": ""
    }
};

// Đường dẫn lưu dữ liệu
const dataPath = path.join(__dirname, 'cache', 'dechete_data.json');
const companyStatsPath = path.join(__dirname, 'cache', 'company_stats.json');
const globalDataPath = path.join(__dirname, 'cache', 'global_data.json');

// Khởi tạo dữ liệu
function initData() {
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    if (!fs.existsSync(dataPath)) {
        fs.writeFileSync(dataPath, JSON.stringify({}, null, 2));
    }
    
    if (!fs.existsSync(companyStatsPath)) {
        const companyStats = {
            1: { upgradeCost: 0, dailyPayout: 1000, maintenanceCost: 100 },
            2: { upgradeCost: 10000, dailyPayout: 2500, maintenanceCost: 300 },
            3: { upgradeCost: 50000, dailyPayout: 6000, maintenanceCost: 800 },
            4: { upgradeCost: 200000, dailyPayout: 15000, maintenanceCost: 2000 },
            5: { upgradeCost: 800000, dailyPayout: 35000, maintenanceCost: 5000 },
            6: { upgradeCost: 3000000, dailyPayout: 80000, maintenanceCost: 12000 },
            7: { upgradeCost: 10000000, dailyPayout: 180000, maintenanceCost: 30000 },
            8: { upgradeCost: 40000000, dailyPayout: 400000, maintenanceCost: 75000 },
            9: { upgradeCost: 150000000, dailyPayout: 900000, maintenanceCost: 180000 },
            10: { upgradeCost: 500000000, dailyPayout: 2000000, maintenanceCost: 400000 }
        };
        fs.writeFileSync(companyStatsPath, JSON.stringify(companyStats, null, 2));
    }
    
    if (!fs.existsSync(globalDataPath)) {
        fs.writeFileSync(globalDataPath, JSON.stringify({ companies: [] }, null, 2));
    }
}

// Đọc dữ liệu
function readData(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        initData();
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
}

// Lưu dữ liệu
function saveData(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Format số tiền
function formatMoney(amount) {
    if (amount >= 1000000000) return (amount / 1000000000).toFixed(1) + 'B';
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K';
    return amount.toLocaleString('vi-VN');
}

// Tạo ảnh canvas
async function createCompanyImage(userData, companyStats) {
    const width = 800;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, width-20, height-20);

    // Title
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ĐẾ CHẾ TÀI CHÍNH', width/2, 60);

    // Company name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(userData.companyName, width/2, 110);

    // Stats background
    ctx.fillStyle = 'rgba(0, 212, 255, 0.1)';
    ctx.fillRect(50, 140, width-100, 340);
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 140, width-100, 340);

    // Stats
    const stats = [
        { label: '🏢 Cấp độ:', value: `Level ${userData.companyLevel}` },
        { label: '💰 Tiền mặt:', value: `$${formatMoney(userData.cash)}` },
        { label: '💳 Nợ:', value: `$${formatMoney(userData.debt)}` },
        { label: '💎 Tài sản thực:', value: `$${formatMoney(userData.cash - userData.debt)}` },
        { label: '⚡ Thu nhập/5p:', value: `$${formatMoney(companyStats[userData.companyLevel].dailyPayout)}` },
        { label: '🔧 Chi phí BT/ngày:', value: `$${formatMoney(companyStats[userData.companyLevel].maintenanceCost)}` },
        { label: '⚠️ Chỉ số rủi ro:', value: `${userData.riskFactor}%` },
        { label: '⏰ Lần cập nhật cuối:', value: new Date(userData.lastPayout).toLocaleString('vi-VN') }
    ];

    ctx.fillStyle = '#ffffff';
    ctx.font = '22px Arial';
    ctx.textAlign = 'left';
    
    stats.forEach((stat, index) => {
        const y = 180 + (index * 35);
        ctx.fillStyle = '#00d4ff';
        ctx.fillText(stat.label, 80, y);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(stat.value, 300, y);
    });

    // Footer
    ctx.fillStyle = '#00d4ff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Credit: Kaori Waguri', width/2, height-30);

    return canvas.toBuffer();
}

// Tính toán thu nhập thụ động
function calculatePassiveIncome(userData, companyStats) {
    const now = Date.now();
    const lastPayout = userData.lastPayout || now;
    const timeDiff = now - lastPayout;
    const fiveMinutes = 5 * 60 * 1000; // 5 phút
    
    if (timeDiff >= fiveMinutes) {
        const intervals = Math.floor(timeDiff / fiveMinutes);
        const income = companyStats[userData.companyLevel].dailyPayout * intervals;
        
        // Tính chi phí bảo trì
        const dailyMaintenance = companyStats[userData.companyLevel].maintenanceCost;
        const daysPassed = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
        const maintenanceCost = dailyMaintenance * daysPassed;
        
        userData.cash += income;
        userData.cash -= maintenanceCost;
        userData.lastPayout = now;
        
        // Tăng rủi ro nếu tiền âm
        if (userData.cash < 0) {
            userData.debt += Math.abs(userData.cash);
            userData.cash = 0;
            userData.riskFactor += 5;
        }
        
        return { income, maintenanceCost, intervals };
    }
    
    return null;
}

// Random events
function checkRandomEvents(userData) {
    const events = [];
    
    // Sự kiện rủi ro cao
    if (userData.riskFactor > 50 && Math.random() < 0.3) {
        const loss = Math.floor(userData.cash * 0.2);
        userData.cash -= loss;
        userData.riskFactor += 10;
        events.push(`⚠️ BÊ BỐI! Công ty bạn bị phạt $${formatMoney(loss)}!`);
    }
    
    // Sự kiện may mắn
    if (userData.riskFactor < 20 && Math.random() < 0.1) {
        const bonus = Math.floor(userData.cash * 0.15);
        userData.cash += bonus;
        events.push(`🍀 MAY MẮN! Bạn nhận được hợp đồng lớn +$${formatMoney(bonus)}!`);
    }
    
    // Kiểm tra phá sản
    if (userData.debt > userData.cash * 10 && userData.riskFactor > 80) {
        events.push(`💥 PHÁ SẢN! Công ty bạn đã bị thanh lý!`);
        return { events, bankrupt: true };
    }
    
    return { events, bankrupt: false };
}

// Cập nhật bảng xếp hạng
function updateLeaderboard(userID, userData) {
    const globalData = readData(globalDataPath);
    const netWorth = userData.cash - userData.debt;
    
    const existingIndex = globalData.companies.findIndex(c => c.userID === userID);
    const companyData = {
        userID,
        companyName: userData.companyName,
        netWorth,
        level: userData.companyLevel
    };
    
    if (existingIndex !== -1) {
        globalData.companies[existingIndex] = companyData;
    } else {
        globalData.companies.push(companyData);
    }
    
    globalData.companies.sort((a, b) => b.netWorth - a.netWorth);
    saveData(globalDataPath, globalData);
}

module.exports.run = async function({ api, event, args, Users }) {
    const { threadID, messageID, senderID } = event;
    const userID = senderID;
    
    initData();
    const userData = readData(dataPath);
    const companyStats = readData(companyStatsPath);
    const action = args[0]?.toLowerCase();
    
    // Auto calculate passive income
    if (userData[userID]) {
        const income = calculatePassiveIncome(userData[userID], companyStats);
        if (income) {
            const events = checkRandomEvents(userData[userID]);
            if (events.bankrupt) {
                delete userData[userID];
                saveData(dataPath, userData);
                return api.sendMessage(`💥 PHÁ SẢN!\n\nCông ty của bạn đã bị thanh lý do nợ quá nhiều và rủi ro cao!\n\nHãy dùng '!dechete batdau' để bắt đầu lại!`, threadID, messageID);
            }
            saveData(dataPath, userData);
            updateLeaderboard(userID, userData[userID]);
        }
    }
    
    switch (action) {
        case 'batdau':
        case 'start': {
            if (userData[userID]) {
                return api.sendMessage('🏢 Bạn đã có công ty rồi! Dùng "!dechete trangthai" để xem trạng thái.', threadID, messageID);
            }
            
            return api.sendMessage('🏢 Chào mừng đến với Đế Chế Tài Chính!\n\nHãy nhập tên công ty của bạn:', threadID, (err, info) => {
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    type: 'createCompany'
                });
            }, messageID);
        }
        
        case 'trangthai':
        case 'status': {
            if (!userData[userID]) {
                return api.sendMessage('🏢 Bạn chưa có công ty! Dùng "!dechete batdau" để bắt đầu.', threadID, messageID);
            }
            
            try {
                const imageBuffer = await createCompanyImage(userData[userID], companyStats);
                return api.sendMessage({
                    body: '🏢 Trạng thái công ty của bạn:',
                    attachment: imageBuffer
                }, threadID, messageID);
            } catch (error) {
                const user = userData[userID];
                const stats = companyStats[user.companyLevel];
                const message = `🏢 ${user.companyName}\n\n` +
                    `🔸 Cấp độ: Level ${user.companyLevel}\n` +
                    `💰 Tiền mặt: $${formatMoney(user.cash)}\n` +
                    `💳 Nợ: $${formatMoney(user.debt)}\n` +
                    `💎 Tài sản thực: $${formatMoney(user.cash - user.debt)}\n` +
                    `⚡ Thu nhập/5p: $${formatMoney(stats.dailyPayout)}\n` +
                    `🔧 Chi phí BT/ngày: $${formatMoney(stats.maintenanceCost)}\n` +
                    `⚠️ Rủi ro: ${user.riskFactor}%\n\n` +
                    `Credit: Kaori Waguri`;
                return api.sendMessage(message, threadID, messageID);
            }
        }
        
        case 'nangcap':
        case 'upgrade': {
            if (!userData[userID]) {
                return api.sendMessage('🏢 Bạn chưa có công ty! Dùng "!dechete batdau" để bắt đầu.', threadID, messageID);
            }
            
            const user = userData[userID];
            const nextLevel = user.companyLevel + 1;
            
            if (nextLevel > 10) {
                return api.sendMessage('🏢 Công ty bạn đã đạt cấp độ tối đa!', threadID, messageID);
            }
            
            const upgradeCost = companyStats[nextLevel].upgradeCost;
            
            if (user.cash < upgradeCost) {
                return api.sendMessage(`💰 Không đủ tiền để nâng cấp!\n\nCần: $${formatMoney(upgradeCost)}\nHiện có: $${formatMoney(user.cash)}`, threadID, messageID);
            }
            
            user.cash -= upgradeCost;
            user.companyLevel = nextLevel;
            user.riskFactor = Math.max(0, user.riskFactor - 5); // Giảm rủi ro khi nâng cấp
            
            saveData(dataPath, userData);
            updateLeaderboard(userID, user);
            
            return api.sendMessage(`🎉 NÂNG CẤP THÀNH CÔNG!\n\n🏢 ${user.companyName} đã lên Level ${nextLevel}!\n💰 Chi phí: $${formatMoney(upgradeCost)}\n⚡ Thu nhập mới: $${formatMoney(companyStats[nextLevel].dailyPayout)}/5p`, threadID, messageID);
        }
        
        case 'vayngan':
        case 'loan': {
            if (!userData[userID]) {
                return api.sendMessage('🏢 Bạn chưa có công ty! Dùng "!dechete batdau" để bắt đầu.', threadID, messageID);
            }
            
            const amount = parseInt(args[1]);
            if (!amount || amount <= 0) {
                return api.sendMessage('💳 Vui lòng nhập số tiền muốn vay!\nVí dụ: !dechete vayngan 10000', threadID, messageID);
            }
            
            const user = userData[userID];
            const maxLoan = user.cash * 5; // Tối đa vay 5 lần tiền hiện có
            
            if (amount > maxLoan) {
                return api.sendMessage(`💳 Số tiền vay quá lớn!\nTối đa có thể vay: $${formatMoney(maxLoan)}`, threadID, messageID);
            }
            
            const interest = Math.floor(amount * 0.2); // Lãi suất 20%
            user.cash += amount;
            user.debt += amount + interest;
            user.riskFactor += Math.floor(amount / 10000); // Tăng rủi ro
            
            saveData(dataPath, userData);
            
            return api.sendMessage(`💳 VAY THÀNH CÔNG!\n\n💰 Nhận: $${formatMoney(amount)}\n💸 Nợ thêm: $${formatMoney(amount + interest)}\n⚠️ Rủi ro tăng: +${Math.floor(amount / 10000)}%`, threadID, messageID);
        }
        
        case 'trano':
        case 'repay': {
            if (!userData[userID]) {
                return api.sendMessage('🏢 Bạn chưa có công ty! Dùng "!dechete batdau" để bắt đầu.', threadID, messageID);
            }
            
            const amount = parseInt(args[1]);
            if (!amount || amount <= 0) {
                return api.sendMessage('💳 Vui lòng nhập số tiền muốn trả!\nVí dụ: !dechete trano 10000', threadID, messageID);
            }
            
            const user = userData[userID];
            
            if (user.debt === 0) {
                return api.sendMessage('💳 Bạn không có nợ nào cần trả!', threadID, messageID);
            }
            
            if (user.cash < amount) {
                return api.sendMessage(`💰 Không đủ tiền!\nCần: $${formatMoney(amount)}\nHiện có: $${formatMoney(user.cash)}`, threadID, messageID);
            }
            
            const actualPayment = Math.min(amount, user.debt);
            user.cash -= actualPayment;
            user.debt -= actualPayment;
            user.riskFactor = Math.max(0, user.riskFactor - Math.floor(actualPayment / 5000));
            
            saveData(dataPath, userData);
            
            return api.sendMessage(`💳 TRẢ NỢ THÀNH CÔNG!\n\n💰 Đã trả: $${formatMoney(actualPayment)}\n💸 Nợ còn lại: $${formatMoney(user.debt)}\n⚠️ Rủi ro giảm: -${Math.floor(actualPayment / 5000)}%`, threadID, messageID);
        }
        
        case 'bangxephang':
        case 'leaderboard': {
            const globalData = readData(globalDataPath);
            
            if (globalData.companies.length === 0) {
                return api.sendMessage('📊 Chưa có công ty nào trong bảng xếp hạng!', threadID, messageID);
            }
            
            let message = '🏆 BẢNG XẾP HẠNG ĐẾ CHẾ TÀI CHÍNH\n\n';
            
            for (let i = 0; i < Math.min(10, globalData.companies.length); i++) {
                const company = globalData.companies[i];
                const userName = await Users.getNameUser(company.userID) || 'Unknown';
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                
                message += `${medal} ${company.companyName}\n`;
                message += `   👤 ${userName}\n`;
                message += `   💎 $${formatMoney(company.netWorth)} | Lv.${company.level}\n\n`;
            }
            
            message += 'Credit: Kaori Waguri';
            return api.sendMessage(message, threadID, messageID);
        }
        
        case 'dautus':
        case 'invest': {
            if (!userData[userID]) {
                return api.sendMessage('🏢 Bạn chưa có công ty! Dùng "!dechete batdau" để bắt đầu.', threadID, messageID);
            }
            
            const amount = parseInt(args[1]);
            if (!amount || amount <= 0) {
                return api.sendMessage('📈 Vui lòng nhập số tiền muốn đầu tư!\nVí dụ: !dechete dautus 10000', threadID, messageID);
            }
            
            const user = userData[userID];
            
            if (user.cash < amount) {
                return api.sendMessage(`💰 Không đủ tiền đầu tư!\nCần: $${formatMoney(amount)}\nHiện có: $${formatMoney(user.cash)}`, threadID, messageID);
            }
            
            const success = Math.random() > 0.5;
            const multiplier = success ? (1 + Math.random() * 0.8) : (0.2 + Math.random() * 0.6);
            const result = Math.floor(amount * multiplier);
            
            user.cash -= amount;
            user.cash += result;
            
            if (success) {
                user.riskFactor = Math.max(0, user.riskFactor - 2);
            } else {
                user.riskFactor += 3;
            }
            
            saveData(dataPath, userData);
            
            const profit = result - amount;
            const status = success ? '📈 THÀNH CÔNG' : '📉 THẤT BẠI';
            const profitText = profit >= 0 ? `+$${formatMoney(profit)}` : `-$${formatMoney(Math.abs(profit))}`;
            
            return api.sendMessage(`${status}!\n\n💰 Đầu tư: $${formatMoney(amount)}\n💎 Nhận về: $${formatMoney(result)}\n📊 Lãi/lỗ: ${profitText}`, threadID, messageID);
        }
        
        case 'banthuong':
        case 'market': {
            const market = [
                { name: '🏭 Nhà máy sản xuất', price: 50000, income: 5000 },
                { name: '🏢 Tòa nhà văn phòng', price: 100000, income: 8000 },
                { name: '🏪 Chuỗi cửa hàng', price: 200000, income: 15000 },
                { name: '⚡ Nhà máy điện', price: 500000, income: 35000 },
                { name: '🛢️ Giếng dầu', price: 1000000, income: 70000 }
            ];
            
            let message = '🏪 THỊ TRƯỜNG BẤT ĐỘNG SẢN\n\n';
            market.forEach((item, index) => {
                message += `${index + 1}. ${item.name}\n`;
                message += `   💰 Giá: $${formatMoney(item.price)}\n`;
                message += `   📈 Thu nhập: $${formatMoney(item.income)}/ngày\n\n`;
            });
            
            message += 'Dùng: !dechete muadatsan <số> để mua';
            return api.sendMessage(message, threadID, messageID);
        }
        
        case 'admin_reset': {
            if (!global.config.ADMINBOT.includes(senderID)) {
                return api.sendMessage('❌ Bạn không có quyền sử dụng lệnh này!', threadID, messageID);
            }
            
            const target = args[1];
            if (!target) {
                return api.sendMessage('🔧 Cú pháp: !dechete admin_reset <userID/all>', threadID, messageID);
            }
            
            if (target === 'all') {
                fs.writeFileSync(dataPath, JSON.stringify({}, null, 2));
                fs.writeFileSync(globalDataPath, JSON.stringify({ companies: [] }, null, 2));
                return api.sendMessage('🔧 Đã reset toàn bộ dữ liệu game!', threadID, messageID);
            } else {
                if (userData[target]) {
                    delete userData[target];
                    saveData(dataPath, userData);
                    return api.sendMessage(`🔧 Đã reset dữ liệu của user ${target}!`, threadID, messageID);
                } else {
                    return api.sendMessage('❌ User không tồn tại trong hệ thống!', threadID, messageID);
                }
            }
        }
        
        case 'admin_add': {
            if (!global.config.ADMINBOT.includes(senderID)) {
                return api.sendMessage('❌ Bạn không có quyền sử dụng lệnh này!', threadID, messageID);
            }
            
            const target = args[1];
            const amount = parseInt(args[2]);
            
            if (!target || !amount) {
                return api.sendMessage('🔧 Cú pháp: !dechete admin_add <userID> <amount>', threadID, messageID);
            }
            
            if (!userData[target]) {
                return api.sendMessage('❌ User chưa có công ty!', threadID, messageID);
            }
            
            userData[target].cash += amount;
            saveData(dataPath, userData);
            
            return api.sendMessage(`🔧 Đã thêm $${formatMoney(amount)} cho ${target}!`, threadID, messageID);
        }
        
        default: {
            return api.sendMessage(`🏢 ĐẾ CHẾ TÀI CHÍNH 🏢
Credit: Kaori Waguri

📋 CÁC LỆNH:
!dechete batdau - Tạo công ty mới
!dechete trangthai - Xem trạng thái công ty
!dechete nangcap - Nâng cấp công ty
!dechete vayngan <số> - Vay tiền
!dechete trano <số> - Trả nợ
!dechete bangxephang - Bảng xếp hạng
!dechete dautus <số> - Đầu tư cổ phiếu
!dechete banthuong - Thị trường BĐS

⚡ Thu nhập tự động mỗi 5 phút!
⚠️ Chú ý chi phí bảo trì và rủi ro phá sản!`, threadID, messageID);
        }
    }
};

module.exports.handleReply = async function({ api, event, handleReply, Users }) {
    const { threadID, messageID, senderID, body } = event;
    const { type, author } = handleReply;
    
    if (senderID !== author) return;
    
    if (type === 'createCompany') {
        if (!body || body.length < 3) {
            return api.sendMessage('❌ Tên công ty phải có ít nhất 3 ký tự!', threadID, messageID);
        }
        
        if (body.length > 30) {
            return api.sendMessage('❌ Tên công ty không được quá 30 ký tự!', threadID, messageID);
        }
        
        const userData = readData(dataPath);
        
        // Kiểm tra tên trùng
        const existingNames = Object.values(userData).map(u => u.companyName.toLowerCase());
        if (existingNames.includes(body.toLowerCase())) {
            return api.sendMessage('❌ Tên công ty đã tồn tại! Vui lòng chọn tên khác.', threadID, messageID);
        }
        
        userData[senderID] = {
            companyName: body,
            cash: 10000,
            debt: 0,
            companyLevel: 1,
            lastPayout: Date.now(),
            riskFactor: 0
        };
        
        saveData(dataPath, userData);
        updateLeaderboard(senderID, userData[senderID]);
        
        return api.sendMessage(`🎉 CHÚC MỪNG!\n\n🏢 Công ty "${body}" đã được thành lập!\n💰 Vốn ban đầu: $10,000\n⚡ Thu nhập: $1,000/5p\n\nChúc bạn xây dựng đế chế thành công!`, threadID, messageID);
    }
};
