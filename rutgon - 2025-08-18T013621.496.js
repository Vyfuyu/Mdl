
module.exports.config = {
    name: "rutgon",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Kaori Waguri",
    description: "Rút gọn link YeuMoney - Kiếm tiền từ link rút gọn",
    commandCategory: "Tiện ích",
    usages: "rutgon [link] hoặc rutgon thongke",
    cooldowns: 5,
    dependencies: {
        "axios": "",
        "fs-extra": ""
    }
};

module.exports.run = async ({ event, api, args, Users, Currencies }) => {
    const fs = global.nodemodule["fs-extra"];
    const axios = global.nodemodule["axios"];
    const { threadID, senderID, messageID } = event;

    // API Token YeuMoney
    const API_TOKEN = "d63b9e91011fd783412e373d5a4da740c5a64c4f587b4b113d461f58ac76d5f5";
    const API_URL = "https://yeumoney.com/QL_api.php";

    // Hàm làm sạch text
    function cleanText(text) {
        if (!text) return "";
        return text
            .replace(/[^\w\s.,!?-]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    // Hàm lưu/đọc dữ liệu thống kê
    function getStatsData() {
        const dataPath = __dirname + "/cache/rutgon_stats.json";
        try {
            if (!fs.existsSync(__dirname + "/cache")) {
                fs.mkdirSync(__dirname + "/cache");
            }

            if (!fs.existsSync(dataPath)) {
                const initialData = {
                    userStats: {},
                    totalLinks: 0,
                    totalViews: 0
                };
                fs.writeFileSync(dataPath, JSON.stringify(initialData, null, 2));
                return initialData;
            }
            return JSON.parse(fs.readFileSync(dataPath));
        } catch (error) {
            console.log("Lỗi đọc stats data:", error.message);
            return {
                userStats: {},
                totalLinks: 0,
                totalViews: 0
            };
        }
    }

    function saveStatsData(data) {
        const dataPath = __dirname + "/cache/rutgon_stats.json";
        try {
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.log("Lỗi lưu stats data:", error.message);
            return false;
        }
    }

    // Hàm rút gọn link
    async function shortenLink(url) {
        try {
            const encodedUrl = encodeURIComponent(url);
            const apiUrl = `${API_URL}?token=${API_TOKEN}&url=${encodedUrl}&format=json`;
            
            console.log("Đang gọi YeuMoney API:", apiUrl);
            
            const response = await axios.get(apiUrl, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            console.log("YeuMoney response:", response.data);

            if (response.data.status === "success") {
                return {
                    success: true,
                    shortenedUrl: response.data.shortenedUrl,
                    originalUrl: url
                };
            } else {
                return {
                    success: false,
                    error: response.data.status || "Lỗi không xác định"
                };
            }

        } catch (error) {
            console.log("Lỗi rút gọn link:", error.message);
            return {
                success: false,
                error: "Không thể kết nối đến YeuMoney API"
            };
        }
    }

    // Kiểm tra URL hợp lệ
    function isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch (_) {
            return false;
        }
    }

    const command = args[0] || "";
    
    switch (command.toLowerCase()) {
        case "thongke":
        case "stats": {
            const statsData = getStatsData();
            const userStats = statsData.userStats[senderID];
            
            if (!userStats) {
                return api.sendMessage("📊 Bạn chưa rút gọn link nào!", threadID, messageID);
            }

            const userInfo = await Users.getData(senderID);
            const userName = cleanText(userInfo.name || "Unknown");

            const message = `
╭─────────────────────╮
│    📊 THỐNG KÊ RÚT GỌN LINK    │
╰─────────────────────╯

👤 Người dùng: ${userName}
🔗 Tổng link đã rút gọn: ${userStats.totalLinks}
👁️ Tổng lượt xem: ${userStats.totalViews}
💰 Ước tính thu nhập: ${(userStats.totalViews * 0.1).toFixed(2)}đ
⏰ Lần cuối rút gọn: ${userStats.lastShortenTime}

🌟 THỐNG KÊ TOÀN HỆ THỐNG:
🔗 Tổng link: ${statsData.totalLinks}
👁️ Tổng view: ${statsData.totalViews}

💡 Sử dụng !rutgon [link] để rút gọn link mới!
`;

            return api.sendMessage(message, threadID, messageID);
        }

        case "help":
        case "huongdan": {
            const helpMessage = `
╭─────────────────────╮
│    🔗 HƯỚNG DẪN RÚT GỌN LINK    │
╰─────────────────────╯

📋 CÁCH SỬ DỤNG:

🔗 !rutgon [link] - Rút gọn link
📊 !rutgon thongke - Xem thống kê
📖 !rutgon help - Hướng dẫn sử dụng

💰 CÁCH KIẾM TIỀN:
• Mỗi lượt click link rút gọn = 0.1đ
• Chia sẻ link nhiều để tăng thu nhập
• Theo dõi thống kê để biết hiệu quả

🎯 VÍ DỤ:
!rutgon https://facebook.com
!rutgon https://youtube.com/watch?v=xxxxx

⚠️ LƯU Ý:
• Chỉ hỗ trợ link HTTP/HTTPS hợp lệ
• Link rút gọn có thời hạn sử dụng
• Thu nhập phụ thuộc vào lượt click thực tế

🎉 Chúc bạn kiếm tiền thành công!
`;

            return api.sendMessage(helpMessage, threadID, messageID);
        }

        default: {
            const inputUrl = args.join(" ");
            
            if (!inputUrl) {
                return api.sendMessage(`
🔗 RÚT GỌN LINK YEUMONEY - KIẾM TIỀN ONLINE

📋 Cách sử dụng:
• !rutgon [link] - Rút gọn link
• !rutgon thongke - Xem thống kê
• !rutgon help - Hướng dẫn chi tiết

💡 Ví dụ: !rutgon https://facebook.com
`, threadID, messageID);
            }

            // Kiểm tra URL hợp lệ
            if (!isValidUrl(inputUrl)) {
                return api.sendMessage("❌ Link không hợp lệ! Vui lòng nhập link có định dạng http:// hoặc https://", threadID, messageID);
            }

            // Thông báo đang xử lý
            api.sendMessage("🔄 Đang rút gọn link của bạn...", threadID, messageID);

            try {
                // Gọi API rút gọn
                const result = await shortenLink(inputUrl);

                if (result.success) {
                    // Cập nhật thống kê
                    const statsData = getStatsData();
                    
                    if (!statsData.userStats[senderID]) {
                        statsData.userStats[senderID] = {
                            totalLinks: 0,
                            totalViews: 0,
                            lastShortenTime: ""
                        };
                    }

                    statsData.userStats[senderID].totalLinks += 1;
                    statsData.userStats[senderID].lastShortenTime = new Date().toLocaleString("vi-VN");
                    statsData.totalLinks += 1;

                    saveStatsData(statsData);

                    // Lấy thông tin user
                    const userInfo = await Users.getData(senderID);
                    const userName = cleanText(userInfo.name || "Unknown");

                    const successMessage = `
╭─────────────────────╮
│    ✅ RÚT GỌN THÀNH CÔNG    │
╰─────────────────────╯

👤 Người tạo: ${userName}
🔗 Link gốc: ${inputUrl}
✂️ Link rút gọn: ${result.shortenedUrl}

💰 THÔNG TIN KIẾM TIỀN:
• Mỗi lượt click = 0.1đ
• Chia sẻ link để tăng thu nhập
• Theo dõi thống kê: !rutgon thongke

📈 Đã tạo: ${statsData.userStats[senderID].totalLinks} link
⏰ ${new Date().toLocaleString("vi-VN")}

🎉 Chúc bạn kiếm được nhiều tiền từ link này!
`;

                    return api.sendMessage(successMessage, threadID, messageID);

                } else {
                    return api.sendMessage(`❌ Lỗi rút gọn link: ${result.error}`, threadID, messageID);
                }

            } catch (error) {
                console.log("Lỗi xử lý rút gọn:", error);
                return api.sendMessage(`❌ Có lỗi xảy ra: ${error.message}`, threadID, messageID);
            }
        }
    }
};
