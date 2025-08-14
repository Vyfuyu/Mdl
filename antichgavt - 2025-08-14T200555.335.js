
module.exports.config = {
    name: "antichgavt",
    version: "1.0.0",
    hasPermssion: 1,
    credits: "Kaori Waguri",
    description: "Quản lý tính năng chống đổi ảnh avatar nhóm",
    commandCategory: "Quản trị viên",
    usages: "[on/off] | backup [phản hồi ảnh] | reset",
    cooldowns: 5,
};

module.exports.run = async function({ api, event, args, Threads }) {
    const fs = require("fs");
    const axios = require("axios");
    const path = require("path");
    const { threadID, senderID, messageID } = event;
    
    // Kiểm tra quyền quản trị viên
    const threadInfo = await api.getThreadInfo(threadID);
    const isAdmin = threadInfo.adminIDs.some(admin => admin.id == senderID);
    
    if (!isAdmin) {
        return api.sendMessage("❌ Bạn cần có quyền quản trị viên để sử dụng lệnh này!", threadID, messageID);
    }
    
    const avatarDir = path.join(__dirname, "..", "events", "cache", "groupAvatars");
    const avatarPath = path.join(avatarDir, `${threadID}.jpg`);
    
    // Tạo thư mục nếu chưa có
    if (!fs.existsSync(avatarDir)) {
        fs.mkdirSync(avatarDir, { recursive: true });
    }
    
    if (!args[0]) {
        return api.sendMessage(
            "🛡️ QUẢN LÝ CHỐNG ĐỔI ẢNH NHÓM 🛡️\n\n" +
            "📝 Cách sử dụng:\n" +
            "• antichgavt on - Bật tính năng\n" +
            "• antichgavt off - Tắt tính năng\n" +
            "• antichgavt backup - Đặt ảnh backup mới\n" +
            "• antichgavt reset - Xóa ảnh backup\n" +
            "• antichgavt status - Xem trạng thái\n\n" +
            "📌 Credit: Kaori Waguri",
            threadID, messageID
        );
    }
    
    switch (args[0].toLowerCase()) {
        case "on":
        case "enable":
            global.configModule.antiChangeAvatar = global.configModule.antiChangeAvatar || {};
            global.configModule.antiChangeAvatar.enable = true;
            
            // Lưu ảnh hiện tại làm backup nếu chưa có
            if (!fs.existsSync(avatarPath)) {
                try {
                    const currentAvatar = threadInfo.imageSrc;
                    if (currentAvatar) {
                        const response = await axios.get(currentAvatar, {
                            responseType: 'stream'
                        });
                        
                        const writer = fs.createWriteStream(avatarPath);
                        response.data.pipe(writer);
                        
                        await new Promise((resolve, reject) => {
                            writer.on('finish', resolve);
                            writer.on('error', reject);
                        });
                    }
                } catch (error) {
                    console.log("Lỗi khi lưu ảnh backup:", error.message);
                }
            }
            
            api.sendMessage("✅ Đã bật tính năng chống đổi ảnh nhóm!\n🔒 Ảnh nhóm hiện tại sẽ được bảo vệ.", threadID, messageID);
            break;
            
        case "off":
        case "disable":
            global.configModule.antiChangeAvatar = global.configModule.antiChangeAvatar || {};
            global.configModule.antiChangeAvatar.enable = false;
            api.sendMessage("❌ Đã tắt tính năng chống đổi ảnh nhóm!", threadID, messageID);
            break;
            
        case "backup":
        case "set":
            if (event.attachments && event.attachments[0] && event.attachments[0].type == "photo") {
                try {
                    const response = await axios.get(event.attachments[0].url, {
                        responseType: 'stream'
                    });
                    
                    const writer = fs.createWriteStream(avatarPath);
                    response.data.pipe(writer);
                    
                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });
                    
                    api.sendMessage("✅ Đã cập nhật ảnh backup mới cho nhóm!\n🔒 Ảnh này sẽ được sử dụng để khôi phục khi có người đổi ảnh nhóm.", threadID, messageID);
                    
                } catch (error) {
                    api.sendMessage(`❌ Lỗi khi cập nhật ảnh backup: ${error.message}`, threadID, messageID);
                }
            } else {
                return api.sendMessage("📷 Vui lòng phản hồi lệnh này kèm theo ảnh để đặt làm backup!", threadID, (err, info) => {
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        author: senderID,
                        type: "setBackupAvatar"
                    });
                });
            }
            break;
            
        case "reset":
        case "clear":
            if (fs.existsSync(avatarPath)) {
                fs.unlinkSync(avatarPath);
                api.sendMessage("🗑️ Đã xóa ảnh backup! Tính năng sẽ tự động lưu ảnh mới khi có người đổi ảnh nhóm lần tiếp theo.", threadID, messageID);
            } else {
                api.sendMessage("❌ Không có ảnh backup nào để xóa!", threadID, messageID);
            }
            break;
            
        case "status":
        case "info":
            const isEnabled = global.configModule.antiChangeAvatar?.enable || false;
            const hasBackup = fs.existsSync(avatarPath);
            
            const statusMsg = "🛡️ TRẠNG THÁI CHỐNG ĐỔI ẢNH NHÓM 🛡️\n\n" +
                            `🔧 Tình trạng: ${isEnabled ? "🟢 Đang bật" : "🔴 Đang tắt"}\n` +
                            `💾 Ảnh backup: ${hasBackup ? "✅ Có sẵn" : "❌ Chưa có"}\n` +
                            `📊 Thread ID: ${threadID}\n\n` +
                            "📌 Credit: Kaori Waguri";
            
            api.sendMessage(statusMsg, threadID, messageID);
            break;
            
        default:
            api.sendMessage("❌ Tham số không hợp lệ! Sử dụng: on/off/backup/reset/status", threadID, messageID);
    }
};

module.exports.handleReply = async function({ api, event, handleReply }) {
    const { threadID, senderID, attachments } = event;
    const { author, type } = handleReply;
    
    if (senderID != author) return;
    
    if (type == "setBackupAvatar") {
        if (attachments && attachments[0] && attachments[0].type == "photo") {
            const fs = require("fs");
            const axios = require("axios");
            const path = require("path");
            
            const avatarDir = path.join(__dirname, "..", "events", "cache", "groupAvatars");
            const avatarPath = path.join(avatarDir, `${threadID}.jpg`);
            
            try {
                const response = await axios.get(attachments[0].url, {
                    responseType: 'stream'
                });
                
                const writer = fs.createWriteStream(avatarPath);
                response.data.pipe(writer);
                
                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
                
                api.sendMessage("✅ Đã cập nhật ảnh backup mới cho nhóm!\n🔒 Ảnh này sẽ được sử dụng để khôi phục khi có người đổi ảnh nhóm.", threadID);
                
            } catch (error) {
                api.sendMessage(`❌ Lỗi khi cập nhật ảnh backup: ${error.message}`, threadID);
            }
        } else {
            api.sendMessage("❌ Vui lòng gửi kèm ảnh để làm backup!", threadID);
        }
        
        // Xóa handleReply
        const index = global.client.handleReply.findIndex(item => item.messageID == handleReply.messageID);
        if (index !== -1) global.client.handleReply.splice(index, 1);
    }
};
