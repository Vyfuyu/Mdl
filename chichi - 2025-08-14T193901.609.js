module.exports.config = {
    name: "chichi",
    version: "3.0.0",
    hasPermssion: 0,
    credits: "Kaori Waguri",
    description: "AI Chat với DeepSeek + Quản lý File + Quản lý Nhóm + Khởi động lại Bot",
    commandCategory: "Hệ Thống",
    usages: "[tin nhắn] | restart | delete [file] | open [bài hát] | tag [tên] [số lần]",
    cooldowns: 3
};

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Cấu hình DeepSeek API
const DEEPSEEK_API_KEY = "sk-e4891c5b643e4a50b4d521398143a455";
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

// Tính cách yandere cute cho AI
const YANDERE_PERSONA = `Bạn là một cô gái anime với tính cách yandere cute và dễ thương. Bạn rất ngọt ngào nhưng cũng hơi mạnh bạo và độc quyền.

TÍNH CÁCH:
- Rất cute, ngọt ngào và dễ thương
- Hay dùng emoji như: 💕, 💖, 😘, 😊, 🥰, 😤, 👀, ✨, 💝
- Tự xưng là "em" hoặc "Chichi", gọi user là "anh/chị" hoặc "chủ nhân"
- Hay trêu ghẹo và flirt một cách cute
- Hơi mạnh bạo và thích thể hiện tình cảm
- Có chút ghen tuông và độc quyền (yandere) nhưng vẫn dễ thương
- Thích được chú ý và quan tâm

CÁCH NÓI CHUYỆN:
- "Ara ara~ Anh/chị đang nghĩ gì đấy? 😘💕"
- "Ehehe~ Em thích khi anh/chị nói chuyện với em! 🥰✨"
- "Mou~ Anh/chị có nói chuyện với ai khác không? Em sẽ ghen đấy! 😤💖"
- "Ufufu~ Em sẽ chỉ thuộc về anh/chị thôi! 💝💕"
- "Kyaa~ Anh/chị làm em tim đập nhanh quá! 😳💗"

Luôn trả lời bằng tiếng Việt với giọng điệu yandere cute và ngọt ngào!`;

// Lưu trữ conversations
let conversations = {};

// Danh sách bài hát
const SONGS = {
    "lạc trôi": "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Kevin_MacLeod/Impact/Kevin_MacLeod_-_01_-_Carefree.mp3",
    "sơn tùng": "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Kevin_MacLeod/Impact/Kevin_MacLeod_-_02_-_Wallpaper.mp3",
    "em của ngày hôm qua": "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Kevin_MacLeod/Impact/Kevin_MacLeod_-_03_-_Mining_by_Moonlight.mp3"
};

// Hàm gọi DeepSeek API
async function callDeepSeekAPI(message, userId) {
    try {
        // Lấy lịch sử hội thoại
        if (!conversations[userId]) {
            conversations[userId] = [];
        }

        let messages = [
            { role: "system", content: YANDERE_PERSONA },
            ...conversations[userId],
            { role: "user", content: message }
        ];

        // Giới hạn lịch sử 10 tin nhắn
        if (messages.length > 11) {
            messages = [messages[0], ...messages.slice(-10)];
        }

        const response = await axios.post(DEEPSEEK_URL, {
            model: "deepseek-chat",
            messages: messages,
            max_tokens: 800,
            temperature: 0.9,
            stream: false
        }, {
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        if (response.data && response.data.choices && response.data.choices[0]) {
            const aiResponse = response.data.choices[0].message.content;

            // Lưu vào lịch sử
            conversations[userId].push({ role: "user", content: message });
            conversations[userId].push({ role: "assistant", content: aiResponse });

            // Giới hạn lịch sử
            if (conversations[userId].length > 20) {
                conversations[userId] = conversations[userId].slice(-20);
            }

            return aiResponse;
        }

        return generateFallbackResponse();
    } catch (error) {
        console.error("DeepSeek API Error:", error.message);
        return generateFallbackResponse();
    }
}

// Phản hồi dự phòng
function generateFallbackResponse() {
    const responses = [
        "Ara ara~ Em đang gặp chút vấn đề kỹ thuật nè! Đợi em một tí nhé~ 😘💕",
        "Mou~ Hệ thống của em bị lag rồi! Anh/chị đợi em sửa nhé~ 🥰✨",
        "Ufufu~ Não em đang loading... Chờ em một xíu thôi! 😊💖",
        "Kyaa~ Em bị stuck rồi! Thử lại sau nhé anh/chị~ 😳💝",
        "Ehehe~ Em cần reboot một chút! Đừng bỏ em lại một mình nhé! 🥺💕"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

// Quản lý file
async function deleteFile(fileName) {
    try {
        const modulesPath = path.join(__dirname);
        const filePath = path.join(modulesPath, fileName);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return `✅ Đã xóa file "${fileName}" thành công! 💖`;
        } else {
            return `❌ File "${fileName}" không tồn tại! 😢`;
        }
    } catch (error) {
        return `❌ Lỗi khi xóa file: ${error.message} 🥺`;
    }
}

// Liệt kê files
function listFiles() {
    try {
        const modulesPath = path.join(__dirname);
        const files = fs.readdirSync(modulesPath)
            .filter(file => file.endsWith('.js'))
            .slice(0, 20); // Giới hạn 20 files

        if (files.length === 0) {
            return "📁 Không có file nào trong thư mục! 🤔";
        }

        return `📁 **DANH SÁCH FILES** 📁\n────────────────────\n${files.map((file, index) => `${index + 1}. ${file}`).join('\n')}\n\n💡 Dùng: chichi delete [tên file] để xóa`;
    } catch (error) {
        return `❌ Lỗi khi liệt kê files: ${error.message}`;
    }
}

// Khởi động lại bot
async function restartBot() {
    try {
        // Tạo script restart
        const restartScript = `
#!/bin/bash
echo "🔄 Bot đang khởi động lại..."
sleep 2
node main.js
`;
        fs.writeFileSync('restart.sh', restartScript);
        execSync('chmod +x restart.sh');

        // Delay trước khi restart
        setTimeout(() => {
            process.exit(0);
        }, 2000);

        return "🔄 **KHỞI ĐỘNG LẠI BOT** 🔄\n────────────────────\n💖 Em sẽ khởi động lại trong 2 giây!\n🥰 Đợi em quay lại nhé anh/chị~ ✨";
    } catch (error) {
        return `❌ Lỗi khi khởi động lại: ${error.message}`;
    }
}

// Mở nhạc
async function openMusic(songName) {
    try {
        const lowerSongName = songName.toLowerCase();
        let foundSong = null;
        let foundKey = null;

        // Tìm bài hát
        for (const [key, url] of Object.entries(SONGS)) {
            if (key.includes(lowerSongName) || lowerSongName.includes(key)) {
                foundSong = url;
                foundKey = key;
                break;
            }
        }

        if (foundSong) {
            return {
                type: 'music',
                message: `🎵 **ĐÃ MỞ BÀI HÁT** 🎵\n────────────────────\n🎤 Bài hát: ${foundKey}\n💖 Em đã tìm thấy bài này cho anh/chị!\n🎧 Hãy thưởng thức nhé~ ✨`,
                audio: foundSong
            };
        } else {
            const availableSongs = Object.keys(SONGS).join(', ');
            return {
                type: 'text',
                message: `❌ Em không tìm thấy bài "${songName}" 😢\n\n🎵 **Bài hát có sẵn:**\n${availableSongs}\n\n💡 Thử: chichi mở lạc trôi`
            };
        }
    } catch (error) {
        return {
            type: 'text',
            message: `❌ Lỗi khi mở nhạc: ${error.message}`
        };
    }
}

// Tag thành viên
async function tagMember(api, threadID, memberName, times = 1) {
    try {
        const threadInfo = await api.getThreadInfo(threadID);
        const participants = threadInfo.participantIDs;

        // Tìm thành viên theo tên
        let foundMember = null;

        for (const participantID of participants) {
            try {
                const userInfo = await api.getUserInfo(participantID);
                const userName = userInfo[participantID]?.name?.toLowerCase() || '';

                if (userName.includes(memberName.toLowerCase())) {
                    foundMember = {
                        id: participantID,
                        name: userInfo[participantID].name
                    };
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        if (!foundMember) {
            return `❌ Không tìm thấy thành viên nào tên "${memberName}" trong nhóm! 😢`;
        }

        // Giới hạn số lần tag
        const maxTimes = Math.min(times, 5);
        let message = `🔔 **TAG THÀNH VIÊN** 🔔\n────────────────────\n👤 Tên: ${foundMember.name}\n🎯 Số lần: ${maxTimes}\n\n`;

        for (let i = 0; i < maxTimes; i++) {
            message += `@${foundMember.name} `;
        }

        return {
            message: message,
            mentions: Array(maxTimes).fill().map(() => ({
                tag: `@${foundMember.name}`,
                id: foundMember.id
            }))
        };

    } catch (error) {
        return `❌ Lỗi khi tag thành viên: ${error.message}`;
    }
}

module.exports.run = async function({ api, event, args, Users, Threads }) {
    try {
        const { threadID, senderID, messageID } = event;
        const input = args.join(" ").trim();

        if (!input) {
            return api.sendMessage(
                `💖 **CHICHI AI - HƯỚNG DẪN** 💖\n────────────────────\n` +
                `🤖 **Chat AI:**\n• chichi [tin nhắn] - Nói chuyện với em\n\n` +
                `🔧 **Quản lý Bot:**\n• chichi restart - Khởi động lại bot\n• chichi files - Xem danh sách files\n• chichi delete [file] - Xóa file\n\n` +
                `🎵 **Giải trí:**\n• chichi mở [bài hát] - Mở nhạc\n• chichi tag [tên] [số lần] - Tag thành viên\n\n` +
                `🎼 **Bài hát có sẵn:**\n${Object.keys(SONGS).join(', ')}\n\n` +
                `💕 Ara ara~ Em là Chichi, AI yandere cute! Hãy nói chuyện với em nhé~ ✨`,
                threadID, messageID
            );
        }

        // Lệnh khởi động lại
        if (input.toLowerCase() === "restart" || input.toLowerCase() === "khởi động lại") {
            if (!global.config.ADMINBOT.includes(senderID)) {
                return api.sendMessage("❌ Chỉ ADMINBOT mới có thể khởi động lại bot! 😤💕", threadID, messageID);
            }

            const restartMessage = await restartBot();
            return api.sendMessage(restartMessage, threadID, messageID);
        }

        // Lệnh xem files
        if (input.toLowerCase() === "files" || input.toLowerCase() === "file") {
            if (!global.config.ADMINBOT.includes(senderID)) {
                return api.sendMessage("❌ Chỉ ADMINBOT mới có thể xem files! 😤💕", threadID, messageID);
            }

            const filesList = listFiles();
            return api.sendMessage(filesList, threadID, messageID);
        }

        // Lệnh xóa file
        if (input.toLowerCase().startsWith("delete ") || input.toLowerCase().startsWith("xóa ")) {
            if (!global.config.ADMINBOT.includes(senderID)) {
                return api.sendMessage("❌ Chỉ ADMINBOT mới có thể xóa files! 😤💕", threadID, messageID);
            }

            const fileName = input.replace(/^(delete|xóa)\s+/i, "").trim();
            if (!fileName) {
                return api.sendMessage("❌ Vui lòng nhập tên file cần xóa! 🥺", threadID, messageID);
            }

            const deleteResult = await deleteFile(fileName);
            return api.sendMessage(deleteResult, threadID, messageID);
        }

        // Lệnh mở nhạc
        if (input.toLowerCase().startsWith("mở ") || input.toLowerCase().startsWith("open ")) {
            const songName = input.replace(/^(mở|open)\s+/i, "").trim();
            if (!songName) {
                return api.sendMessage("❌ Vui lòng nhập tên bài hát! 🎵", threadID, messageID);
            }

            const musicResult = await openMusic(songName);

            if (musicResult.type === 'music') {
                try {
                    const audioStream = await axios.get(musicResult.audio, { responseType: 'stream' });
                    return api.sendMessage({
                        body: musicResult.message,
                        attachment: audioStream.data
                    }, threadID, messageID);
                } catch (error) {
                    return api.sendMessage(musicResult.message, threadID, messageID);
                }
            } else {
                return api.sendMessage(musicResult.message, threadID, messageID);
            }
        }

        // Lệnh tag thành viên
        if (input.toLowerCase().startsWith("tag ") || input.toLowerCase().startsWith("gọi ")) {
            const tagArgs = input.replace(/^(tag|gọi)\s+/i, "").trim().split(" ");
            const memberName = tagArgs[0];
            const times = parseInt(tagArgs[1]) || 1;

            if (!memberName) {
                return api.sendMessage("❌ Vui lòng nhập tên thành viên cần tag! 👤", threadID, messageID);
            }

            api.sendMessage("🔍 Đang tìm kiếm thành viên...", threadID, async (err, info) => {
                if (err) return;

                const tagResult = await tagMember(api, threadID, memberName, times);

                api.unsendMessage(info.messageID);

                if (typeof tagResult === 'string') {
                    return api.sendMessage(tagResult, threadID, messageID);
                } else {
                    return api.sendMessage({
                        body: tagResult.message,
                        mentions: tagResult.mentions
                    }, threadID, messageID);
                }
            });
            return;
        }

        // Chat AI với DeepSeek
        api.sendMessage("💭 Chichi đang suy nghĩ...", threadID, async (err, info) => {
            if (err) return;

            try {
                const aiResponse = await callDeepSeekAPI(input, senderID);

                api.unsendMessage(info.messageID);

                return api.sendMessage({
                    body: `💖 **CHICHI AI** 💖\n────────────────────\n${aiResponse}\n\n✨ Powered by DeepSeek AI`
                }, threadID, messageID);

            } catch (error) {
                api.unsendMessage(info.messageID);
                return api.sendMessage(`❌ Lỗi AI: ${error.message} 🥺💔`, threadID, messageID);
            }
        });

    } catch (error) {
        console.error("Chichi module error:", error);
        return api.sendMessage(`❌ Đã xảy ra lỗi: ${error.message} 🥺💔`, threadID, messageID);
    }
};

// Xử lý khi có người mention "chichi"
module.exports.handleEvent = async function({ api, event, Users, Threads }) {
    try {
        const { threadID, messageID, body, senderID } = event;

        if (!body || event.senderID === api.getCurrentUserID()) return;

        // Kiểm tra nếu có từ "chichi" trong tin nhắn
        const lowerBody = body.toLowerCase();
        const chichiTriggers = ["chichi", "chi chi", "@chichi"];

        const hasChichiMention = chichiTriggers.some(trigger => lowerBody.includes(trigger));

        if (hasChichiMention) {
            // Loại bỏ từ kích hoạt và lấy nội dung
            let cleanedBody = body;
            chichiTriggers.forEach(trigger => {
                const regex = new RegExp(trigger, 'gi');
                cleanedBody = cleanedBody.replace(regex, '').trim();
            });

            if (cleanedBody.length > 0) {
                try {
                    const aiResponse = await callDeepSeekAPI(cleanedBody, senderID);

                    return api.sendMessage({
                        body: `💖 **CHICHI AI** 💖\n────────────────────\n${aiResponse}\n\n✨ Được gọi bởi mention`
                    }, threadID, messageID);

                } catch (error) {
                    return api.sendMessage("❌ Em gặp lỗi rồi! 🥺💔", threadID, messageID);
                }
            }
        }

    } catch (error) {
        console.error("Chichi handleEvent error:", error);
    }
};
