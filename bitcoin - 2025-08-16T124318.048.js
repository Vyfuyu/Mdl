
const fs = require("fs-extra");
const axios = require("axios");
const Canvas = require("canvas");

module.exports.config = {
    name: "bitcoin",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Kaori Waguri",
    description: "Bitcoin ảo với AI quản lý giá và biểu đồ thời gian thực",
    commandCategory: "Kiếm tiền",
    usages: "bitcoin [mua/ban/gia/bieu-do/vi/lich-su/tin-tuc]",
    cooldowns: 5,
    dependencies: {
        "fs-extra": "",
        "axios": "",
        "canvas": ""
    }
};

// Cấu hình API Cohere
const COHERE_API_KEY = "D0O5lqckf50p3kdODOUMNL333dn0mPYYyqAXuMTd";
const COHERE_API_URL = "https://api.cohere.ai/v1/generate";

// Hàm làm sạch text
function cleanText(text) {
    if (!text) return "";
    return text
        .replace(/[^\w\s.,!?-]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

// Hàm gọi Cohere AI để quản lý giá Bitcoin
async function getCoherePrice() {
    try {
        const prompt = `Tạo giá Bitcoin hiện tại trong khoảng 45000-75000 USD. Chỉ trả về số tiền, không có text khác. Ví dụ: 52847.23`;
        
        const response = await axios.post(COHERE_API_URL, {
            model: "command",
            prompt: prompt,
            max_tokens: 20,
            temperature: 0.8,
            stop_sequences: ["\n"]
        }, {
            headers: {
                'Authorization': `Bearer ${COHERE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        const priceText = response.data.generations[0].text.trim();
        const price = parseFloat(priceText.replace(/[^0-9.]/g, ""));
        
        return isNaN(price) ? (Math.random() * 30000 + 45000) : price;
    } catch (error) {
        console.log("Loi Cohere API:", error.message);
        return Math.random() * 30000 + 45000;
    }
}

// Hàm tạo tin tức Bitcoin bằng Cohere
async function getBitcoinNews() {
    try {
        const prompt = `Tạo tin tức Bitcoin ngắn gọn trong ngày hôm nay (2-3 câu). Nội dung tích cực hoặc tiêu cực ngẫu nhiên về thị trường crypto.`;
        
        const response = await axios.post(COHERE_API_URL, {
            model: "command",
            prompt: prompt,
            max_tokens: 100,
            temperature: 0.9
        }, {
            headers: {
                'Authorization': `Bearer ${COHERE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        return cleanText(response.data.generations[0].text.trim());
    } catch (error) {
        return "Thị trường Bitcoin đang có những biến động thú vị trong ngày hôm nay!";
    }
}

// Hàm lưu/đọc dữ liệu Bitcoin
function getBitcoinData() {
    const dataPath = __dirname + "/cache/bitcoin_data.json";
    if (!fs.existsSync(dataPath)) {
        const initialData = {
            prices: [],
            userWallets: {},
            lastUpdate: Date.now()
        };
        fs.writeFileSync(dataPath, JSON.stringify(initialData, null, 2));
        return initialData;
    }
    return JSON.parse(fs.readFileSync(dataPath));
}

function saveBitcoinData(data) {
    const dataPath = __dirname + "/cache/bitcoin_data.json";
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// Hàm cập nhật giá Bitcoin
async function updateBitcoinPrice() {
    const data = getBitcoinData();
    const newPrice = await getCoherePrice();
    const timestamp = Date.now();
    
    data.prices.push({
        price: newPrice,
        timestamp: timestamp,
        time: new Date().toLocaleString("vi-VN")
    });
    
    // Giữ lại 50 giá gần nhất
    if (data.prices.length > 50) {
        data.prices = data.prices.slice(-50);
    }
    
    data.lastUpdate = timestamp;
    saveBitcoinData(data);
    return newPrice;
}

// Hàm tạo biểu đồ Bitcoin
async function createBitcoinChart() {
    const data = getBitcoinData();
    const prices = data.prices.slice(-24); // 24 điểm dữ liệu gần nhất
    
    if (prices.length < 2) {
        // Tạo dữ liệu mẫu nếu chưa có
        for (let i = 0; i < 24; i++) {
            const price = await getCoherePrice();
            prices.push({
                price: price,
                timestamp: Date.now() - (24 - i) * 3600000,
                time: new Date(Date.now() - (24 - i) * 3600000).toLocaleString("vi-VN")
            });
        }
        data.prices = prices;
        saveBitcoinData(data);
    }
    
    const width = 800;
    const height = 400;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Tính toán giá trị min/max
    const priceValues = prices.map(p => p.price);
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    const priceRange = maxPrice - minPrice;
    
    // Thiết lập khu vực vẽ
    const padding = 60;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    // Vẽ grid
    ctx.strokeStyle = '#ffffff20';
    ctx.lineWidth = 1;
    
    // Grid ngang
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        
        // Labels giá
        const price = maxPrice - (priceRange / 5) * i;
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`$${price.toFixed(0)}`, padding - 10, y + 4);
    }
    
    // Grid dọc
    for (let i = 0; i <= 6; i++) {
        const x = padding + (chartWidth / 6) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
    }
    
    // Vẽ đường giá
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    for (let i = 0; i < prices.length; i++) {
        const x = padding + (chartWidth / (prices.length - 1)) * i;
        const y = padding + chartHeight - ((prices[i].price - minPrice) / priceRange) * chartHeight;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // Vẽ điểm cuối (giá hiện tại)
    const lastPrice = prices[prices.length - 1];
    const lastX = padding + chartWidth;
    const lastY = padding + chartHeight - ((lastPrice.price - minPrice) / priceRange) * chartHeight;
    
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Vẽ vùng tô màu dưới đường
    const fillGradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    fillGradient.addColorStop(0, '#f39c1240');
    fillGradient.addColorStop(1, '#f39c1200');
    
    ctx.fillStyle = fillGradient;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    
    for (let i = 0; i < prices.length; i++) {
        const x = padding + (chartWidth / (prices.length - 1)) * i;
        const y = padding + chartHeight - ((prices[i].price - minPrice) / priceRange) * chartHeight;
        ctx.lineTo(x, y);
    }
    
    ctx.lineTo(width - padding, height - padding);
    ctx.closePath();
    ctx.fill();
    
    // Tiêu đề
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('BITCOIN PRICE CHART', width / 2, 30);
    
    // Giá hiện tại
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#f39c12';
    ctx.fillText(`$${lastPrice.price.toFixed(2)}`, width / 2, height - 15);
    
    // Thay đổi %
    if (prices.length > 1) {
        const prevPrice = prices[prices.length - 2].price;
        const change = ((lastPrice.price - prevPrice) / prevPrice) * 100;
        const changeColor = change >= 0 ? '#27ae60' : '#e74c3c';
        const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        
        ctx.fillStyle = changeColor;
        ctx.font = '14px Arial';
        ctx.fillText(changeText, width / 2, height - 40);
    }
    
    return canvas.toBuffer('image/png');
}

module.exports.run = async ({ event, api, args, Currencies }) => {
    const { threadID, senderID, messageID } = event;
    const command = args[0] || "gia";
    
    try {
        switch (command.toLowerCase()) {
            case "gia":
            case "price": {
                const currentPrice = await updateBitcoinPrice();
                const data = getBitcoinData();
                const prices = data.prices;
                
                let changeText = "";
                if (prices.length > 1) {
                    const prevPrice = prices[prices.length - 2].price;
                    const change = ((currentPrice - prevPrice) / prevPrice) * 100;
                    const emoji = change >= 0 ? "📈" : "📉";
                    changeText = `\n${emoji} Thay đổi: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                }
                
                const message = `
╭─────────────────────╮
│    🪙 GIÁ BITCOIN HIỆN TẠI 🪙    │
╰─────────────────────╯

💰 Giá: $${currentPrice.toFixed(2)}
⏰ Cập nhật: ${new Date().toLocaleString("vi-VN")}${changeText}

🎯 Lệnh khả dụng:
• !bitcoin mua [số lượng] - Mua Bitcoin
• !bitcoin ban [số lượng] - Bán Bitcoin  
• !bitcoin vi - Xem ví Bitcoin
• !bitcoin bieu-do - Xem biểu đồ
• !bitcoin tin-tuc - Tin tức Bitcoin
`;

                return api.sendMessage(message, threadID, messageID);
            }
            
            case "mua":
            case "buy": {
                const amount = parseFloat(args[1]);
                if (!amount || amount <= 0) {
                    return api.sendMessage("❌ Vui lòng nhập số lượng Bitcoin hợp lệ!\nVí dụ: !bitcoin mua 0.1", threadID, messageID);
                }
                
                const currentPrice = await updateBitcoinPrice();
                const totalCost = amount * currentPrice;
                
                const userData = await Currencies.getData(senderID);
                if (!userData || userData.money < totalCost) {
                    return api.sendMessage(`❌ Bạn không đủ tiền để mua ${amount} Bitcoin!\n💰 Cần: $${totalCost.toFixed(2)}\n💳 Có: $${userData ? userData.money : 0}`, threadID, messageID);
                }
                
                // Trừ tiền và cập nhật ví Bitcoin
                await Currencies.decreaseMoney(senderID, Math.floor(totalCost));
                
                const bitcoinData = getBitcoinData();
                if (!bitcoinData.userWallets[senderID]) {
                    bitcoinData.userWallets[senderID] = {
                        bitcoin: 0,
                        totalInvested: 0,
                        transactions: []
                    };
                }
                
                bitcoinData.userWallets[senderID].bitcoin += amount;
                bitcoinData.userWallets[senderID].totalInvested += totalCost;
                bitcoinData.userWallets[senderID].transactions.push({
                    type: "mua",
                    amount: amount,
                    price: currentPrice,
                    total: totalCost,
                    time: new Date().toLocaleString("vi-VN")
                });
                
                saveBitcoinData(bitcoinData);
                
                const message = `
╭─────────────────────╮
│    ✅ MUA BITCOIN THÀNH CÔNG    │
╰─────────────────────╯

🪙 Đã mua: ${amount} BTC
💰 Giá: $${currentPrice.toFixed(2)}/BTC
💸 Tổng chi phí: $${totalCost.toFixed(2)}
📊 Bitcoin hiện có: ${bitcoinData.userWallets[senderID].bitcoin.toFixed(6)} BTC
⏰ ${new Date().toLocaleString("vi-VN")}
`;

                return api.sendMessage(message, threadID, messageID);
            }
            
            case "ban":
            case "sell": {
                const amount = parseFloat(args[1]);
                if (!amount || amount <= 0) {
                    return api.sendMessage("❌ Vui lòng nhập số lượng Bitcoin hợp lệ!\nVí dụ: !bitcoin ban 0.1", threadID, messageID);
                }
                
                const bitcoinData = getBitcoinData();
                const userWallet = bitcoinData.userWallets[senderID];
                
                if (!userWallet || userWallet.bitcoin < amount) {
                    return api.sendMessage(`❌ Bạn không đủ Bitcoin để bán!\n🪙 Cần: ${amount} BTC\n📊 Có: ${userWallet ? userWallet.bitcoin.toFixed(6) : 0} BTC`, threadID, messageID);
                }
                
                const currentPrice = await updateBitcoinPrice();
                const totalEarn = amount * currentPrice;
                
                // Cộng tiền và trừ Bitcoin
                await Currencies.increaseMoney(senderID, Math.floor(totalEarn));
                
                userWallet.bitcoin -= amount;
                userWallet.transactions.push({
                    type: "ban",
                    amount: amount,
                    price: currentPrice,
                    total: totalEarn,
                    time: new Date().toLocaleString("vi-VN")
                });
                
                saveBitcoinData(bitcoinData);
                
                const message = `
╭─────────────────────╮
│    ✅ BÁN BITCOIN THÀNH CÔNG    │
╰─────────────────────╯

🪙 Đã bán: ${amount} BTC
💰 Giá: $${currentPrice.toFixed(2)}/BTC
💸 Tổng thu được: $${totalEarn.toFixed(2)}
📊 Bitcoin còn lại: ${userWallet.bitcoin.toFixed(6)} BTC
⏰ ${new Date().toLocaleString("vi-VN")}
`;

                return api.sendMessage(message, threadID, messageID);
            }
            
            case "vi":
            case "wallet": {
                const bitcoinData = getBitcoinData();
                const userWallet = bitcoinData.userWallets[senderID];
                const currentPrice = await updateBitcoinPrice();
                
                if (!userWallet || userWallet.bitcoin === 0) {
                    return api.sendMessage("📊 Ví Bitcoin của bạn đang trống!\nSử dụng !bitcoin mua [số lượng] để mua Bitcoin", threadID, messageID);
                }
                
                const currentValue = userWallet.bitcoin * currentPrice;
                const profit = currentValue - userWallet.totalInvested;
                const profitPercent = (profit / userWallet.totalInvested) * 100;
                
                const message = `
╭─────────────────────╮
│    📊 VÍ BITCOIN CỦA BẠN    │
╰─────────────────────╯

🪙 Bitcoin: ${userWallet.bitcoin.toFixed(6)} BTC
💰 Giá trị hiện tại: $${currentValue.toFixed(2)}
💸 Tổng đầu tư: $${userWallet.totalInvested.toFixed(2)}
📈 Lãi/Lỗ: $${profit.toFixed(2)} (${profitPercent.toFixed(2)}%)
⏰ Cập nhật: ${new Date().toLocaleString("vi-VN")}

📝 Giao dịch gần nhất: ${userWallet.transactions.length} lần
`;

                return api.sendMessage(message, threadID, messageID);
            }
            
            case "bieu-do":
            case "chart": {
                api.sendMessage("📊 Đang tạo biểu đồ Bitcoin...", threadID, messageID);
                
                const chartBuffer = await createBitcoinChart();
                const chartPath = __dirname + `/cache/bitcoin_chart_${Date.now()}.png`;
                fs.writeFileSync(chartPath, chartBuffer);
                
                return api.sendMessage({
                    body: "📈 Biểu đồ giá Bitcoin 24h gần nhất",
                    attachment: fs.createReadStream(chartPath)
                }, threadID, (error) => {
                    if (!error) fs.unlinkSync(chartPath);
                }, messageID);
            }
            
            case "tin-tuc":
            case "news": {
                api.sendMessage("📰 Đang tải tin tức Bitcoin...", threadID, messageID);
                
                const news = await getBitcoinNews();
                const currentPrice = await updateBitcoinPrice();
                
                const message = `
╭─────────────────────╮
│    📰 TIN TỨC BITCOIN    │
╰─────────────────────╯

${news}

💰 Giá hiện tại: $${currentPrice.toFixed(2)}
⏰ ${new Date().toLocaleString("vi-VN")}

💡 Sử dụng !bitcoin gia để xem chi tiết!
`;

                return api.sendMessage(message, threadID, messageID);
            }
            
            case "lich-su":
            case "history": {
                const bitcoinData = getBitcoinData();
                const userWallet = bitcoinData.userWallets[senderID];
                
                if (!userWallet || userWallet.transactions.length === 0) {
                    return api.sendMessage("📝 Bạn chưa có giao dịch Bitcoin nào!", threadID, messageID);
                }
                
                let message = `
╭─────────────────────╮
│    📝 LỊCH SỬ GIAO DỊCH    │
╰─────────────────────╯\n\n`;

                const recentTransactions = userWallet.transactions.slice(-10).reverse();
                
                for (const tx of recentTransactions) {
                    const emoji = tx.type === "mua" ? "🛒" : "💰";
                    message += `${emoji} ${tx.type.toUpperCase()}: ${tx.amount} BTC\n`;
                    message += `   💵 $${tx.price.toFixed(2)}/BTC = $${tx.total.toFixed(2)}\n`;
                    message += `   ⏰ ${tx.time}\n\n`;
                }
                
                return api.sendMessage(message, threadID, messageID);
            }
            
            default: {
                const helpMessage = `
╭─────────────────────╮
│    🪙 BITCOIN VIP PREMIUM    │
╰─────────────────────╯

📋 LỆNH SỬ DỤNG:

💰 !bitcoin gia - Xem giá hiện tại
🛒 !bitcoin mua [số lượng] - Mua Bitcoin
💸 !bitcoin ban [số lượng] - Bán Bitcoin
📊 !bitcoin vi - Xem ví Bitcoin
📈 !bitcoin bieu-do - Biểu đồ giá
📰 !bitcoin tin-tuc - Tin tức Bitcoin
📝 !bitcoin lich-su - Lịch sử giao dịch

🎯 Ví dụ: !bitcoin mua 0.5
🤖 AI quản lý giá bởi Cohere
`;

                return api.sendMessage(helpMessage, threadID, messageID);
            }
        }
        
    } catch (error) {
        console.log("Lỗi Bitcoin module:", error);
        return api.sendMessage(`❌ Có lỗi xảy ra: ${error.message}`, threadID, messageID);
    }
};
