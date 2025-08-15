
module.exports.config = {
    name: "ghepdoi",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Assistant",
    description: "Ghép đôi ngẫu nhiên với thành viên từ các nhóm khác",
    commandCategory: "giải trí",
    usages: "ghepdoi",
    cooldowns: 30,
    dependencies: {
        "fs-extra": "",
        "axios": ""
    }
};

module.exports.run = async ({ event, api, Users }) => {
    const fs = global.nodemodule["fs-extra"];
    const { threadID, senderID, messageID } = event;
    
    try {
        // Lấy thông tin người dùng hiện tại
        const senderInfo = await api.getUserInfo(senderID);
        const senderName = senderInfo[senderID].name;
        const senderGender = senderInfo[senderID].gender;
        const senderProfile = `https://facebook.com/${senderID}`;
        
        // Lấy danh sách tất cả các thread mà bot đang tham gia
        const threadList = await api.getThreadList(100, null, ["INBOX"]);
        const allThreads = threadList.filter(thread => 
            thread.isGroup && 
            thread.threadID !== threadID && 
            thread.participants && 
            thread.participants.length > 0
        );
        
        if (allThreads.length === 0) {
            return api.sendMessage("❌ Bot chưa tham gia nhóm nào khác để ghép đôi!", threadID, messageID);
        }
        
        api.sendMessage("🔍 Đang tìm kiếm người phù hợp từ các nhóm khác...", threadID, messageID);
        
        // Thu thập tất cả thành viên từ các nhóm khác
        let allMembers = [];
        
        for (const thread of allThreads) {
            try {
                const threadInfo = await api.getThreadInfo(thread.threadID);
                const participants = threadInfo.participantIDs.filter(id => 
                    id !== api.getCurrentUserID() && 
                    id !== senderID
                );
                
                for (const participantID of participants) {
                    allMembers.push({
                        userID: participantID,
                        threadID: thread.threadID,
                        threadName: thread.name || "Nhóm chat"
                    });
                }
            } catch (e) {
                console.log(`Không thể lấy thông tin thread ${thread.threadID}`);
            }
        }
        
        if (allMembers.length === 0) {
            return api.sendMessage("❌ Không tìm thấy thành viên nào từ các nhóm khác!", threadID, messageID);
        }
        
        // Chọn ngẫu nhiên một thành viên
        const randomMember = allMembers[Math.floor(Math.random() * allMembers.length)];
        
        // Lấy thông tin của người được ghép đôi
        const partnerInfo = await api.getUserInfo(randomMember.userID);
        const partnerData = partnerInfo[randomMember.userID];
        const partnerName = partnerData.name;
        const partnerGender = partnerData.gender;
        const partnerProfile = `https://facebook.com/${randomMember.userID}`;
        
        // Xác định giới tính
        const getGenderText = (gender) => {
            switch(gender) {
                case 1: return "👩 Nữ";
                case 2: return "👨 Nam";
                default: return "❓ Không xác định";
            }
        };
        
        // Tạo tin nhắn thông báo ghép đôi thành công
        const successMessage = `
╭─────────────────────╮
│    💕 GHÉP ĐÔI THÀNH CÔNG 💕    │
╰─────────────────────╯

🎉 Chúc mừng! Bạn đã được ghép đôi thành công!

👤 THÔNG TIN CỦA BẠN:
   📝 Tên: ${senderName}
   ${getGenderText(senderGender)}
   🔗 Facebook: ${senderProfile}

💑 ĐỐI TÁC CỦA BẠN:
   📝 Tên: ${partnerName}
   ${getGenderText(partnerGender)}
   🏠 Từ nhóm: ${randomMember.threadName}
   🔗 Facebook: ${partnerProfile}

💌 Hãy nhấn vào link Facebook để kết bạn và trò chuyện nhé!

⭐ Chúc hai bạn có những khoảnh khắc vui vẻ bên nhau! ⭐
`;

        // Tạo tin nhắn cho đối tác
        const partnerMessage = `
╭─────────────────────╮
│    💕 THÔNG BÁO GHÉP ĐÔI 💕    │
╰─────────────────────╯

🎉 Chào ${partnerName}! Bạn vừa được ghép đôi!

💑 ĐỐI TÁC CỦA BẠN:
   📝 Tên: ${senderName}
   ${getGenderText(senderGender)}
   🏠 Từ nhóm: ${(await api.getThreadInfo(threadID)).threadName || "Nhóm chat"}
   🔗 Facebook: ${senderProfile}

👤 THÔNG TIN CỦA BẠN:
   📝 Tên: ${partnerName}
   ${getGenderText(partnerGender)}
   🔗 Facebook: ${partnerProfile}

💌 Hãy nhấn vào link Facebook để kết bạn và trò chuyện nhé!

⭐ Chúc hai bạn có những khoảnh khắc vui vẻ bên nhau! ⭐
`;

        // Gửi tin nhắn cho người yêu cầu ghép đôi
        api.sendMessage(successMessage, threadID, messageID);
        
        // Gửi tin nhắn riêng cho đối tác được ghép đôi
        setTimeout(() => {
            api.sendMessage(partnerMessage, randomMember.threadID);
        }, 2000);
        
        // Lưu log ghép đôi
        const logPath = __dirname + "/cache/ghepdoi_log.json";
        let logData = {};
        
        if (fs.existsSync(logPath)) {
            logData = JSON.parse(fs.readFileSync(logPath));
        }
        
        const timestamp = new Date().toLocaleString("vi-VN");
        const logEntry = {
            timestamp,
            user1: { id: senderID, name: senderName, thread: threadID },
            user2: { id: randomMember.userID, name: partnerName, thread: randomMember.threadID }
        };
        
        if (!logData.matches) logData.matches = [];
        logData.matches.push(logEntry);
        
        // Giữ lại 100 lần ghép đôi gần nhất
        if (logData.matches.length > 100) {
            logData.matches = logData.matches.slice(-100);
        }
        
        fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
        
    } catch (error) {
        console.log("Lỗi ghép đôi:", error);
        return api.sendMessage(`❌ Có lỗi xảy ra: ${error.message}`, threadID, messageID);
    }
};
