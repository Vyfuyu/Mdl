
module.exports.config = {
    name: "boxavatar",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Kaori Waguri",
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

    // Hàm làm sạch text, loại bỏ ký tự đặc biệt
    function cleanText(text) {
        if (!text) return "Unknown";
        return text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu
            .replace(/[^\w\s]/g, '') // Loại bỏ ký tự đặc biệt
            .replace(/\s+/g, ' ') // Loại bỏ space thừa
            .trim();
    }

    // Lấy thông tin nhóm
    try {
        const threadInfo = await api.getThreadInfo(threadID);
        const { participantIDs, adminIDs, name: groupName, userInfo } = threadInfo;
        
        // Lấy tất cả thành viên, không lọc
        const allUsers = userInfo || [];
        const adminList = adminIDs.map(admin => admin.id);
        
        // Phân loại admin và member
        const admins = allUsers.filter(user => adminList.includes(user.id));
        const members = allUsers.filter(user => !adminList.includes(user.id));
        
        const totalUsers = allUsers.length;
        
        api.sendMessage(`Dang tao anh box voi ${totalUsers} thanh vien (${admins.length} admin, ${members.length} member)...`, threadID, messageID);
        
        // Thiết lập kích thước
        const avatarSize = parseInt(args[0]) || 150;
        const customTitle = args.slice(1).join(" ");
        const title = customTitle ? cleanText(customTitle) : cleanText(groupName) || "Box Chat";
        
        // Tính toán layout
        const padding = 20;
        const nameHeight = 30;
        const sectionGap = 40;
        const headerHeight = 120;
        
        const itemsPerRow = Math.floor(1200 / (avatarSize + padding));
        const adminRows = Math.ceil(admins.length / itemsPerRow);
        const memberRows = Math.ceil(members.length / itemsPerRow);
        
        const canvasWidth = Math.max(1200, (avatarSize + padding) * Math.min(itemsPerRow, Math.max(admins.length, members.length)));
        const canvasHeight = headerHeight + 
                           (adminRows > 0 ? 80 + adminRows * (avatarSize + nameHeight + padding) + sectionGap : 0) +
                           (memberRows > 0 ? 80 + memberRows * (avatarSize + nameHeight + padding) : 0) + 
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
                console.log("Khong the tai font, su dung font mac dinh");
            }
        }
        
        // Register font
        try {
            Canvas.registerFont(__dirname + `/cache/Play-Bold.ttf`, { family: "PlayBold" });
        } catch (e) {
            console.log("Su dung font mac dinh");
        }
        
        // Header - Tên nhóm
        ctx.font = 'bold 42px PlayBold, Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText(title, canvasWidth / 2, 50);
        
        // Thông tin nhóm
        ctx.font = 'bold 24px PlayBold, Arial';
        ctx.fillText(`Tong ${totalUsers} thanh vien`, canvasWidth / 2, 85);
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
            ctx.font = 'bold 28px PlayBold, Arial';
            ctx.fillStyle = titleColor;
            ctx.textAlign = 'left';
            ctx.fillText(sectionTitle, 50, currentY + 40);
            currentY += 80;
            
            let x = padding;
            let y = currentY;
            let count = 0;
            
            for (const user of users) {
                try {
                    // Download avatar
                    const avatarResponse = await axios.get(
                        `https://graph.facebook.com/${user.id}/picture?height=300&width=300&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
                        { responseType: 'arraybuffer', timeout: 15000 }
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
                    
                    // Vẽ tên - làm sạch text
                    const userName = cleanText(user.name || "Unknown");
                    const displayName = userName.length > 15 ? userName.substring(0, 15) + "..." : userName;
                    
                    ctx.font = 'bold 14px PlayBold, Arial';
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
                    
                    await delay(150); // Delay để tránh spam request
                    
                } catch (e) {
                    console.log(`Loi tai avatar ${user.id}:`, e.message);
                    
                    // Vẽ placeholder
                    ctx.fillStyle = '#cccccc';
                    ctx.beginPath();
                    ctx.arc(x + avatarSize/2, y + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.font = 'bold 20px Arial';
                    ctx.fillStyle = '#666666';
                    ctx.textAlign = 'center';
                    ctx.fillText('User', x + avatarSize/2, y + avatarSize/2 + 5);
                    
                    // Tên
                    const userName = cleanText(user.name || "Unknown");
                    const displayName = userName.length > 15 ? userName.substring(0, 15) + "..." : userName;
                    ctx.font = 'bold 14px Arial';
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
            currentY = await drawSection(admins, `QUAN TRI VIEN (${admins.length})`, '#ffd700');
        }
        
        // Vẽ member section  
        if (members.length > 0) {
            currentY = await drawSection(members, `THANH VIEN (${members.length})`, '#ffffff');
        }
        
        // Footer info
        ctx.font = 'bold 18px PlayBold, Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`Box: ${cleanText(groupName)} - ${totalUsers} thanh vien`, canvasWidth / 2, canvasHeight - 30);
        
        // Lưu và gửi ảnh
        const imagePath = __dirname + `/cache/boxavatar_${Date.now()}.png`;
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(imagePath, buffer);
        
        return api.sendMessage({
            body: `Da tao xong anh box!\nAdmin: ${admins.length}\nMember: ${members.length}\nTong: ${totalUsers} thanh vien`,
            attachment: fs.createReadStream(imagePath)
        }, threadID, (error, info) => {
            if (error) {
                console.log('Loi gui anh:', error);
                api.sendMessage(`Loi gui anh: ${error.message}`, threadID, messageID);
            }
            fs.unlinkSync(imagePath);
        }, messageID);
        
    } catch (error) {
        console.log('Loi tao anh box:', error);
        return api.sendMessage(`Loi: ${error.message}`, threadID, messageID);
    }
};
