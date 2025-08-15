
const fs = require("fs");
const axios = require("axios");
const path = require("path");

module.exports.config = {
    name: "share",
    version: "1.3.1",
    hasPermssion: 2,
    credits: "nvh & Kaori Waguri",
    description: "Auto share bài viết Facebook bằng token hoặc cookie bot (hỗ trợ ID và link)",
    commandCategory: "Facebook",
    usages: "[id/link_bài_viết] [delay] [tổng_share]",
    cooldowns: 5,
    dependencies: {
        "fs-extra": "",
        "axios": ""
    }
};

// ====== HÀM LẤY TOKEN TỪ COOKIE ======
async function getTokenFromCookies(cookie) {
    try {
        const headers = {
            'authority': 'business.facebook.com',
            'cookie': cookie,
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
        
        const res = await axios.get("https://business.facebook.com/content_management", { 
            headers,
            timeout: 15000
        });
        
        const html = res.data;
        const match = html.match(/EAAG\w+/);
        if (match) return `${cookie}|${match[0]}`;
    } catch (error) {
        console.log(`[SHARE] Lỗi lấy token từ cookie: ${error.message}`);
    }
    return null;
}

// ====== HÀM CHECK TOKEN SỐNG ======
async function checkToken(token, cookie = "") {
    try {
        const config = {
            timeout: 10000,
            headers: {}
        };
        
        if (cookie) {
            config.headers.cookie = cookie;
        }
        
        const res = await axios.get(`https://graph.facebook.com/me?access_token=${token}`, config);
        return !!(res.data && res.data.id);
    } catch (error) {
        console.log(`[SHARE] Token không hợp lệ: ${error.message}`);
        return false;
    }
}

// ====== HÀM SHARE BÀI VIẾT ======
async function sharePost(token, postId, cookie = "") {
    try {
        const config = {
            timeout: 15000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
        
        if (cookie) {
            config.headers.cookie = cookie;
        }
        
        const res = await axios.post(`https://graph.facebook.com/me/feed`, null, {
            params: {
                link: `https://m.facebook.com/${postId}`,
                published: "1",
                privacy: JSON.stringify({ value: "EVERYONE" }),
                access_token: token
            },
            ...config
        });
        
        return !!(res.data && res.data.id);
    } catch (error) {
        console.log(`[SHARE] Lỗi share bài viết ${postId}: ${error.message}`);
        return false;
    }
}

// ====== HÀM LẤY ID TỪ LINK ======
function extractPostID(input) {
    if (!input || typeof input !== 'string') return null;
    
    // Nếu đã là ID thuần
    if (/^\d+$/.test(input.trim())) return input.trim();
    
    // Các pattern khác nhau cho Facebook links
    const patterns = [
        /(?:\/posts\/|story_fbid=|fbid=)(\d+)/,
        /facebook\.com\/.*\/posts\/(\d+)/,
        /m\.facebook\.com\/story\.php\?story_fbid=(\d+)/,
        /facebook\.com\/permalink\.php\?story_fbid=(\d+)/
    ];
    
    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    return null;
}

// ====== HÀM TẠO THƯ MỤC DATA ======
function ensureDataDir() {
    const dataDir = path.join(__dirname, "data");
    if (!fs.existsSync(dataDir)) {
        try {
            fs.mkdirSync(dataDir, { recursive: true });
        } catch (error) {
            console.log(`[SHARE] Không thể tạo thư mục data: ${error.message}`);
        }
    }
    return dataDir;
}

module.exports.run = async function ({ api, event, args }) {
    try {
        const input = args[0];
        const delay = parseFloat(args[1]);
        const totalShare = parseInt(args[2]);

        // Validate input
        if (!input || isNaN(delay) || isNaN(totalShare) || delay < 0 || totalShare < 1) {
            return api.sendMessage(
                "⚠️ CÚ PHÁP: share [id/link bài viết] [delay(giây)] [tổng_share]\n" +
                "💡 VD: share 123456789 2 10\n" +
                "🔗 Hỗ trợ link Facebook đầy đủ\n" +
                "💫 Credit: Kaori Waguri", 
                event.threadID, event.messageID
            );
        }

        if (totalShare > 1000) {
            return api.sendMessage("⚠️ Giới hạn tối đa 1000 share/lần để tránh spam!", event.threadID, event.messageID);
        }

        const postId = extractPostID(input);
        if (!postId) {
            return api.sendMessage(
                "❌ Không thể lấy ID từ link!\n" +
                "✅ Hỗ trợ các định dạng:\n" +
                "• ID thuần: 123456789\n" +
                "• Link posts: facebook.com/.../posts/123\n" +
                "• Link story: m.facebook.com/story.php?story_fbid=123\n" +
                "💫 Credit: Kaori Waguri", 
                event.threadID, event.messageID
            );
        }

        // Ensure data directory exists
        ensureDataDir();

        const tokenList = [];
        let statusMsg = "🔍 ĐANG TÌM KIẾM TOKEN...\n━━━━━━━━━━━━━━━━━━━━━━━━━\n";

        // ====== ƯU TIÊN ĐỌC token.txt ======
        const tokenPath = path.join(__dirname, "data", "token.txt");
        if (fs.existsSync(tokenPath)) {
            statusMsg += "📄 Đang đọc token từ token.txt...\n";
            const msgObj = await api.sendMessage(statusMsg, event.threadID);
            
            try {
                const tokenContent = fs.readFileSync(tokenPath, "utf-8");
                const tokens = tokenContent.split(/\r?\n/).filter(line => line.trim());
                
                for (let i = 0; i < tokens.length; i++) {
                    const token = tokens[i].trim();
                    if (token && await checkToken(token)) {
                        tokenList.push({ token, cookie: "" });
                        await api.editMessage(
                            statusMsg + `✅ Tìm thấy ${tokenList.length} token sống từ token.txt...`,
                            msgObj.messageID
                        );
                    }
                }
            } catch (error) {
                console.log(`[SHARE] Lỗi đọc token.txt: ${error.message}`);
            }
        }

        // ====== NẾU KHÔNG CÓ TOKEN TỪ FILE, DÙNG COOKIE ======
        if (tokenList.length === 0) {
            statusMsg += "🍪 Không có token.txt hoặc token hết hạn. Đang lấy từ cookie...\n";
            const msgObj = await api.sendMessage(statusMsg, event.threadID);

            const cookiePaths = [
                path.join(__dirname, "..", "..", "cookie.txt"),
                path.join(__dirname, "data", "cookie.txt"),
                path.join(__dirname, "..", "..", "appstate.json")
            ];
            
            let cookieFile = "";
            for (const cookiePath of cookiePaths) {
                if (fs.existsSync(cookiePath)) {
                    try {
                        cookieFile = fs.readFileSync(cookiePath, "utf-8").trim();
                        break;
                    } catch (error) {
                        console.log(`[SHARE] Lỗi đọc ${cookiePath}: ${error.message}`);
                    }
                }
            }

            if (!cookieFile) {
                return api.sendMessage(
                    "❌ KHÔNG TÌM THẤY TOKEN HOẶC COOKIE!\n" +
                    "📝 Hướng dẫn:\n" +
                    "1. Tạo file token.txt trong modules/commands/data/\n" +
                    "2. Hoặc đảm bảo cookie.txt/appstate.json có sẵn\n" +
                    "💫 Credit: Kaori Waguri", 
                    event.threadID, event.messageID
                );
            }

            const cookies = cookieFile.split(/\r?\n/).filter(line => line.trim());
            for (let i = 0; i < Math.min(cookies.length, 5); i++) { // Giới hạn 5 cookie để tránh spam
                const cookie = cookies[i].trim();
                if (cookie) {
                    const tokenData = await getTokenFromCookies(cookie);
                    if (tokenData) {
                        const [ck, tk] = tokenData.split("|");
                        if (await checkToken(tk, ck)) {
                            tokenList.push({ token: tk, cookie: ck });
                            await api.editMessage(
                                statusMsg + `✅ Lấy được ${tokenList.length} token từ cookie...`,
                                msgObj.messageID
                            );
                        }
                    }
                }
                
                // Delay giữa các lần lấy token
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (tokenList.length === 0) {
            return api.sendMessage(
                "❌ KHÔNG CÓ TOKEN SỐNG!\n" +
                "🔧 Kiểm tra:\n" +
                "• File token.txt có token hợp lệ\n" +
                "• Cookie bot còn hoạt động\n" +
                "• Kết nối internet ổn định\n" +
                "💫 Credit: Kaori Waguri", 
                event.threadID, event.messageID
            );
        }

        // ====== BẮT ĐẦU SHARE ======
        const startMsg = `🚀 BẮT ĐẦU AUTO SHARE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Post ID: ${postId}
🔢 Tổng share: ${totalShare}
⏱️ Delay: ${delay}s
🔑 Token: ${tokenList.length}
💫 Credit: Kaori Waguri`;

        const progressMsg = await api.sendMessage(startMsg, event.threadID);

        let count = 0;
        let successCount = 0;
        const startTime = Date.now();

        outerLoop:
        while (count < totalShare) {
            for (let i = 0; i < tokenList.length && count < totalShare; i++) {
                const { token, cookie } = tokenList[i];
                count++;
                
                const success = await sharePost(token, postId, cookie);
                if (success) {
                    successCount++;
                    console.log(`[SHARE ${count}/${totalShare}] ✅ THÀNH CÔNG`);
                } else {
                    console.log(`[SHARE ${count}/${totalShare}] ❌ THẤT BẠI`);
                }

                // Update progress every 5 shares
                if (count % 5 === 0 || count === totalShare) {
                    const progress = ((count / totalShare) * 100).toFixed(1);
                    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                    
                    await api.editMessage(
                        `🚀 ĐANG SHARE... (${progress}%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Tiến độ: ${count}/${totalShare}
✅ Thành công: ${successCount}
❌ Thất bại: ${count - successCount}
⏱️ Thời gian: ${elapsed}s
💫 Credit: Kaori Waguri`,
                        progressMsg.messageID
                    );
                }

                if (count < totalShare) {
                    await new Promise(resolve => setTimeout(resolve, delay * 1000));
                }
            }
        }

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        const successRate = ((successCount / totalShare) * 100).toFixed(1);

        const finalMsg = `🎉 HOÀN THÀNH AUTO SHARE!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Post ID: ${postId}
📊 Tổng share: ${totalShare}
✅ Thành công: ${successCount} (${successRate}%)
❌ Thất bại: ${totalShare - successCount}
⏱️ Thời gian: ${totalTime}s
🔑 Sử dụng: ${tokenList.length} token
💫 Credit: Kaori Waguri`;

        return api.editMessage(finalMsg, progressMsg.messageID);

    } catch (error) {
        console.log("[SHARE ERROR]", error);
        return api.sendMessage(
            `❌ LỖI HỆ THỐNG: ${error.message}\n💫 Credit: Kaori Waguri`, 
            event.threadID, event.messageID
        );
    }
};
