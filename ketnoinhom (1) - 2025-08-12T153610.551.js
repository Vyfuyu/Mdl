
const fs = require('fs');
const path = require('path');

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
    name: "ketnoinhom",
    version: "1.0.0",
    hasPermssion: 1,
    credits: "waguri",
    description: "Kết nối các nhóm để nhắn tin qua bot",
    commandCategory: "Tiện ích",
    usages: "[ketnoi/ngatketnoi/chonnhom/tinhtrang/on/off]",
    cooldowns: 3,
    dependencies: {}
};

module.exports.run = async function({ api, event, args, Users, Threads }) {
    // Kiểm tra credit
    if (!creditCheck()) {
        return api.sendMessage("❌ Module đã bị thay đổi credit không được phép!", event.threadID);
    }

    const cacheDir = path.join(__dirname, 'cache', 'ketnoinhom');
    const connectionsFile = path.join(cacheDir, 'connections.json');
    const settingsFile = path.join(cacheDir, 'settings.json');

    // Tạo thư mục cache nếu chưa có
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Khởi tạo file nếu chưa có
    if (!fs.existsSync(connectionsFile)) {
        fs.writeFileSync(connectionsFile, JSON.stringify({
            allConnected: false,
            specificConnections: {}
        }, null, 2));
    }

    if (!fs.existsSync(settingsFile)) {
        fs.writeFileSync(settingsFile, JSON.stringify({
            connectedThreads: [],
            enabledThreads: {},
            globalEnabled: true
        }, null, 2));
    }

    let connections = JSON.parse(fs.readFileSync(connectionsFile, 'utf8'));
    let settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));

    const threadInfo = await api.getThreadInfo(event.threadID);
    const threadName = threadInfo.threadName || "Nhóm không tên";

    if (!args[0]) {
        return api.sendMessage("📋 MENU - KẾT NỐI NHÓM\n" +
            "━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "🔗 CÁC LỆNH KẾT NỐI:\n" +
            "• ketnoinhom ketnoi - Kết nối tất cả nhóm\n" +
            "• ketnoinhom ngatketnoi - Ngắt kết nối tất cả\n" +
            "• ketnoinhom chonnhom [ID] - Chọn 1 nhóm\n" +
            "• ketnoinhom ngatchon - Ngắt kết nối chọn lọc\n\n" +
            "⚙️ CÁC LỆNH ĐIỀU KHIỂN:\n" +
            "• ketnoinhom on - Bật chức năng cho nhóm\n" +
            "• ketnoinhom off - Tắt chức năng cho nhóm\n" +
            "• ketnoinhom tinhtrang - Xem tình trạng\n\n" +
            "💬 CÁCH SỬ DỤNG:\n" +
            "- Gửi tin nhắn thường: Tin sẽ được chuyển\n" +
            "- Reply tin nhắn bot: Trả lời qua nhóm khác\n\n" +
            "━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "💡 Credit: waguri", event.threadID);
    }

    switch (args[0].toLowerCase()) {
        case "ketnoi":
            connections.allConnected = true;
            connections.specificConnections = {};
            if (!settings.connectedThreads.includes(event.threadID)) {
                settings.connectedThreads.push(event.threadID);
            }
            
            fs.writeFileSync(connectionsFile, JSON.stringify(connections, null, 2));
            fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
            
            api.sendMessage(`✅ Đã kết nối "${threadName}" với tất cả nhóm!\n\n` +
                "🔗 Mọi tin nhắn từ nhóm này sẽ được chuyển đến tất cả nhóm khác mà bot đang tham gia.\n\n" +
                "💡 Credit: waguri", event.threadID);
            break;

        case "ngatketnoi":
            connections.allConnected = false;
            connections.specificConnections = {};
            settings.connectedThreads = settings.connectedThreads.filter(id => id !== event.threadID);
            
            fs.writeFileSync(connectionsFile, JSON.stringify(connections, null, 2));
            fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
            
            api.sendMessage(`❌ Đã ngắt kết nối "${threadName}" với tất cả nhóm!\n\n` +
                "💡 Credit: waguri", event.threadID);
            break;

        case "chonnhom":
            if (!args[1]) {
                return api.sendMessage("❌ Vui lòng nhập ID nhóm cần kết nối!\n" +
                    "Ví dụ: ketnoinhom chonnhom 123456789", event.threadID);
            }

            const targetThreadID = args[1];
            try {
                const targetThreadInfo = await api.getThreadInfo(targetThreadID);
                const targetThreadName = targetThreadInfo.threadName || "Nhóm không tên";

                connections.allConnected = false;
                if (!connections.specificConnections[event.threadID]) {
                    connections.specificConnections[event.threadID] = [];
                }
                
                if (!connections.specificConnections[event.threadID].includes(targetThreadID)) {
                    connections.specificConnections[event.threadID].push(targetThreadID);
                }

                if (!connections.specificConnections[targetThreadID]) {
                    connections.specificConnections[targetThreadID] = [];
                }
                
                if (!connections.specificConnections[targetThreadID].includes(event.threadID)) {
                    connections.specificConnections[targetThreadID].push(event.threadID);
                }

                fs.writeFileSync(connectionsFile, JSON.stringify(connections, null, 2));

                api.sendMessage(`✅ Đã kết nối "${threadName}" với "${targetThreadName}"!\n\n` +
                    "🔗 Hai nhóm này giờ có thể trò chuyện với nhau qua bot.\n\n" +
                    "💡 Credit: waguri", event.threadID);

                api.sendMessage(`🔗 Nhóm "${threadName}" đã kết nối với nhóm này!\n\n` +
                    "💬 Bây giờ các bạn có thể trò chuyện với nhau qua bot.\n\n" +
                    "💡 Credit: waguri", targetThreadID);

            } catch (error) {
                api.sendMessage("❌ Không thể kết nối với nhóm này! Kiểm tra lại ID nhóm.", event.threadID);
            }
            break;

        case "ngatchon":
            if (connections.specificConnections[event.threadID]) {
                delete connections.specificConnections[event.threadID];
                fs.writeFileSync(connectionsFile, JSON.stringify(connections, null, 2));
                api.sendMessage(`❌ Đã ngắt tất cả kết nối chọn lọc của "${threadName}"!\n\n` +
                    "💡 Credit: waguri", event.threadID);
            } else {
                api.sendMessage("ℹ️ Nhóm này chưa có kết nối chọn lọc nào!", event.threadID);
            }
            break;

        case "on":
            if (!settings.enabledThreads) settings.enabledThreads = {};
            settings.enabledThreads[event.threadID] = true;
            fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
            
            api.sendMessage(`✅ Đã BẬT chức năng kết nối nhóm cho "${threadName}"!\n\n` +
                "🔥 Giờ mọi người trong nhóm đều có thể sử dụng chức năng này.\n\n" +
                "💡 Credit: waguri", event.threadID);
            break;

        case "off":
            if (!settings.enabledThreads) settings.enabledThreads = {};
            settings.enabledThreads[event.threadID] = false;
            fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
            
            api.sendMessage(`❌ Đã TẮT chức năng kết nối nhóm cho "${threadName}"!\n\n` +
                "🚫 Chỉ admin nhóm mới có thể sử dụng chức năng này.\n\n" +
                "💡 Credit: waguri", event.threadID);
            break;

        case "tinhtrang":
            let statusMsg = `📊 TÌNH TRẠNG KẾT NỐI\n`;
            statusMsg += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
            statusMsg += `📍 Nhóm: "${threadName}"\n\n`;
            
            // Kiểm tra trạng thái bật/tắt
            const isEnabled = settings.enabledThreads && settings.enabledThreads[event.threadID] !== false;
            statusMsg += `⚙️ Trạng thái: ${isEnabled ? '🟢 BẬT' : '🔴 TẮT'}\n`;
            statusMsg += `👥 Quyền sử dụng: ${isEnabled ? 'Mọi người' : 'Chỉ admin'}\n\n`;
            
            if (connections.allConnected) {
                statusMsg += "🌐 Loại kết nối: TẤT CẢ NHÓM\n";
                statusMsg += "📝 Tin nhắn sẽ được chuyển đến mọi nhóm bot tham gia\n\n";
            } else if (connections.specificConnections[event.threadID] && 
                       connections.specificConnections[event.threadID].length > 0) {
                statusMsg += "🎯 Loại kết nối: CHỌN LỌC\n";
                statusMsg += "📝 Đang kết nối với:\n";
                
                for (let targetID of connections.specificConnections[event.threadID]) {
                    try {
                        const targetInfo = await api.getThreadInfo(targetID);
                        const targetName = targetInfo.threadName || "Nhóm không tên";
                        statusMsg += `   • ${targetName}\n`;
                    } catch {
                        statusMsg += `   • Nhóm không xác định (${targetID})\n`;
                    }
                }
                statusMsg += "\n";
            } else {
                statusMsg += "❌ Chưa có kết nối nào\n\n";
            }
            
            statusMsg += "━━━━━━━━━━━━━━━━━━━━━━━\n";
            statusMsg += "💡 Credit: waguri";
            api.sendMessage(statusMsg, event.threadID);
            break;

        default:
            api.sendMessage("❌ Lệnh không hợp lệ! Sử dụng 'ketnoinhom' để xem hướng dẫn.", event.threadID);
    }
};

module.exports.handleEvent = async function({ api, event, Users, Threads }) {
    // Kiểm tra credit trước khi xử lý
    if (!creditCheck()) {
        return;
    }

    if (event.type !== "message" || event.senderID === api.getCurrentUserID()) {
        return;
    }

    const cacheDir = path.join(__dirname, 'cache', 'ketnoinhom');
    const connectionsFile = path.join(cacheDir, 'connections.json');
    const settingsFile = path.join(cacheDir, 'settings.json');

    if (!fs.existsSync(connectionsFile) || !fs.existsSync(settingsFile)) {
        return;
    }

    const connections = JSON.parse(fs.readFileSync(connectionsFile, 'utf8'));
    const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    
    // Kiểm tra quyền sử dụng
    const isEnabled = settings.enabledThreads && settings.enabledThreads[event.threadID] !== false;
    if (!isEnabled) {
        const threadInfo = await api.getThreadInfo(event.threadID);
        const isAdmin = threadInfo.adminIDs.some(admin => admin.id === event.senderID);
        if (!isAdmin) {
            return; // Chỉ admin mới được sử dụng khi tắt
        }
    }

    const senderInfo = await Users.getInfo(event.senderID);
    const senderName = senderInfo.name || "Người dùng";
    const threadInfo = await api.getThreadInfo(event.threadID);
    const threadName = threadInfo.threadName || "Nhóm không tên";

    let targetThreads = [];
    let isReply = false;
    let replyToThread = null;

    // Kiểm tra nếu là reply tin nhắn từ bot
    if (event.messageReply && event.messageReply.senderID === api.getCurrentUserID()) {
        // Tìm nhóm gốc từ tin nhắn bot
        const botMessage = event.messageReply.body;
        if (botMessage && botMessage.includes('💬 Tin nhắn từ "')) {
            const match = botMessage.match(/💬 Tin nhắn từ "([^"]+)"/);
            if (match) {
                const originalThreadName = match[1];
                // Tìm thread ID từ tên nhóm
                const threadList = await api.getThreadList(100, null, ["INBOX"]);
                const originalThread = threadList.find(thread => 
                    thread.isGroup && 
                    (thread.name === originalThreadName || thread.threadName === originalThreadName)
                );
                if (originalThread) {
                    targetThreads = [originalThread.threadID];
                    isReply = true;
                    replyToThread = originalThreadName;
                }
            }
        }
    }

    // Nếu không phải reply, áp dụng logic kết nối thông thường
    if (!isReply) {
        if (connections.allConnected) {
            const threadList = await api.getThreadList(100, null, ["INBOX"]);
            targetThreads = threadList
                .filter(thread => thread.isGroup && thread.threadID !== event.threadID)
                .map(thread => thread.threadID);
        } else if (connections.specificConnections[event.threadID]) {
            targetThreads = connections.specificConnections[event.threadID];
        }
    }

    if (targetThreads.length === 0) {
        return;
    }

    // Tạo tin nhắn chuyển tiếp
    let forwardMessage;
    if (isReply) {
        forwardMessage = `💬 Trả lời từ "${threadName}" → "${replyToThread}":\n`;
        forwardMessage += `👤 ${senderName}: ${event.body}\n\n`;
        forwardMessage += `💡 Credit: waguri`;
    } else {
        forwardMessage = `💬 Tin nhắn từ "${threadName}":\n`;
        forwardMessage += `👤 ${senderName}: ${event.body}\n\n`;
        forwardMessage += `💡 Credit: waguri`;
    }

    // Xử lý attachment nếu có
    if (event.attachments && event.attachments.length > 0) {
        const attachments = event.attachments.map(att => att.url).filter(url => url);
        
        for (let targetID of targetThreads) {
            try {
                if (attachments.length > 0) {
                    const attachmentStreams = attachments.map(url => require('request')(url));
                    api.sendMessage({
                        body: forwardMessage,
                        attachment: attachmentStreams
                    }, targetID);
                } else {
                    api.sendMessage(forwardMessage, targetID);
                }
            } catch (error) {
                console.log("Lỗi gửi tin nhắn đến nhóm:", targetID);
            }
        }
    } else {
        // Chỉ gửi text
        for (let targetID of targetThreads) {
            try {
                api.sendMessage(forwardMessage, targetID);
            } catch (error) {
                console.log("Lỗi gửi tin nhắn đến nhóm:", targetID);
            }
        }
    }
};
