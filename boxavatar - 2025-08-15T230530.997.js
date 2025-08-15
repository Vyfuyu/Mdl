
module.exports.config = {
    name: "boxavatar",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Assistant",
    description: "Tạo ảnh tổng hợp avatar tất cả thành viên trong box",
    commandCategory: "tạo ảnh",
    usages: "boxavatar [size] [title]",
    cooldowns: 10,
    dependencies: {
        "fs-extra": "",
        "axios": "",
        "canvas": "",
        "jimp": ""
    }
};

module.exports.run = async ({ event, api, args }) => {
    const fs = global.nodemodule["fs-extra"];
    const axios = global.nodemodule["axios"];
    const Canvas = global.nodemodule["canvas"];
    const jimp = global.nodemodule["jimp"];
    
    const { threadID, messageID } = event;
    
    function delay(ms) { 
        return new Promise(resolve => setTimeout(resolve, ms)); 
    }

    // Lấy thông tin nhóm
    try {
        const threadInfo = await api.getThreadInfo(threadID);
        const { participantIDs, adminIDs, name: groupName, userInfo } = threadInfo;
        
        // Lọc user còn hoạt động
        const activeUsers = userInfo.filter(user => user.gender !== undefined);
        const adminList = adminIDs.map(admin => admin.id);
        
        // Phân loại admin và member
        const admins = activeUsers.filter(user => adminList.includes(user.id));
        const members = activeUsers.filter(user => !adminList.includes(user.id));
        
        api.sendMessage(`🎨 Đang tạo ảnh box với ${activeUsers.length} thành viên (${admins.length} admin, ${members.length} member)...`, threadID, messageID);
        
        // Thiết lập kích thước
        const avatarSize = parseInt(args[0]) || 150;
        const title = args.slice(1).join(" ") || groupName || "Box Chat";
        
        // Tính toán layout
        const padding = 20;
        const nameHeight = 30;
        const sectionGap = 40;
        const headerHeight = 100;
        
        const itemsPerRow = Math.floor(1200 / (avatarSize + padding));
        const adminRows = Math.ceil(admins.length / itemsPerRow);
        const memberRows = Math.ceil(members.length / itemsPerRow);
        
        const canvasWidth = Math.max(1200, (avatarSize + padding) * Math.min(itemsPerRow, Math.max(admins.length, members.length)));
        const canvasHeight = headerHeight + 
                           (adminRows > 0 ? 60 + adminRows * (avatarSize + nameHeight + padding) + sectionGap : 0) +
                           (memberRows > 0 ? 60 + memberRows * (avatarSize + nameHeight + padding) : 0) + 
                           100;
        
        // Tạo canvas
        const canvas = Canvas.createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');
        
        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Download font nếu chưa có
        if (!fs.existsSync(__dirname + `/cache/Play-Bold.ttf`)) {
            try {
                const fontResponse = await axios.get('https://github.com/google/fonts/raw/main/ofl/play/Play-Bold.ttf', { responseType: 'arraybuffer' });
                fs.writeFileSync(__dirname + `/cache/Play-Bold.ttf`, Buffer.from(fontResponse.data));
            } catch (e) {
                console.log("Không thể tải font, sử dụng font mặc định");
            }
        }
        
        // Register font
        try {
            Canvas.registerFont(__dirname + `/cache/Play-Bold.ttf`, { family: "PlayBold" });
        } catch (e) {
            console.log("Sử dụng font mặc định");
        }
        
        // Header title
        ctx.font = 'bold 48px PlayBold, Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText(title, canvasWidth / 2, 60);
        ctx.shadowBlur = 0;
        
        let currentY = headerHeight;
        
        // Hàm tạo avatar tròn
        const createCircleAvatar = async (imageBuffer) => {
            const image = await jimp.read(imageBuffer);
            image.resize(avatarSize, avatarSize);
            image.circle();
            return await image.getBufferAsync("image/png");
        };
        
        // Hàm vẽ section
        const drawSection = async (users, sectionTitle, titleColor) => {
            if (users.length === 0) return currentY;
            
            // Section title
            ctx.font = 'bold 32px PlayBold, Arial';
            ctx.fillStyle = titleColor;
            ctx.textAlign = 'left';
            ctx.fillText(sectionTitle, 50, currentY + 40);
            currentY += 60;
            
            let x = padding;
            let y = currentY;
            let count = 0;
            
            for (const user of users) {
                try {
                    // Download avatar
                    const avatarResponse = await axios.get(
                        `https://graph.facebook.com/${user.id}/picture?height=300&width=300&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
                        { responseType: 'arraybuffer', timeout: 10000 }
                    );
                    
                    const circleAvatar = await createCircleAvatar(avatarResponse.data);
                    const avatarImage = await Canvas.loadImage(circleAvatar);
                    
                    // Vẽ avatar
                    ctx.save();
                    ctx.shadowColor = 'rgba(0,0,0,0.3)';
                    ctx.shadowBlur = 15;
                    ctx.drawImage(avatarImage, x, y, avatarSize, avatarSize);
                    ctx.restore();
                    
                    // Vẽ border cho admin
                    if (adminList.includes(user.id)) {
                        ctx.beginPath();
                        ctx.arc(x + avatarSize/2, y + avatarSize/2, avatarSize/2 + 3, 0, Math.PI * 2);
                        ctx.lineWidth = 6;
                        ctx.strokeStyle = '#ffd700';
                        ctx.stroke();
                    }
                    
                    // Vẽ tên
                    const userName = user.name || "Unknown";
                    const displayName = userName.length > 15 ? userName.substring(0, 15) + "..." : userName;
                    
                    ctx.font = 'bold 16px PlayBold, Arial';
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.shadowColor = 'rgba(0,0,0,0.7)';
                    ctx.shadowBlur = 5;
                    ctx.fillText(displayName, x + avatarSize/2, y + avatarSize + 20);
                    ctx.shadowBlur = 0;
                    
                    count++;
                    x += avatarSize + padding;
                    
                    // Xuống dòng
                    if (count % itemsPerRow === 0) {
                        x = padding;
                        y += avatarSize + nameHeight + padding;
                    }
                    
                    await delay(100); // Delay để tránh spam request
                    
                } catch (e) {
                    console.log(`Lỗi tải avatar ${user.id}:`, e.message);
                    
                    // Vẽ placeholder
                    ctx.fillStyle = '#cccccc';
                    ctx.beginPath();
                    ctx.arc(x + avatarSize/2, y + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.font = 'bold 24px Arial';
                    ctx.fillStyle = '#666666';
                    ctx.textAlign = 'center';
                    ctx.fillText('👤', x + avatarSize/2, y + avatarSize/2 + 8);
                    
                    // Tên
                    const userName = user.name || "Unknown";
                    const displayName = userName.length > 15 ? userName.substring(0, 15) + "..." : userName;
                    ctx.font = 'bold 16px Arial';
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(displayName, x + avatarSize/2, y + avatarSize + 20);
                    
                    count++;
                    x += avatarSize + padding;
                    
                    if (count % itemsPerRow === 0) {
                        x = padding;
                        y += avatarSize + nameHeight + padding;
                    }
                }
            }
            
            return y + avatarSize + nameHeight + sectionGap;
        };
        
        // Vẽ admin section
        if (admins.length > 0) {
            currentY = await drawSection(admins, `👑 QUẢN TRỊ VIÊN (${admins.length})`, '#ffd700');
        }
        
        // Vẽ member section  
        if (members.length > 0) {
            currentY = await drawSection(members, `👥 THÀNH VIÊN (${members.length})`, '#ffffff');
        }
        
        // Footer info
        ctx.font = 'bold 20px PlayBold, Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`Tổng cộng: ${activeUsers.length} thành viên`, canvasWidth / 2, canvasHeight - 30);
        
        // Lưu và gửi ảnh
        const imagePath = __dirname + `/cache/boxavatar_${Date.now()}.png`;
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(imagePath, buffer);
        
        return api.sendMessage({
            body: `✅ Đã tạo xong ảnh box!\n👑 Admin: ${admins.length}\n👥 Member: ${members.length}\n📊 Tổng: ${activeUsers.length} thành viên`,
            attachment: fs.createReadStream(imagePath)
        }, threadID, (error, info) => {
            if (error) {
                console.log('Lỗi gửi ảnh:', error);
                api.sendMessage(`❌ Lỗi gửi ảnh: ${error.message}`, threadID, messageID);
            }
            fs.unlinkSync(imagePath);
        }, messageID);
        
    } catch (error) {
        console.log('Lỗi tạo ảnh box:', error);
        return api.sendMessage(`❌ Lỗi: ${error.message}`, threadID, messageID);
    }
};
