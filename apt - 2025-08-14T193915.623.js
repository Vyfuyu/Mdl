
module.exports.config = {
    name: "quanly",
    version: "2.0.0",
    hasPermssion: 2,
    credits: "Kaori Waguri",
    description: "Quản lý hệ thống bot dễ dàng",
    commandCategory: "Hệ Thống",
    usages: "restart | files | clean | update | status",
    cooldowns: 5
};

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports.run = async function({ api, event, args, Users, Threads }) {
    try {
        const { threadID, messageID, senderID } = event;
        const command = args[0]?.toLowerCase();
        
        // Kiểm tra quyền admin
        if (!global.config.ADMINBOT.includes(senderID) && !global.config.NDH.includes(senderID)) {
            return api.sendMessage("❌ Bạn không có quyền sử dụng lệnh này!", threadID, messageID);
        }
        
        if (!command) {
            return api.sendMessage(
                `🔧 **QUẢN LÝ HỆ THỐNG** 🔧\n────────────────────\n` +
                `📋 **Các lệnh có sẵn:**\n` +
                `• quanly restart - Khởi động lại bot\n` +
                `• quanly files - Xem danh sách files\n` +
                `• quanly clean - Dọn dẹp cache\n` +
                `• quanly update - Cập nhật packages\n` +
                `• quanly status - Xem trạng thái bot\n` +
                `• quanly backup - Sao lưu dữ liệu\n\n` +
                `💡 Thay thế lệnh apt cũ với giao diện thân thiện hơn!`,
                threadID, messageID
            );
        }
        
        switch (command) {
            case "restart":
            case "khoidong":
                try {
                    api.sendMessage("🔄 Đang khởi động lại bot...", threadID, () => {
                        setTimeout(() => {
                            process.exit(0);
                        }, 2000);
                    });
                } catch (error) {
                    return api.sendMessage(`❌ Lỗi khởi động lại: ${error.message}`, threadID, messageID);
                }
                break;
                
            case "files":
            case "file":
                try {
                    const modulesPath = path.join(__dirname);
                    const files = fs.readdirSync(modulesPath)
                        .filter(file => file.endsWith('.js'))
                        .slice(0, 30);
                    
                    const filesList = files.map((file, index) => `${index + 1}. ${file}`).join('\n');
                    
                    return api.sendMessage(
                        `📁 **DANH SÁCH FILES** 📁\n────────────────────\n` +
                        `📊 Tổng cộng: ${files.length} files\n\n${filesList}\n\n` +
                        `💡 Sử dụng: chichi delete [tên file] để xóa`,
                        threadID, messageID
                    );
                } catch (error) {
                    return api.sendMessage(`❌ Lỗi khi liệt kê files: ${error.message}`, threadID, messageID);
                }
                break;
                
            case "clean":
            case "donep":
                try {
                    const cacheDir = path.join(__dirname, 'cache');
                    if (fs.existsSync(cacheDir)) {
                        const files = fs.readdirSync(cacheDir);
                        files.forEach(file => {
                            const filePath = path.join(cacheDir, file);
                            if (fs.lstatSync(filePath).isFile()) {
                                fs.unlinkSync(filePath);
                            }
                        });
                        return api.sendMessage(`✅ Đã dọn dẹp ${files.length} files cache!`, threadID, messageID);
                    } else {
                        return api.sendMessage("📁 Thư mục cache không tồn tại!", threadID, messageID);
                    }
                } catch (error) {
                    return api.sendMessage(`❌ Lỗi khi dọn dẹp: ${error.message}`, threadID, messageID);
                }
                break;
                
            case "update":
            case "capnhat":
                try {
                    api.sendMessage("📦 Đang cập nhật packages...", threadID, (err, info) => {
                        try {
                            execSync('npm update', { stdio: 'inherit' });
                            api.editMessage("✅ Đã cập nhật packages thành công!", info.messageID);
                        } catch (updateError) {
                            api.editMessage(`❌ Lỗi cập nhật: ${updateError.message}`, info.messageID);
                        }
                    });
                } catch (error) {
                    return api.sendMessage(`❌ Lỗi khi cập nhật: ${error.message}`, threadID, messageID);
                }
                break;
                
            case "status":
            case "trangthai":
                try {
                    const uptime = process.uptime();
                    const hours = Math.floor(uptime / 3600);
                    const minutes = Math.floor((uptime % 3600) / 60);
                    const seconds = Math.floor(uptime % 60);
                    
                    const memoryUsage = process.memoryUsage();
                    const memUsed = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
                    const memTotal = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
                    
                    return api.sendMessage(
                        `📊 **TRẠNG THÁI BOT** 📊\n────────────────────\n` +
                        `⏰ Uptime: ${hours}h ${minutes}m ${seconds}s\n` +
                        `💾 RAM: ${memUsed}MB / ${memTotal}MB\n` +
                        `🔧 Node.js: ${process.version}\n` +
                        `📦 Platform: ${process.platform}\n` +
                        `🎯 Commands: ${global.client.commands.size}\n` +
                        `👥 Threads: ${global.data.allThreadID.length}\n` +
                        `🎮 Status: ✅ Hoạt động bình thường`,
                        threadID, messageID
                    );
                } catch (error) {
                    return api.sendMessage(`❌ Lỗi khi xem trạng thái: ${error.message}`, threadID, messageID);
                }
                break;
                
            case "backup":
            case "saoluu":
                try {
                    const backupData = {
                        config: global.config,
                        commandsCount: global.client.commands.size,
                        threadsCount: global.data.allThreadID.length,
                        timestamp: new Date().toISOString()
                    };
                    
                    const backupFile = `backup_${Date.now()}.json`;
                    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
                    
                    return api.sendMessage({
                        body: `✅ **SAO LƯU THÀNH CÔNG** ✅\n────────────────────\n📁 File: ${backupFile}\n⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}\n💾 Dữ liệu đã được sao lưu!`,
                        attachment: fs.createReadStream(backupFile)
                    }, threadID, () => {
                        fs.unlinkSync(backupFile);
                    });
                } catch (error) {
                    return api.sendMessage(`❌ Lỗi khi sao lưu: ${error.message}`, threadID, messageID);
                }
                break;
                
            default:
                return api.sendMessage(
                    `❌ Lệnh không hợp lệ!\n\n📋 **Các lệnh có sẵn:**\n` +
                    `restart, files, clean, update, status, backup`,
                    threadID, messageID
                );
        }
        
    } catch (error) {
        console.error("Quanly command error:", error);
        return api.sendMessage(`❌ Đã xảy ra lỗi: ${error.message}`, threadID, messageID);
    }
};
