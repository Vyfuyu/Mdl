
module.exports.config = {
	name: "leaveNoti",
	eventType: ["log:unsubscribe"],
	version: "1.0.0",
	credits: "Kaori Waguri",
	description: "Thông báo bot hoặc người rời khỏi nhóm với Canvas",
	dependencies: {
		"fs-extra": "",
		"canvas": "",
		"axios": ""
	}
};

module.exports.run = async function({ api, event, Users, Threads }) {
	if (event.logMessageData.leftParticipantFbId == api.getCurrentUserID()) return;
	
	const { createReadStream, existsSync, mkdirSync, writeFileSync } = global.nodemodule["fs-extra"];
	const { join } = global.nodemodule["path"];
	const Canvas = require("canvas");
	const axios = require("axios");
	const { threadID } = event;
	
	try {
		const data = global.data.threadData.get(parseInt(threadID)) || (await Threads.getData(threadID)).data;
		const name = global.data.userName.get(event.logMessageData.leftParticipantFbId) || await Users.getNameUser(event.logMessageData.leftParticipantFbId);
		const type = (event.author == event.logMessageData.leftParticipantFbId) ? "tự rời" : "bị kick";
		const uid = event.logMessageData.leftParticipantFbId;
		
		const cachePath = join(__dirname, "cache");
		const leavePath = join(cachePath, "leaveCanvas");
		
		if (!existsSync(cachePath)) mkdirSync(cachePath, { recursive: true });
		if (!existsSync(leavePath)) mkdirSync(leavePath, { recursive: true });

		let { threadName, participantIDs } = await api.getThreadInfo(threadID);

		// Tạo Canvas cho goodbye image
		const canvas = Canvas.createCanvas(1024, 500);
		const ctx = canvas.getContext('2d');

		// Background gradient (darker theme for goodbye)
		const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
		gradient.addColorStop(0, '#434343');
		gradient.addColorStop(1, '#000000');
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

		// Goodbye text background
		ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
		ctx.fillRect(0, 50, canvas.width, 100);

		// Goodbye text
		ctx.font = 'bold 48px Arial';
		ctx.fillStyle = '#ff6b6b';
		ctx.textAlign = 'center';
		ctx.fillText('GOODBYE', canvas.width / 2, 110);

		// Member info background
		ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
		ctx.fillRect(50, 200, canvas.width - 100, 250);

		// Avatar cho user rời
		try {
			const avatarResponse = await axios.get(`https://graph.facebook.com/${uid}/picture?height=150&width=150&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: 'arraybuffer' });
			const avatarBuffer = Buffer.from(avatarResponse.data, 'binary');
			const avatar = await Canvas.loadImage(avatarBuffer);
			
			// Draw avatar circle (grayscale effect)
			ctx.save();
			ctx.beginPath();
			ctx.arc(canvas.width / 2, 300, 60, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.clip();
			ctx.filter = 'grayscale(100%)';
			ctx.drawImage(avatar, canvas.width / 2 - 60, 240, 120, 120);
			ctx.filter = 'none';
			ctx.restore();

			// Avatar border
			ctx.beginPath();
			ctx.arc(canvas.width / 2, 300, 62, 0, Math.PI * 2, true);
			ctx.lineWidth = 4;
			ctx.strokeStyle = '#ff6b6b';
			ctx.stroke();
		} catch (e) {
			// Default avatar if failed
			ctx.fillStyle = '#ff6b6b';
			ctx.beginPath();
			ctx.arc(canvas.width / 2, 300, 60, 0, Math.PI * 2, true);
			ctx.fill();
			
			ctx.font = 'bold 48px Arial';
			ctx.fillStyle = '#ffffff';
			ctx.textAlign = 'center';
			ctx.fillText('👤', canvas.width / 2, 315);
		}

		// Member name
		ctx.font = 'bold 32px Arial';
		ctx.fillStyle = '#333333';
		ctx.textAlign = 'center';
		ctx.fillText(name, canvas.width / 2, 400);

		// Leave type and group info
		ctx.font = '20px Arial';
		ctx.fillStyle = '#666666';
		ctx.fillText(`đã ${type} khỏi ${threadName}`, canvas.width / 2, 430);
		ctx.fillText(`Còn lại ${participantIDs.length} thành viên`, canvas.width / 2, 450);

		let msg;
		if (typeof data.customLeave == "undefined") {
			msg = `😢 Tạm biệt {name}!\n👋 {name} đã {type} khỏi nhóm\n📱 Profile: https://www.facebook.com/profile.php?id={uid}\n💫 Credit: Kaori Waguri`;
		} else {
			msg = data.customLeave;
		}
		
		msg = msg.replace(/\{name}/g, name).replace(/\{type}/g, type).replace(/\{uid}/g, uid);

		// Save canvas
		const imagePath = join(leavePath, `goodbye_${Date.now()}.png`);
		const buffer = canvas.toBuffer('image/png');
		writeFileSync(imagePath, buffer);

		const formPush = {
			body: msg,
			attachment: createReadStream(imagePath)
		};

		return api.sendMessage(formPush, threadID, () => {
			// Cleanup
			try {
				require('fs').unlinkSync(imagePath);
			} catch (e) {}
		});

	} catch (e) {
		console.log("[LEAVE NOTI ERROR]", e);
		// Fallback message
		const name = global.data.userName.get(event.logMessageData.leftParticipantFbId) || "Thành viên";
		const type = (event.author == event.logMessageData.leftParticipantFbId) ? "tự rời" : "bị kick";
		return api.sendMessage(`😢 ${name} đã ${type} khỏi nhóm!\n💫 Credit: Kaori Waguri`, threadID);
	}
};
