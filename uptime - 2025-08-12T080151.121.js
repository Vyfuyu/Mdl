
const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs-extra');
const axios = require('axios');
const moment = require('moment-timezone');
const os = require('os');

module.exports.config = {
    name: "uptime",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Waguri",
    description: "Kiểm tra thời status bot lồn",
    commandCategory: "Hệ thống",
    usages: "",
    cooldowns: 5
};

module.exports.onLoad = async () => {
    if (!fs.existsSync(__dirname + '/cache')) {
        fs.mkdirSync(__dirname + '/cache', { recursive: true });
    }
    
    // Download font nếu chưa có
    if (!fs.existsSync(__dirname + '/cache/font.ttf')) {
        try {
            const fontResponse = await axios({
                url: 'https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Bold.ttf',
                method: 'GET',
                responseType: 'stream'
            });
            fontResponse.data.pipe(fs.createWriteStream(__dirname + '/cache/font.ttf'));
        } catch (e) {
            console.log('Không thể tải font, sử dụng font mặc định');
        }
    }
    
    // Download background nếu chưa có
    if (!fs.existsSync(__dirname + '/cache/bg_uptime.jpg')) {
        try {
            const bgResponse = await axios({
                url: 'https://i.imgur.com/YourBackgroundImage.jpg',
                method: 'GET',
                responseType: 'stream'
            });
            bgResponse.data.pipe(fs.createWriteStream(__dirname + '/cache/bg_uptime.jpg'));
        } catch (e) {
            console.log('Không thể tải background, sử dụng màu gradient');
        }
    }
};

async function getDependencyCount() {
    try {
        const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
        const depCount = Object.keys(packageJson.dependencies || {}).length;
        const devDepCount = Object.keys(packageJson.devDependencies || {}).length;
        return { depCount, devDepCount };
    } catch (error) {
        return { depCount: 0, devDepCount: 0 };
    }
}

function getStatusByPing(ping) {
    if (ping < 100) return { status: 'Xuất sắc', color: '#00ff00' };
    else if (ping < 300) return { status: 'Tốt', color: '#ffff00' };
    else if (ping < 600) return { status: 'Bình thường', color: '#ff8800' };
    else return { status: 'Chậm', color: '#ff0000' };
}

function getPrimaryIP() {
    const interfaces = os.networkInterfaces();
    for (let iface of Object.values(interfaces)) {
        for (let alias of iface) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '127.0.0.1';
}

module.exports.run = async ({ api, event, Users, Threads }) => {
    const timeStart = Date.now();
    
    try {
        // Lấy thông tin hệ thống
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const uptime = process.uptime();
        
        const { depCount, devDepCount } = await getDependencyCount();
        const name = await Users.getNameUser(event.senderID);
        const primaryIp = getPrimaryIP();
        const ping = Date.now() - event.timestamp;
        const botStatus = getStatusByPing(ping);
        
        const uptimeHours = Math.floor(uptime / 3600);
        const uptimeMinutes = Math.floor((uptime % 3600) / 60);
        const uptimeSeconds = Math.floor(uptime % 60);
        
        const threadInfo = await api.getThreadInfo(event.threadID);
        const threadName = threadInfo.threadName || 'Unnamed Group';
        
        // Tạo canvas
        const canvas = createCanvas(1200, 800);
        const ctx = canvas.getContext('2d');
        
        // Vẽ background gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(0.5, '#764ba2');
        gradient.addColorStop(1, '#f093fb');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Vẽ overlay để làm tối background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Vẽ header box
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(50, 50, canvas.width - 100, 100);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(50, 50, canvas.width - 100, 100);
        
        // Font setup
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        
        // Title
        ctx.font = 'bold 48px Arial';
        ctx.fillText('🤖 BOT STATUS MONITOR', canvas.width / 2, 110);
        
        // Main info box
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(50, 180, canvas.width - 100, 550);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.strokeRect(50, 180, canvas.width - 100, 550);
        
        // Left column info
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial';
        
        let y = 230;
        const lineHeight = 40;
        const leftX = 80;
        
        // Thông tin cơ bản
        ctx.fillStyle = '#ffd700';
        ctx.fillText('⏰ THỜI GIAN & TRẠNG THÁI', leftX, y);
        y += lineHeight + 10;
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.fillText(`📅 Hiện tại: ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY')}`, leftX, y);
        y += lineHeight;
        
        ctx.fillText(`⏱️ Uptime: ${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`, leftX, y);
        y += lineHeight;
        
        ctx.fillStyle = botStatus.color;
        ctx.fillText(`📶 Ping: ${ping}ms (${botStatus.status})`, leftX, y);
        y += lineHeight;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`🌐 IP: ${primaryIp}`, leftX, y);
        y += lineHeight + 20;
        
        // Thông tin hệ thống
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 28px Arial';
        ctx.fillText('💻 THÔNG TIN HỆ THỐNG', leftX, y);
        y += lineHeight + 10;
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.fillText(`🖥️ OS: ${os.type()} ${os.release()}`, leftX, y);
        y += lineHeight;
        
        ctx.fillText(`⚙️ CPU: ${os.cpus().length} cores - ${os.cpus()[0].model.substring(0, 30)}...`, leftX, y);
        y += lineHeight;
        
        ctx.fillText(`💾 RAM: ${(usedMemory / 1024 / 1024 / 1024).toFixed(2)}GB/${(totalMemory / 1024 / 1024 / 1024).toFixed(2)}GB`, leftX, y);
        y += lineHeight;
        
        ctx.fillText(`📦 Dependencies: ${depCount} packages`, leftX, y);
        y += lineHeight + 20;
        
        // Thông tin bot
        ctx.fillStyle = '#ff6b6b';
        ctx.font = 'bold 28px Arial';
        ctx.fillText('🤖 THÔNG TIN BOT', leftX, y);
        y += lineHeight + 10;
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.fillText(`👥 Tổng nhóm: ${global.data.allThreadID.length}`, leftX, y);
        y += lineHeight;
        
        ctx.fillText(`👤 Tổng user: ${global.data.allUserID.length}`, leftX, y);
        y += lineHeight;
        
        ctx.fillText(`🎯 Prefix: ${global.config.PREFIX}`, leftX, y);
        y += lineHeight;
        
        // Footer
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(50, 750, canvas.width - 100, 30);
        
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.fillText(`🔄 Yêu cầu bởi: ${name} | 📍 Nhóm: ${threadName}`, canvas.width / 2, 770);
        
        // Vẽ decorative elements
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.2})`;
            ctx.beginPath();
            ctx.arc(100 + i * 200, 100, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Save image
        const imagePath = __dirname + `/cache/uptime_${event.senderID}.png`;
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(imagePath, buffer);
        
        const message = `╭─────────────────╮
│    🤖 BOT STATUS    │
╰─────────────────╯

⏰ Uptime: ${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s
📶 Ping: ${ping}ms (${botStatus.status})
💻 RAM: ${(usedMemory / 1024 / 1024 / 1024).toFixed(2)}GB/${(totalMemory / 1024 / 1024 / 1024).toFixed(2)}GB
👥 Groups: ${global.data.allThreadID.length} | 👤 Users: ${global.data.allUserID.length}

✨ Bot đang hoạt động ổn định!`;
        
        return api.sendMessage({
            body: message,
            attachment: fs.createReadStream(imagePath)
        }, event.threadID, () => {
            fs.unlinkSync(imagePath);
        }, event.messageID);
        
    } catch (error) {
        console.error('Lỗi trong uptime command:', error);
        return api.sendMessage('❌ Đã xảy ra lỗi khi tạo thông tin uptime!', event.threadID, event.messageID);
    }
};
