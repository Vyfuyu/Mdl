
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
    usages: "[ketnoi/ngatketnoi/chonnhom/tinhtrang]",
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
            connectedThreads: []
        }, null, 2));
    }

    let connections = JSON.parse(fs.readFileSync(connectionsFile, 'utf8'));
    let settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));

    const threadInfo = await api.getThreadInfo(event.threadID);
    const threadName = threadInfo.threadName || "Nhóm không tên";

    if (!args[0]) {
        return api.sendMessage("📋 Hướng dẫn sử dụng:\n\n" +
            "• ketnoinhom ketnoi - Kết nối tất cả nhóm\n" +
            "• ketnoinhom ngatketnoi - Ngắt kết nối tất cả\n" +
            "• ketnoinhom chonnhom [ID nhóm] - Chọn 1 nhóm để trò chuyện\n" +
            "• ketnoinhom ngatchon - Ngắt kết nối chọn lọc\n" +
            "• ketnoinhom tinhtrang - Xem tình trạng kết nối\n\n" +
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

        case "tinhtrang":
            let statusMsg = `📊 Tình trạng kết nối của "${threadName}":\n\n`;
            
            if (connections.allConnected) {
                statusMsg += "🌐 Kết nối: TẤT CẢ NHÓM\n";
                statusMsg += "📝 Tin nhắn sẽ được chuyển đến tất cả nhóm bot tham gia\n\n";
            } else if (connections.specificConnections[event.threadID] && 
                       connections.specificConnections[event.threadID].length > 0) {
                statusMsg += "🎯 Kết nối: CHỌN LỌC\n";
                statusMsg += "📝 Đang kết nối với các nhóm:\n";
                
                for (let targetID of connections.specificConnections[event.threadID]) {
                    try {
                        const targetInfo = await api.getThreadInfo(targetID);
                        const targetName = targetInfo.threadName || "Nhóm không tên";
                        statusMsg += `   • ${targetName} (${targetID})\n`;
                    } catch {
                        statusMsg += `   • Nhóm không xác định (${targetID})\n`;
                    }
                }
                statusMsg += "\n";
            } else {
                statusMsg += "❌ Không có kết nối nào\n\n";
            }
            
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

    if (!fs.existsSync(connectionsFile)) {
        return;
    }

    const connections = JSON.parse(fs.readFileSync(connectionsFile, 'utf8'));
    const senderInfo = await Users.getInfo(event.senderID);
    const senderName = senderInfo.name || "Người dùng";
    const threadInfo = await api.getThreadInfo(event.threadID);
    const threadName = threadInfo.threadName || "Nhóm không tên";

    let targetThreads = [];

    if (connections.allConnected) {
        // Lấy danh sách tất cả nhóm bot tham gia
        const threadList = await api.getThreadList(100, null, ["INBOX"]);
        targetThreads = threadList
            .filter(thread => thread.isGroup && thread.threadID !== event.threadID)
            .map(thread => thread.threadID);
    } else if (connections.specificConnections[event.threadID]) {
        targetThreads = connections.specificConnections[event.threadID];
    }

    if (targetThreads.length === 0) {
        return;
    }

    // Tạo tin nhắn chuyển tiếp
    let forwardMessage = `💬 Tin nhắn từ "${threadName}":\n`;
    forwardMessage += `👤 ${senderName}: ${event.body}\n\n`;
    forwardMessage += `💡 Credit: waguri`;

    // Xử lý attachment nếu có
    if (event.attachments && event.attachments.length > 0) {
        const attachments = event.attachments.map(att => att.url).filter(url => url);
        
        for (let targetID of targetThreads) {
            try {
                if (attachments.length > 0) {
                    // Gửi tin nhắn kèm attachment
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
