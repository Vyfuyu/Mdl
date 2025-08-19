module.exports.config = {
    name: "joinLeaveCanvas",
    eventType: ["log:subscribe", "log:unsubscribe"],
    version: "1.0.0",
    credits: "Kaori Waguri",
    description: "Canvas thông báo join/leave với background image đẹp",
    dependencies: {
        "canvas": "",
        "axios": "",
        "fs-extra": ""
    }
};

module.exports.run = async function({ api, event, Users, Threads }) {
    const Canvas = require('canvas');
    const axios = require('axios');
    const fs = require('fs-extra');
    const path = require('path');
    
    const { threadID, logMessageType, logMessageData } = event;
    
    try {
        // Lấy thông tin thread
        const threadInfo = await api.getThreadInfo(threadID);
        const { threadName, participantIDs } = threadInfo;
        
        // Xử lý join
        if (logMessageType === "log:subscribe") {
            // Nếu bot join
            if (logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
                return;
            }
            
            for (const participant of logMessageData.addedParticipants) {
                await createJoinCanvas(participant, threadName, participantIDs.length, threadID, api);
            }
        }
        
        // Xử lý leave
        if (logMessageType === "log:unsubscribe") {
            if (logMessageData.leftParticipantFbId == api.getCurrentUserID()) return;
            
            const userName = await Users.getNameUser(logMessageData.leftParticipantFbId);
            const leaveType = (event.author == logMessageData.leftParticipantFbId) ? "đã rời khỏi nhóm" : "đã bị kick khỏi nhóm";
            
            await createLeaveCanvas(userName, leaveType, threadName, threadID, api);
        }
        
    } catch (error) {
        console.log("[JOIN LEAVE CANVAS ERROR]", error);
    }
};

async function createJoinCanvas(participant, threadName, memberCount, threadID, api) {
    try {
        const { userFbId, fullName } = participant;
        
        // Làm sạch tên người dùng
        const cleanName = cleanText(fullName);
        const cleanThreadName = cleanText(threadName);
        
        // Tạo canvas
        const canvas = Canvas.createCanvas(1200, 600);
        const ctx = canvas.getContext('2d');
        
        // Background image
        const backgroundUrl = 'https://i.postimg.cc/59GPNCGS/anh-bia-facebook-chill-11-2025-08-18-T161237-432.jpg';
        let background;
        try {
            const bgResponse = await axios.get(backgroundUrl, { responseType: 'arraybuffer' });
            background = await Canvas.loadImage(Buffer.from(bgResponse.data));
        } catch (e) {
            // Tạo background mặc định nếu không load được
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(0, 0, 1200, 600);
        }
        
        if (background) {
            ctx.drawImage(background, 0, 0, 1200, 600);
        }
        
        // Overlay trong suốt
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, 1200, 600);
        
        // Avatar người dùng
        try {
            const avatarResponse = await axios.get(`https://graph.facebook.com/${userFbId}/picture?width=300&height=300&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, 
                { responseType: 'arraybuffer' });
            const avatarBuffer = Buffer.from(avatarResponse.data);
            const avatar = await Canvas.loadImage(avatarBuffer);
            
            // Vẽ avatar tròn bên trái
            const avatarSize = 200;
            const avatarX = 100;
            const avatarY = 200;
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
            ctx.restore();
            
            // Viền avatar
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
            ctx.stroke();
            
        } catch (e) {
            // Avatar mặc định nếu không load được
            ctx.fillStyle = '#95a5a6';
            ctx.beginPath();
            ctx.arc(200, 300, 100, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Text bên phải
        const textX = 400;
        
        // Welcome text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('WELCOME', textX, 180);
        
        // Tên người dùng
        ctx.fillStyle = '#3498db';
        ctx.font = 'bold 50px Arial';
        const maxWidth = 700;
        const fontSize = Math.min(50, maxWidth / (cleanName.length * 0.6));
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillText(cleanName, textX, 250);
        
        // To group
        ctx.fillStyle = '#ffffff';
        ctx.font = '35px Arial';
        ctx.fillText('to group', textX, 300);
        
        // Tên nhóm
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 40px Arial';
        const groupFontSize = Math.min(40, maxWidth / (cleanThreadName.length * 0.5));
        ctx.font = `bold ${groupFontSize}px Arial`;
        ctx.fillText(cleanThreadName, textX, 350);
        
        // Số thứ tự thành viên
        ctx.fillStyle = '#f39c12';
        ctx.font = 'bold 35px Arial';
        ctx.fillText(`Bạn là thành viên thứ ${memberCount}`, textX, 420);
        
        // Decorative elements
        // Particles
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * 1200;
            const y = Math.random() * 600;
            const size = Math.random() * 4 + 2;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Credit
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '20px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('Credit: Kaori Waguri', 1180, 580);
        
        // Lưu và gửi
        const cachePath = path.join(__dirname, 'cache');
        if (!fs.existsSync(cachePath)) {
            fs.mkdirSync(cachePath, { recursive: true });
        }
        
        const imagePath = path.join(cachePath, `join_${Date.now()}.png`);
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(imagePath, buffer);
        
        const message = {
            body: `🎉 Chào mừng ${cleanName} đã tham gia nhóm!\n🌟 Bạn là thành viên thứ ${memberCount} của nhóm`,
            attachment: fs.createReadStream(imagePath)
        };
        
        await api.sendMessage(message, threadID);
        
        // Xóa file cache sau 10 giây
        setTimeout(() => {
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }, 10000);
        
    } catch (error) {
        console.log("[CREATE JOIN CANVAS ERROR]", error);
    }
}

async function createLeaveCanvas(userName, leaveType, threadName, threadID, api) {
    try {
        const cleanName = cleanText(userName);
        const cleanThreadName = cleanText(threadName);
        
        // Tạo canvas cho leave
        const canvas = Canvas.createCanvas(1200, 600);
        const ctx = canvas.getContext('2d');
        
        // Background
        const backgroundUrl = 'https://i.postimg.cc/59GPNCGS/anh-bia-facebook-chill-11-2025-08-18-T161237-432.jpg';
        try {
            const bgResponse = await axios.get(backgroundUrl, { responseType: 'arraybuffer' });
            const background = await Canvas.loadImage(Buffer.from(bgResponse.data));
            ctx.drawImage(background, 0, 0, 1200, 600);
        } catch (e) {
            ctx.fillStyle = '#34495e';
            ctx.fillRect(0, 0, 1200, 600);
        }
        
        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, 1200, 600);
        
        // Leave icon
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('👋', 600, 200);
        
        // Goodbye text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 50px Arial';
        ctx.fillText('GOODBYE', 600, 280);
        
        // Tên người rời
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 45px Arial';
        const maxWidth = 800;
        const fontSize = Math.min(45, maxWidth / (cleanName.length * 0.6));
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillText(cleanName, 600, 340);
        
        // Leave type
        ctx.fillStyle = '#bdc3c7';
        ctx.font = '35px Arial';
        ctx.fillText(leaveType, 600, 390);
        
        // Từ nhóm
        ctx.fillStyle = '#ffffff';
        ctx.font = '30px Arial';
        ctx.fillText(`từ nhóm ${cleanThreadName}`, 600, 440);
        
        // Credit
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '20px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('Credit: Kaori Waguri', 1180, 580);
        
        // Lưu và gửi
        const cachePath = path.join(__dirname, 'cache');
        if (!fs.existsSync(cachePath)) {
            fs.mkdirSync(cachePath, { recursive: true });
        }
        
        const imagePath = path.join(cachePath, `leave_${Date.now()}.png`);
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(imagePath, buffer);
        
        const message = {
            body: `😢 ${cleanName} ${leaveType}`,
            attachment: fs.createReadStream(imagePath)
        };
        
        await api.sendMessage(message, threadID);
        
        // Xóa file cache sau 10 giây
        setTimeout(() => {
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }, 10000);
        
    } catch (error) {
        console.log("[CREATE LEAVE CANVAS ERROR]", error);
    }
}

function cleanText(text) {
    if (!text) return '';
    // Loại bỏ các ký tự đặc biệt có thể gây lỗi
    return text.replace(/[^\w\s\u00C0-\u1EF9]/gi, '').trim() || 'Unknown';
}
