
module.exports.config = {
	name: "joinNoti",
	eventType: ["log:subscribe"],
	version: "1.0.0",
	credits: "Kaori Waguri",
	description: "Thông báo bot hoặc người vào nhóm với Canvas",
	dependencies: {
		"fs-extra": "",
		"canvas": "",
		"axios": ""
	}
};

module.exports.run = async function({ api, event, Users, Threads }) {
	const { join } = require("path");
	const { threadID } = event;
	const { PREFIX } = global.config;
	const { createReadStream, existsSync, mkdirSync, writeFileSync } = global.nodemodule["fs-extra"];
	const Canvas = require("canvas");
	const axios = require("axios");

	// Nếu bot được thêm vào
	if (event.logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
		api.changeNickname(`[ ${PREFIX} ] • ${global.config.BOTNAME || "Mirai Bot"}`, threadID, api.getCurrentUserID());
		return api.sendMessage(
			`✨ KẾT NỐI THÀNH CÔNG ✨\n🎉 Chào mừng đến với ${global.config.BOTNAME || "Mirai Bot"}!\n💫 Cảm ơn bạn đã thêm bot vào nhóm\n📝 Credit: Kaori Waguri`,
			threadID
		);
	}

	// Nếu là người khác được thêm
	try {
		let { threadName, participantIDs } = await api.getThreadInfo(threadID);
		const threadData = global.data.threadData.get(parseInt(threadID)) || {};
		const cachePath = join(__dirname, "cache");
		const joinPath = join(cachePath, "joinCanvas");
		
		if (!existsSync(cachePath)) mkdirSync(cachePath, { recursive: true });
		if (!existsSync(joinPath)) mkdirSync(joinPath, { recursive: true });

		let mentions = [], nameArray = [], memLength = [], i = 0;

		for (const user of event.logMessageData.addedParticipants) {
			const userName = user.fullName;
			const userID = user.userFbId;
			nameArray.push(userName);
			mentions.push({ tag: userName, id: userID });
			memLength.push(participantIDs.length - i++);

			if (!global.data.allUserID.includes(userID)) {
				await Users.createData(userID, { name: userName, data: {} });
				global.data.userName.set(userID, userName);
				global.data.allUserID.push(userID);
			}
		}
		memLength.sort((a, b) => a - b);

		// Tạo Canvas cho welcome image
		const canvas = Canvas.createCanvas(1024, 500);
		const ctx = canvas.getContext('2d');

		// Background gradient
		const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
		gradient.addColorStop(0, '#667eea');
		gradient.addColorStop(1, '#764ba2');
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Overlay pattern
		ctx.globalAlpha = 0.1;
		for (let i = 0; i < canvas.width; i += 50) {
			for (let j = 0; j < canvas.height; j += 50) {
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(i, j, 25, 25);
			}
		}
		ctx.globalAlpha = 1;

		// Welcome text background
		ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
		ctx.fillRect(0, 50, canvas.width, 100);

		// Welcome text
		ctx.font = 'bold 48px Arial';
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = 'center';
		ctx.fillText('WELCOME', canvas.width / 2, 110);

		// Member info background
		ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
		ctx.fillRect(50, 200, canvas.width - 100, 250);

		// Avatar cho user đầu tiên
		if (event.logMessageData.addedParticipants[0]) {
			const userID = event.logMessageData.addedParticipants[0].userFbId;
			try {
				const avatarResponse = await axios.get(`https://graph.facebook.com/${userID}/picture?height=150&width=150&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: 'arraybuffer' });
				const avatarBuffer = Buffer.from(avatarResponse.data, 'binary');
				const avatar = await Canvas.loadImage(avatarBuffer);
				
				// Draw avatar circle
				ctx.save();
				ctx.beginPath();
				ctx.arc(canvas.width / 2, 300, 60, 0, Math.PI * 2, true);
				ctx.closePath();
				ctx.clip();
				ctx.drawImage(avatar, canvas.width / 2 - 60, 240, 120, 120);
				ctx.restore();

				// Avatar border
				ctx.beginPath();
				ctx.arc(canvas.width / 2, 300, 62, 0, Math.PI * 2, true);
				ctx.lineWidth = 4;
				ctx.strokeStyle = '#667eea';
				ctx.stroke();
			} catch (e) {
				// Default avatar if failed
				ctx.fillStyle = '#667eea';
				ctx.beginPath();
				ctx.arc(canvas.width / 2, 300, 60, 0, Math.PI * 2, true);
				ctx.fill();
				
				ctx.font = 'bold 48px Arial';
				ctx.fillStyle = '#ffffff';
				ctx.textAlign = 'center';
				ctx.fillText('👤', canvas.width / 2, 315);
			}
		}

		// Member name
		ctx.font = 'bold 32px Arial';
		ctx.fillStyle = '#333333';
		ctx.textAlign = 'center';
		const displayName = nameArray[0] || 'New Member';
		ctx.fillText(displayName, canvas.width / 2, 400);

		// Group info
		ctx.font = '20px Arial';
		ctx.fillStyle = '#666666';
		ctx.fillText(`${threadName}`, canvas.width / 2, 430);
		ctx.fillText(`Thành viên thứ ${memLength[0] || participantIDs.length}`, canvas.width / 2, 450);

		const moment = require("moment-timezone");
		const currentTime = moment.tz("Asia/Ho_Chi_Minh");
		const hour = parseInt(currentTime.format("HH"));
		const bok = currentTime.format("DD/MM/YYYY");

		let get = "Buổi Sáng";
		if (hour >= 11) get = "Buổi Trưa";
		if (hour >= 14) get = "Buổi Chiều";
		if (hour >= 19) get = "Buổi Tối";

		const getData = await Users.getData(event.author);
		const nameAuthor = getData?.name || "link join";

		let msg = (typeof threadData.customJoin == "undefined") ?
			`🎉 Chúc ${get} ${nameArray.join(', ')}!\n🌸 Welcome to ${threadName}!\n👥 Bạn là thành viên thứ ${memLength.join(', ')} của nhóm\n📅 Ngày vào: ${bok}\n👤 Thêm bởi: ${nameAuthor}\n💫 Credit: Kaori Waguri`
			: threadData.customJoin;

		msg = msg
			.replace(/\{name}/g, nameArray.join(', '))
			.replace(/\{type}/g, (memLength.length > 1) ? 'Các Bạn' : 'Bạn')
			.replace(/\{soThanhVien}/g, memLength.join(', '))
			.replace(/\{threadName}/g, threadName)
			.replace(/\{get}/g, get)
			.replace(/\{author}/g, nameAuthor)
			.replace(/\{bok}/g, bok);

		// Save canvas
		const imagePath = join(joinPath, `welcome_${Date.now()}.png`);
		const buffer = canvas.toBuffer('image/png');
		writeFileSync(imagePath, buffer);

		const formPush = {
			body: msg,
			attachment: createReadStream(imagePath),
			mentions
		};

		return api.sendMessage(formPush, threadID, () => {
			// Cleanup
			try {
				require('fs').unlinkSync(imagePath);
			} catch (e) {}
		});

	} catch (e) {
		console.log("[JOIN NOTI ERROR]", e);
		// Fallback message
		return api.sendMessage(`🎉 Chào mừng ${nameArray.join(', ')} đã tham gia nhóm!\n💫 Credit: Kaori Waguri`, threadID);
	}
};
