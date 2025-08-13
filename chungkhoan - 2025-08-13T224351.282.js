
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { createCanvas, loadImage, registerFont } = require('canvas');

module.exports.config = {
    name: "chungkhoan",
    version: "1.0.0", 
    hasPermssion: 0,
    credits: "DeepSeek AI Stock System",
    description: "Hệ thống chứng khoán ảo với AI DeepSeek",
    commandCategory: "Tài chính",
    usages: "[mua/ban/xem/top/thitruong/lichsu]",
    cooldowns: 3,
    dependencies: {
        "canvas": "",
        "axios": ""
    }
};

// DeepSeek API configuration
const DEEPSEEK_API_KEY = "sk-eb7832d105d949bf8821a49614ea6004";
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

// Khởi tạo dữ liệu thị trường
const initMarketData = () => {
    return {
        stocks: {
            "MIRAI": { name: "Mirai Corp", price: 100, change: 0, volume: 1000, sector: "Tech" },
            "BOTCOIN": { name: "Bot Coin Ltd", price: 50, change: 0, volume: 800, sector: "Crypto" },
            "AICORP": { name: "AI Corporation", price: 150, change: 0, volume: 1200, sector: "AI" },
            "TECHVN": { name: "Tech Vietnam", price: 75, change: 0, volume: 900, sector: "Tech" },
            "GAMEVN": { name: "Game Vietnam", price: 25, change: 0, volume: 600, sector: "Gaming" },
            "SOCIALNET": { name: "Social Network Co", price: 120, change: 0, volume: 1100, sector: "Social" }
        },
        marketTrend: "stable",
        lastUpdate: Date.now(),
        dailyNews: []
    };
};

// Gọi DeepSeek API
async function callDeepSeekAPI(prompt) {
    try {
        const response = await axios.post(DEEPSEEK_API_URL, {
            model: "deepseek-chat",
            messages: [{
                role: "user",
                content: prompt
            }],
            temperature: 0.7,
            max_tokens: 500
        }, {
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("DeepSeek API Error:", error.response?.data || error.message);
        return null;
    }
}

// Cập nhật thị trường với AI
async function updateMarketWithAI(marketData) {
    const prompt = `
    Bạn là một chuyên gia thị trường chứng khoán. Hãy cập nhật giá các cổ phiếu sau dựa trên xu hướng thị trường hiện tại.
    
    Danh sách cổ phiếu:
    ${Object.entries(marketData.stocks).map(([symbol, data]) => 
        `${symbol}: ${data.name} - Giá hiện tại: ${data.price} - Ngành: ${data.sector}`
    ).join('\n')}
    
    Xu hướng thị trường hiện tại: ${marketData.marketTrend}
    
    Hãy trả về dữ liệu JSON với format:
    {
        "updates": {
            "SYMBOL": {"price": number, "change": number},
            ...
        },
        "marketTrend": "bull|bear|stable",
        "news": "Tin tức thị trường ngắn gọn"
    }
    
    Thay đổi giá nên hợp lý, không quá 10% mỗi lần cập nhật.
    `;

    const aiResponse = await callDeepSeekAPI(prompt);
    if (!aiResponse) return marketData;

    try {
        const aiData = JSON.parse(aiResponse);
        
        // Cập nhật giá cổ phiếu
        if (aiData.updates) {
            for (const [symbol, update] of Object.entries(aiData.updates)) {
                if (marketData.stocks[symbol]) {
                    const oldPrice = marketData.stocks[symbol].price;
                    marketData.stocks[symbol].price = Math.max(1, update.price);
                    marketData.stocks[symbol].change = ((marketData.stocks[symbol].price - oldPrice) / oldPrice * 100);
                    marketData.stocks[symbol].volume += Math.floor(Math.random() * 200) - 100;
                }
            }
        }

        // Cập nhật xu hướng thị trường
        if (aiData.marketTrend) {
            marketData.marketTrend = aiData.marketTrend;
        }

        // Thêm tin tức
        if (aiData.news) {
            marketData.dailyNews.unshift({
                content: aiData.news,
                time: new Date().toLocaleTimeString('vi-VN')
            });
            if (marketData.dailyNews.length > 5) {
                marketData.dailyNews = marketData.dailyNews.slice(0, 5);
            }
        }

        marketData.lastUpdate = Date.now();
        return marketData;
    } catch (error) {
        console.error("Error parsing AI response:", error);
        return marketData;
    }
}

// Tạo biểu đồ thị trường
async function createMarketChart(marketData, userPortfolio = null) {
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 600);
    gradient.addColorStop(0, '#0a0e1a');
    gradient.addColorStop(1, '#1a1f36');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 600);

    // Header
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏛️ MIRAI STOCK MARKET 🏛️', 400, 40);

    // Market trend indicator
    const trendColor = marketData.marketTrend === 'bull' ? '#00ff88' : 
                      marketData.marketTrend === 'bear' ? '#ff4757' : '#ffa502';
    const trendText = marketData.marketTrend === 'bull' ? '📈 TĂNG' : 
                     marketData.marketTrend === 'bear' ? '📉 GIẢM' : '📊 ỔN ĐỊNH';
    
    ctx.fillStyle = trendColor;
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Xu hướng: ${trendText}`, 400, 70);

    // Stock list header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Mã CK', 50, 120);
    ctx.fillText('Tên công ty', 150, 120);
    ctx.fillText('Giá', 350, 120);
    ctx.fillText('Thay đổi', 450, 120);
    ctx.fillText('Khối lượng', 580, 120);

    // Draw line separator
    ctx.strokeStyle = '#3c4560';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 135);
    ctx.lineTo(770, 135);
    ctx.stroke();

    // Stock list
    let y = 165;
    Object.entries(marketData.stocks).forEach(([symbol, stock], index) => {
        const changeColor = stock.change > 0 ? '#00ff88' : stock.change < 0 ? '#ff4757' : '#ffa502';
        const changeText = stock.change > 0 ? '+' + stock.change.toFixed(2) + '%' : stock.change.toFixed(2) + '%';
        
        // Alternating row background
        if (index % 2 === 0) {
            ctx.fillStyle = 'rgba(60, 69, 96, 0.3)';
            ctx.fillRect(30, y - 20, 740, 35);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(symbol, 50, y);
        
        ctx.fillStyle = '#c5c9d6';
        ctx.font = '12px Arial';
        ctx.fillText(stock.name, 150, y);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(stock.price.toLocaleString() + ' BAO', 350, y);
        
        ctx.fillStyle = changeColor;
        ctx.fillText(changeText, 450, y);
        
        ctx.fillStyle = '#c5c9d6';
        ctx.font = '12px Arial';
        ctx.fillText(stock.volume.toLocaleString(), 580, y);

        y += 40;
    });

    // Portfolio section (nếu có)
    if (userPortfolio && Object.keys(userPortfolio.stocks || {}).length > 0) {
        y += 20;
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('📊 Danh mục của bạn:', 50, y);
        
        y += 25;
        let totalValue = 0;
        Object.entries(userPortfolio.stocks).forEach(([symbol, shares]) => {
            if (marketData.stocks[symbol]) {
                const value = shares * marketData.stocks[symbol].price;
                totalValue += value;
                
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px Arial';
                ctx.fillText(`${symbol}: ${shares} cổ phiếu × ${marketData.stocks[symbol].price} = ${value.toLocaleString()} BAO`, 70, y);
                y += 20;
            }
        });
        
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(`💰 Tổng giá trị: ${totalValue.toLocaleString()} BAO`, 50, y + 10);
    }

    // News section
    if (marketData.dailyNews.length > 0) {
        ctx.fillStyle = '#ffa502';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('📰 Tin tức thị trường:', 50, 520);
        
        ctx.fillStyle = '#c5c9d6';
        ctx.font = '11px Arial';
        const newsText = marketData.dailyNews[0].content;
        const words = newsText.split(' ');
        let line = '';
        let y = 545;
        
        for (const word of words) {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > 700 && line !== '') {
                ctx.fillText(line, 50, y);
                line = word + ' ';
                y += 15;
            } else {
                line = testLine;
            }
        }
        if (line !== '') {
            ctx.fillText(line, 50, y);
        }
    }

    // Footer
    ctx.fillStyle = '#576574';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Cập nhật lần cuối: ${new Date(marketData.lastUpdate).toLocaleString('vi-VN')} | Powered by DeepSeek AI`, 400, 590);

    return canvas.toBuffer();
}

// Lưu/Đọc dữ liệu
const dataPath = path.join(__dirname, 'cache', 'chungkhoan');
const marketFile = path.join(dataPath, 'market.json');
const usersFile = path.join(dataPath, 'users.json');

async function loadMarketData() {
    if (!fs.existsSync(dataPath)) {
        await fs.mkdirs(dataPath);
    }
    
    if (fs.existsSync(marketFile)) {
        return JSON.parse(await fs.readFile(marketFile, 'utf8'));
    } else {
        const initialData = initMarketData();
        await fs.writeFile(marketFile, JSON.stringify(initialData, null, 2));
        return initialData;
    }
}

async function saveMarketData(data) {
    await fs.writeFile(marketFile, JSON.stringify(data, null, 2));
}

async function loadUserData() {
    if (fs.existsSync(usersFile)) {
        return JSON.parse(await fs.readFile(usersFile, 'utf8'));
    }
    return {};
}

async function saveUserData(data) {
    await fs.writeFile(usersFile, JSON.stringify(data, null, 2));
}

// Auto update thị trường (chạy mỗi 10 phút)
let autoUpdateInterval;
async function startAutoUpdate(api) {
    if (autoUpdateInterval) return;
    
    autoUpdateInterval = setInterval(async () => {
        try {
            let marketData = await loadMarketData();
            marketData = await updateMarketWithAI(marketData);
            await saveMarketData(marketData);
            
            // Thông báo cho các nhóm đã bật auto notify
            const userData = await loadUserData();
            const chartBuffer = await createMarketChart(marketData);
            
            for (const [threadID, data] of Object.entries(userData)) {
                if (data.autoNotify) {
                    api.sendMessage({
                        body: `🔔 CẬP NHẬT THỊ TRƯỜNG TỰ ĐỘNG\n\n📈 Xu hướng: ${marketData.marketTrend.toUpperCase()}\n🕐 ${new Date().toLocaleTimeString('vi-VN')}\n\n💡 Sử dụng "chungkhoan xem" để xem chi tiết!`,
                        attachment: fs.createReadStream(path.join(dataPath, 'temp_chart.png'))
                    }, threadID);
                }
            }
            
            // Lưu chart tạm
            await fs.writeFile(path.join(dataPath, 'temp_chart.png'), chartBuffer);
            
        } catch (error) {
            console.error("Auto update error:", error);
        }
    }, 10 * 60 * 1000); // 10 phút
}

module.exports.run = async function({ api, event, args, Currencies, Users }) {
    const { threadID, messageID, senderID } = event;
    
    // Start auto update nếu chưa chạy
    startAutoUpdate(api);
    
    if (!args[0]) {
        return api.sendMessage(`🏛️ HỆ THỐNG CHỨNG KHOÁN MIRAI\n━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 LỆNH CƠ BẢN:\n• chungkhoan xem - Xem thị trường\n• chungkhoan mua [mã] [số lượng] - Mua cổ phiếu\n• chungkhoan ban [mã] [số lượng] - Bán cổ phiếu\n• chungkhoan lichsu - Xem lịch sử giao dịch\n\n🎯 LỆNH NÂNG CAO:\n• chungkhoan top - Xem top nhà đầu tư\n• chungkhoan auto [on/off] - Bật/tắt thông báo tự động\n• chungkhoan ai [câu hỏi] - Tư vấn từ AI\n\n💡 Hệ thống được vận hành bởi DeepSeek AI`, threadID, messageID);
    }

    let marketData = await loadMarketData();
    let userData = await loadUserData();

    // Khởi tạo dữ liệu user nếu chưa có
    if (!userData[threadID]) {
        userData[threadID] = {
            users: {},
            autoNotify: false
        };
    }

    if (!userData[threadID].users[senderID]) {
        userData[threadID].users[senderID] = {
            stocks: {},
            transactions: [],
            totalInvested: 0,
            totalValue: 0
        };
    }

    const command = args[0].toLowerCase();

    switch (command) {
        case 'xem':
        case 'thitruong':
            // Cập nhật thị trường trước khi hiển thị
            marketData = await updateMarketWithAI(marketData);
            await saveMarketData(marketData);

            const userPortfolio = userData[threadID].users[senderID];
            const chartBuffer = await createMarketChart(marketData, userPortfolio);
            const chartPath = path.join(dataPath, `chart_${threadID}_${Date.now()}.png`);
            await fs.writeFile(chartPath, chartBuffer);

            api.sendMessage({
                body: `🏛️ THỊ TRƯỜNG CHỨNG KHOÁN MIRAI\n\n📈 Xu hướng: ${marketData.marketTrend.toUpperCase()}\n🕐 Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}\n\n💡 Sử dụng "chungkhoan mua [mã] [số lượng]" để đầu tư!`,
                attachment: fs.createReadStream(chartPath)
            }, threadID, () => fs.unlink(chartPath), messageID);
            break;

        case 'mua':
            if (!args[1] || !args[2]) {
                return api.sendMessage("❌ Sử dụng: chungkhoan mua [mã cổ phiếu] [số lượng]\nVí dụ: chungkhoan mua MIRAI 10", threadID, messageID);
            }

            const buySymbol = args[1].toUpperCase();
            const buyQuantity = parseInt(args[2]);

            if (!marketData.stocks[buySymbol]) {
                return api.sendMessage(`❌ Không tìm thấy mã cổ phiếu "${buySymbol}"\nCác mã có sẵn: ${Object.keys(marketData.stocks).join(', ')}`, threadID, messageID);
            }

            if (buyQuantity <= 0) {
                return api.sendMessage("❌ Số lượng mua phải lớn hơn 0!", threadID, messageID);
            }

            const buyPrice = marketData.stocks[buySymbol].price;
            const totalCost = buyPrice * buyQuantity;
            const userMoney = (await Currencies.getData(senderID)).money;

            if (userMoney < totalCost) {
                return api.sendMessage(`❌ Không đủ tiền!\nCần: ${totalCost.toLocaleString()} BAO\nCó: ${userMoney.toLocaleString()} BAO\nThiếu: ${(totalCost - userMoney).toLocaleString()} BAO`, threadID, messageID);
            }

            // Thực hiện giao dịch
            await Currencies.decreaseMoney(senderID, totalCost);
            
            if (!userData[threadID].users[senderID].stocks[buySymbol]) {
                userData[threadID].users[senderID].stocks[buySymbol] = 0;
            }
            userData[threadID].users[senderID].stocks[buySymbol] += buyQuantity;
            userData[threadID].users[senderID].totalInvested += totalCost;
            
            // Lưu lịch sử giao dịch
            userData[threadID].users[senderID].transactions.push({
                type: 'BUY',
                symbol: buySymbol,
                quantity: buyQuantity,
                price: buyPrice,
                total: totalCost,
                time: new Date().toLocaleString('vi-VN')
            });

            await saveUserData(userData);

            api.sendMessage(`✅ MUA THÀNH CÔNG!\n\n🏷️ Mã: ${buySymbol}\n📊 Số lượng: ${buyQuantity} cổ phiếu\n💰 Giá: ${buyPrice.toLocaleString()} BAO/cổ phiếu\n💸 Tổng tiền: ${totalCost.toLocaleString()} BAO\n\n📈 Bạn đang sở hữu ${userData[threadID].users[senderID].stocks[buySymbol]} cổ phiếu ${buySymbol}`, threadID, messageID);
            break;

        case 'ban':
            if (!args[1] || !args[2]) {
                return api.sendMessage("❌ Sử dụng: chungkhoan ban [mã cổ phiếu] [số lượng]\nVí dụ: chungkhoan ban MIRAI 5", threadID, messageID);
            }

            const sellSymbol = args[1].toUpperCase();
            const sellQuantity = parseInt(args[2]);

            if (!marketData.stocks[sellSymbol]) {
                return api.sendMessage(`❌ Không tìm thấy mã cổ phiếu "${sellSymbol}"`, threadID, messageID);
            }

            if (!userData[threadID].users[senderID].stocks[sellSymbol] || userData[threadID].users[senderID].stocks[sellSymbol] < sellQuantity) {
                const owned = userData[threadID].users[senderID].stocks[sellSymbol] || 0;
                return api.sendMessage(`❌ Không đủ cổ phiếu để bán!\nBạn có: ${owned} cổ phiếu ${sellSymbol}\nMuốn bán: ${sellQuantity} cổ phiếu`, threadID, messageID);
            }

            const sellPrice = marketData.stocks[sellSymbol].price;
            const totalRevenue = sellPrice * sellQuantity;

            // Thực hiện bán
            await Currencies.increaseMoney(senderID, totalRevenue);
            userData[threadID].users[senderID].stocks[sellSymbol] -= sellQuantity;
            
            if (userData[threadID].users[senderID].stocks[sellSymbol] === 0) {
                delete userData[threadID].users[senderID].stocks[sellSymbol];
            }

            // Lưu lịch sử giao dịch
            userData[threadID].users[senderID].transactions.push({
                type: 'SELL',
                symbol: sellSymbol,
                quantity: sellQuantity,
                price: sellPrice,
                total: totalRevenue,
                time: new Date().toLocaleString('vi-VN')
            });

            await saveUserData(userData);

            api.sendMessage(`✅ BÁN THÀNH CÔNG!\n\n🏷️ Mã: ${sellSymbol}\n📊 Số lượng: ${sellQuantity} cổ phiếu\n💰 Giá: ${sellPrice.toLocaleString()} BAO/cổ phiếu\n💵 Tổng tiền nhận: ${totalRevenue.toLocaleString()} BAO\n\n📊 Còn lại: ${userData[threadID].users[senderID].stocks[sellSymbol] || 0} cổ phiếu ${sellSymbol}`, threadID, messageID);
            break;

        case 'lichsu':
            const userTransactions = userData[threadID].users[senderID].transactions || [];
            
            if (userTransactions.length === 0) {
                return api.sendMessage("📝 Bạn chưa có giao dịch nào!", threadID, messageID);
            }

            let historyMsg = `📊 LỊCH SỬ GIAO DỊCH\n━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            const recentTransactions = userTransactions.slice(-10); // 10 giao dịch gần nhất

            recentTransactions.forEach((trans, index) => {
                const icon = trans.type === 'BUY' ? '🟢' : '🔴';
                const action = trans.type === 'BUY' ? 'MUA' : 'BÁN';
                historyMsg += `${icon} ${action} ${trans.symbol}\n`;
                historyMsg += `   └ ${trans.quantity} cổ phiếu × ${trans.price} = ${trans.total.toLocaleString()} BAO\n`;
                historyMsg += `   └ ${trans.time}\n\n`;
            });

            if (userTransactions.length > 10) {
                historyMsg += `📝 Hiển thị 10/${userTransactions.length} giao dịch gần nhất`;
            }

            api.sendMessage(historyMsg, threadID, messageID);
            break;

        case 'top':
            // Tính toán top nhà đầu tư
            let investors = [];
            
            for (const [tid, threadData] of Object.entries(userData)) {
                for (const [uid, user] of Object.entries(threadData.users)) {
                    let totalValue = 0;
                    for (const [symbol, shares] of Object.entries(user.stocks)) {
                        if (marketData.stocks[symbol]) {
                            totalValue += shares * marketData.stocks[symbol].price;
                        }
                    }
                    
                    if (totalValue > 0) {
                        investors.push({
                            userID: uid,
                            threadID: tid,
                            totalValue,
                            totalInvested: user.totalInvested || 0
                        });
                    }
                }
            }

            investors.sort((a, b) => b.totalValue - a.totalValue);
            
            let topMsg = `🏆 TOP NHÀ ĐẦU TƯ\n━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            for (let i = 0; i < Math.min(10, investors.length); i++) {
                const investor = investors[i];
                const userName = await Users.getNameUser(investor.userID) || "Unknown";
                const rank = i + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
                
                topMsg += `${medal} ${userName}\n`;
                topMsg += `   💰 Giá trị danh mục: ${investor.totalValue.toLocaleString()} BAO\n`;
                topMsg += `   📊 Đã đầu tư: ${investor.totalInvested.toLocaleString()} BAO\n\n`;
            }

            api.sendMessage(topMsg, threadID, messageID);
            break;

        case 'auto':
            if (!args[1] || !['on', 'off'].includes(args[1].toLowerCase())) {
                return api.sendMessage("❌ Sử dụng: chungkhoan auto [on/off]", threadID, messageID);
            }

            const autoMode = args[1].toLowerCase() === 'on';
            userData[threadID].autoNotify = autoMode;
            await saveUserData(userData);

            api.sendMessage(`${autoMode ? '✅' : '❌'} Đã ${autoMode ? 'BẬT' : 'TẮT'} thông báo tự động cập nhật thị trường!${autoMode ? '\n\n🔔 Bot sẽ gửi cập nhật thị trường mỗi 10 phút' : ''}`, threadID, messageID);
            break;

        case 'ai':
            if (!args[1]) {
                return api.sendMessage("❌ Hãy đặt câu hỏi cho AI!\nVí dụ: chungkhoan ai nên mua cổ phiếu nào?", threadID, messageID);
            }

            const question = args.slice(1).join(' ');
            const aiPrompt = `
            Bạn là một chuyên gia tư vấn đầu tư chứng khoán. Hãy trả lời câu hỏi sau dựa trên dữ liệu thị trường hiện tại:

            Câu hỏi: ${question}

            Dữ liệu thị trường:
            ${Object.entries(marketData.stocks).map(([symbol, data]) => 
                `${symbol}: ${data.name} - Giá: ${data.price} BAO - Thay đổi: ${data.change.toFixed(2)}% - Ngành: ${data.sector}`
            ).join('\n')}

            Xu hướng thị trường: ${marketData.marketTrend}

            Hãy đưa ra lời khuyên ngắn gọn, dễ hiểu (không quá 300 từ).
            `;

            api.sendMessage("🤖 AI đang phân tích... Vui lòng đợi!", threadID, messageID);

            const aiAdvice = await callDeepSeekAPI(aiPrompt);
            if (aiAdvice) {
                api.sendMessage(`🤖 TƯ VẤN TỪ AI DEEPSEEK:\n━━━━━━━━━━━━━━━━━━━━━━━\n\n${aiAdvice}\n\n💡 Lưu ý: Đây chỉ là tư vấn tham khảo. Quyết định đầu tư là do bạn!`, threadID);
            } else {
                api.sendMessage("❌ Không thể kết nối với AI. Vui lòng thử lại sau!", threadID, messageID);
            }
            break;

        default:
            api.sendMessage("❌ Lệnh không hợp lệ! Sử dụng 'chungkhoan' để xem hướng dẫn.", threadID, messageID);
    }
};

module.exports.handleEvent = async function({ api, event }) {
    // Auto start khi module được load
    if (!autoUpdateInterval) {
        startAutoUpdate(api);
    }
};

module.exports.onLoad = function() {
    console.log("📈 Module chứng khoán với DeepSeek AI đã được tải!");
    
    // Khởi tạo thư mục cache
    const dataPath = path.join(__dirname, 'cache', 'chungkhoan');
    if (!fs.existsSync(dataPath)) {
        fs.mkdirsSync(dataPath);
    }
};
