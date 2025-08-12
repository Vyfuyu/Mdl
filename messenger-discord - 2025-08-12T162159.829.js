
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');

// Credit protection - đừng thay đổi
const originalCredit = "waguri";
const creditCheck = () => {
    const currentCredit = "waguri";
    if (currentCredit !== originalCredit) {
        return false;
    }
    return true;
};

module.exports.config = {
    name: "messenger-discord",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "waguri",
    description: "Kết nối bot messenger với bot discord",
    commandCategory: "Tiện ích",
    usages: "[ketnoi/ngatketnoi/caidat/tinhtrang]",
    cooldowns: 3,
    dependencies: {
        "discord.js": ""
    }
};

// Discord client global
let discordClient = null;
let isConnected = false;

module.exports.run = async function({ api, event, args, Users, Threads }) {
    // Kiểm tra credit
    if (!creditCheck()) {
        return api.sendMessage("❌ Module đã bị thay đổi credit không được phép!", event.threadID);
    }

    const cacheDir = path.join(__dirname, 'cache', 'messenger-discord');
    const configFile = path.join(cacheDir, 'config.json');

    // Tạo thư mục cache nếu chưa có
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Khởi tạo config nếu chưa có
    if (!fs.existsSync(configFile)) {
        fs.writeFileSync(configFile, JSON.stringify({
            discord: {
                token: "",
                channelId: "",
                guildId: ""
            },
            messenger: {
                connectedThreads: [],
                adminThreads: []
            },
            settings: {
                enabled: false,
                autoReconnect: true
            }
        }, null, 2));
    }

    let config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

    if (!args[0]) {
        return api.sendMessage("📋 MENU - KẾT NỐI MESSENGER & DISCORD\n" +
            "━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "🔗 CÁC LỆNH CHÍNH:\n" +
            "• messenger-discord caidat - Cài đặt token Discord\n" +
            "• messenger-discord ketnoi - Bật kết nối\n" +
            "• messenger-discord ngatketnoi - Tắt kết nối\n" +
            "• messenger-discord tinhtrang - Xem trạng thái\n\n" +
            "💬 CÁCH HOẠT ĐỘNG:\n" +
            "- Tin nhắn từ Messenger → Discord channel\n" +
            "- Tin nhắn từ Discord → Messenger thread\n" +
            "- Hỗ trợ attachment và emoji\n\n" +
            "⚙️ YÊU CẦU:\n" +
            "- Discord bot token\n" +
            "- Discord channel ID\n" +
            "- Quyền admin để cài đặt\n\n" +
            "━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "💡 Credit: waguri", event.threadID);
    }

    switch (args[0].toLowerCase()) {
        case "caidat":
            if (!args[1] || !args[2]) {
                return api.sendMessage("⚙️ CÁCH CÀI ĐẶT:\n\n" +
                    "📝 Sử dụng: messenger-discord caidat [token] [channelID]\n\n" +
                    "🔹 Token: Bot token từ Discord Developer Portal\n" +
                    "🔹 ChannelID: ID kênh Discord để kết nối\n\n" +
                    "📋 Ví dụ:\n" +
                    "messenger-discord caidat YOUR_BOT_TOKEN 123456789\n\n" +
                    "📍 Hướng dẫn lấy token:\n" +
                    "1. Vào Discord Developer Portal\n" +
                    "2. Tạo application mới\n" +
                    "3. Vào Bot → Copy Token\n" +
                    "4. Invite bot vào server với quyền Send Messages\n\n" +
                    "💡 Credit: waguri", event.threadID);
            }

            config.discord.token = args[1];
            config.discord.channelId = args[2];
            
            if (!config.messenger.adminThreads.includes(event.threadID)) {
                config.messenger.adminThreads.push(event.threadID);
            }

            fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
            
            api.sendMessage("✅ Đã cài đặt thành công!\n\n" +
                "🔹 Discord Token: ✓ Đã lưu\n" +
                "🔹 Channel ID: " + args[2] + "\n" +
                "🔹 Admin Thread: " + event.threadID + "\n\n" +
                "🚀 Sử dụng 'messenger-discord ketnoi' để bắt đầu kết nối!\n\n" +
                "💡 Credit: waguri", event.threadID);
            break;

        case "ketnoi":
            if (!config.discord.token || !config.discord.channelId) {
                return api.sendMessage("❌ Chưa cài đặt token và channel ID!\n" +
                    "Sử dụng: messenger-discord caidat [token] [channelID]", event.threadID);
            }

            if (isConnected) {
                return api.sendMessage("ℹ️ Bot Discord đã được kết nối rồi!", event.threadID);
            }

            try {
                await connectDiscord(api, config);
                config.settings.enabled = true;
                
                if (!config.messenger.connectedThreads.includes(event.threadID)) {
                    config.messenger.connectedThreads.push(event.threadID);
                }
                
                fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
                
                api.sendMessage("🟢 KẾT NỐI THÀNH CÔNG!\n\n" +
                    "✅ Bot Discord đã online\n" +
                    "✅ Kênh được kết nối: " + config.discord.channelId + "\n" +
                    "✅ Thread Messenger: " + event.threadID + "\n\n" +
                    "💬 Giờ bạn có thể nhắn tin qua lại giữa Messenger và Discord!\n\n" +
                    "💡 Credit: waguri", event.threadID);

                // Gửi thông báo đến Discord
                if (discordClient && isConnected) {
                    const channel = discordClient.channels.cache.get(config.discord.channelId);
                    if (channel) {
                        channel.send("🔗 **Messenger Bot đã kết nối!**\n" +
                            "💬 Giờ bạn có thể nhắn tin với Messenger từ đây!\n\n" +
                            "💡 Credit: waguri");
                    }
                }

            } catch (error) {
                api.sendMessage("❌ Lỗi kết nối Discord: " + error.message + "\n\n" +
                    "🔍 Kiểm tra lại:\n" +
                    "- Token có đúng không?\n" +
                    "- Bot có quyền trong server?\n" +
                    "- Channel ID có chính xác?\n\n" +
                    "💡 Credit: waguri", event.threadID);
            }
            break;

        case "ngatketnoi":
            if (discordClient) {
                discordClient.destroy();
                discordClient = null;
                isConnected = false;
            }
            
            config.settings.enabled = false;
            fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
            
            api.sendMessage("🔴 Đã ngắt kết nối Discord!\n\n" +
                "💡 Credit: waguri", event.threadID);
            break;

        case "tinhtrang":
            const threadInfo = await api.getThreadInfo(event.threadID);
            const threadName = threadInfo.threadName || "Nhóm không tên";
            
            let statusMsg = "📊 TÌNH TRẠNG KẾT NỐI\n";
            statusMsg += "━━━━━━━━━━━━━━━━━━━━━━━\n";
            statusMsg += `📍 Thread: "${threadName}"\n`;
            statusMsg += `🆔 ID: ${event.threadID}\n\n`;
            
            statusMsg += `🔗 Trạng thái kết nối: ${isConnected ? '🟢 ONLINE' : '🔴 OFFLINE'}\n`;
            statusMsg += `⚙️ Cài đặt: ${config.settings.enabled ? '✅ BẬT' : '❌ TẮT'}\n\n`;
            
            if (config.discord.channelId) {
                statusMsg += `📱 Discord Channel: ${config.discord.channelId}\n`;
                statusMsg += `🤖 Discord Bot: ${config.discord.token ? '✅ Đã cài đặt' : '❌ Chưa cài đặt'}\n\n`;
            } else {
                statusMsg += "❌ Chưa cài đặt Discord\n\n";
            }
            
            statusMsg += `👥 Threads kết nối: ${config.messenger.connectedThreads.length}\n`;
            statusMsg += `🛡️ Admin threads: ${config.messenger.adminThreads.length}\n\n`;
            
            statusMsg += "━━━━━━━━━━━━━━━━━━━━━━━\n";
            statusMsg += "💡 Credit: waguri";
            
            api.sendMessage(statusMsg, event.threadID);
            break;

        default:
            api.sendMessage("❌ Lệnh không hợp lệ! Sử dụng 'messenger-discord' để xem hướng dẫn.", event.threadID);
    }
};

// Kết nối Discord
async function connectDiscord(messengerApi, config) {
    if (discordClient) {
        discordClient.destroy();
    }

    discordClient = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.DirectMessages
        ]
    });

    discordClient.on('ready', () => {
        console.log(`✅ Discord bot ${discordClient.user.tag} đã sẵn sàng!`);
        isConnected = true;
    });

    discordClient.on('messageCreate', async (message) => {
        // Bỏ qua tin nhắn từ bot
        if (message.author.bot) return;
        
        // Chỉ xử lý tin nhắn từ channel được cài đặt
        if (message.channel.id !== config.discord.channelId) return;

        // Tạo tin nhắn chuyển tiếp từ Discord
        let forwardMessage = `💬 Tin nhắn từ Discord:\n`;
        forwardMessage += `👤 ${message.author.username}: ${message.content}\n\n`;
        forwardMessage += `💡 Credit: waguri`;

        // Gửi đến tất cả thread Messenger đã kết nối
        for (let threadID of config.messenger.connectedThreads) {
            try {
                if (message.attachments.size > 0) {
                    // Xử lý attachment
                    const attachments = Array.from(message.attachments.values());
                    const attachmentUrls = attachments.map(att => att.url);
                    const streams = attachmentUrls.map(url => require('request')(url));
                    
                    messengerApi.sendMessage({
                        body: forwardMessage,
                        attachment: streams
                    }, threadID);
                } else {
                    messengerApi.sendMessage(forwardMessage, threadID);
                }
            } catch (error) {
                console.log("Lỗi gửi tin nhắn đến thread:", threadID);
            }
        }
    });

    discordClient.on('error', (error) => {
        console.error('Discord client error:', error);
        isConnected = false;
    });

    await discordClient.login(config.discord.token);
}

module.exports.handleEvent = async function({ api, event, Users, Threads }) {
    // Kiểm tra credit trước khi xử lý
    if (!creditCheck()) {
        return;
    }

    if (event.type !== "message" || event.senderID === api.getCurrentUserID()) {
        return;
    }

    const cacheDir = path.join(__dirname, 'cache', 'messenger-discord');
    const configFile = path.join(cacheDir, 'config.json');

    if (!fs.existsSync(configFile)) {
        return;
    }

    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

    // Kiểm tra xem có kết nối và thread có trong danh sách không
    if (!isConnected || !discordClient || !config.settings.enabled) {
        return;
    }

    if (!config.messenger.connectedThreads.includes(event.threadID)) {
        return;
    }

    const senderInfo = await Users.getInfo(event.senderID);
    const senderName = senderInfo.name || "Người dùng";
    const threadInfo = await api.getThreadInfo(event.threadID);
    const threadName = threadInfo.threadName || "Nhóm không tên";

    // Tạo tin nhắn chuyển tiếp đến Discord
    let forwardMessage = `💬 **Tin nhắn từ Messenger**\n`;
    forwardMessage += `👤 **${senderName}** (từ "${threadName}"):\n`;
    forwardMessage += `${event.body || '[Không có nội dung text]'}\n\n`;
    forwardMessage += `💡 Credit: waguri`;

    const channel = discordClient.channels.cache.get(config.discord.channelId);
    if (!channel) {
        return;
    }

    try {
        if (event.attachments && event.attachments.length > 0) {
            // Gửi tin nhắn và attachment
            await channel.send({
                content: forwardMessage,
                files: event.attachments.map(att => ({
                    attachment: att.url,
                    name: att.filename || 'attachment'
                }))
            });
        } else {
            // Chỉ gửi text
            await channel.send(forwardMessage);
        }
    } catch (error) {
        console.log("Lỗi gửi tin nhắn đến Discord:", error);
    }
};

// Auto reconnect khi module được load
module.exports.onLoad = async function() {
    if (!creditCheck()) {
        return;
    }

    const cacheDir = path.join(__dirname, 'cache', 'messenger-discord');
    const configFile = path.join(cacheDir, 'config.json');

    if (fs.existsSync(configFile)) {
        const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        
        if (config.settings.enabled && config.settings.autoReconnect && 
            config.discord.token && config.discord.channelId) {
            
            setTimeout(async () => {
                try {
                    await connectDiscord(global.api || {}, config);
                    console.log("✅ Auto-reconnected Discord bot");
                } catch (error) {
                    console.log("❌ Auto-reconnect failed:", error.message);
                }
            }, 3000);
        }
    }
};
