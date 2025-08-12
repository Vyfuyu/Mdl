
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Credit protection - đừng thay đổi
const originalCredit = "waguri kaori";
const creditCheck = () => {
    const currentCredit = "waguri kaori";
    if (currentCredit !== originalCredit) {
        return false;
    }
    return true;
};

module.exports.config = {
    name: "hoctienganh",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "waguri kaori",
    description: "Học tiếng Anh với AI Cohere - tạo câu hỏi 100% từ AI và chấm điểm",
    commandCategory: "Giáo dục",
    usages: "[batdau/diemso/doido/huongdan]",
    cooldowns: 5,
    dependencies: {
        "axios": ""
    }
};

const COHERE_API_KEY = "uFkvoBbg6ljezhNXXFhM906qMrtVLLaHnLjBDGWt";
const COHERE_URL = "https://api.cohere.ai/v1/generate";

module.exports.run = async function({ api, event, args, Users }) {
    // Kiểm tra credit
    if (!creditCheck()) {
        return api.sendMessage("❌ Module đã bị thay đổi credit không được phép!", event.threadID);
    }

    const cacheDir = path.join(__dirname, 'cache', 'hoctienganh');
    const userDataFile = path.join(cacheDir, `${event.senderID}.json`);
    
    // Tạo thư mục cache nếu chưa có
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Khởi tạo dữ liệu user
    let userData = {
        currentQuestion: null,
        currentMessageID: null,
        score: 0,
        totalQuestions: 0,
        difficulty: "hard",
        lastQuestions: []
    };

    if (fs.existsSync(userDataFile)) {
        userData = JSON.parse(fs.readFileSync(userDataFile, 'utf8'));
    }

    const senderInfo = await Users.getInfo(event.senderID);
    const userName = senderInfo.name || "Bạn";

    if (!args[0]) {
        return api.sendMessage("📚 HỌC TIẾNG ANH VỚI AI COHERE\n" +
            "━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "🎯 CÁC LỆNH CHÍNH:\n" +
            "• hoctienganh batdau - Bắt đầu câu hỏi mới từ AI\n" +
            "• Reply tin nhắn bot để trả lời câu hỏi\n" +
            "• hoctienganh diemso - Xem điểm số của bạn\n" +
            "• hoctienganh doido - Thay đổi độ khó\n" +
            "• hoctienganh huongdan - Hướng dẫn chi tiết\n\n" +
            "🤖 TÍNH NĂNG:\n" +
            "- 100% câu hỏi được tạo bởi AI Cohere\n" +
            "- Không trùng lặp câu hỏi cũ\n" +
            "- Chấm điểm thông minh bằng AI\n" +
            "- Reply để trả lời nhanh chóng\n" +
            "- Phản hồi bằng react ✅ hoặc ❌\n\n" +
            `📊 Điểm hiện tại: ${userData.score}/${userData.totalQuestions}\n` +
            `🎚️ Độ khó: ${getDifficultyText(userData.difficulty)}\n\n` +
            "━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "💫 Credit: waguri kaori", event.threadID);
    }

    switch (args[0].toLowerCase()) {
        case "batdau":
            try {
                const loadingMsg = await api.sendMessage("🤖 Đang tạo câu hỏi tiếng Anh từ AI Cohere...\n⏳ Vui lòng đợi...", event.threadID);
                
                const question = await generateQuestionFromCohere(userData.difficulty, userData.lastQuestions);
                
                if (!question) {
                    return api.editMessage("❌ Không thể tạo câu hỏi từ AI. Vui lòng thử lại!", loadingMsg.messageID, event.threadID);
                }

                userData.currentQuestion = question;
                userData.lastQuestions.push(question.toLowerCase());
                
                // Giữ chỉ 15 câu hỏi gần nhất để tránh trùng lặp
                if (userData.lastQuestions.length > 15) {
                    userData.lastQuestions.shift();
                }

                fs.writeFileSync(userDataFile, JSON.stringify(userData, null, 2));

                const questionMsg = await api.editMessage(
                    `📝 CÂU HỎI TIẾNG ANH TỪ AI\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `👤 ${userName}\n` +
                    `🎚️ Độ khó: ${getDifficultyText(userData.difficulty)}\n` +
                    `🤖 Tạo bởi: AI Cohere\n\n` +
                    `❓ ${question}\n\n` +
                    `💬 CÁCH TRẢ LỜI:\n` +
                    `• Reply tin nhắn này với câu trả lời\n` +
                    `• Bot sẽ chấm điểm và phản hồi\n` +
                    `• ✅ = Đúng | ❌ = Sai\n\n` +
                    `📊 Điểm: ${userData.score}/${userData.totalQuestions}\n\n` +
                    `💫 Credit: waguri kaori`, 
                    loadingMsg.messageID, event.threadID
                );

                // Lưu messageID để xử lý reply
                userData.currentMessageID = questionMsg.messageID;
                fs.writeFileSync(userDataFile, JSON.stringify(userData, null, 2));

            } catch (error) {
                console.error("Lỗi tạo câu hỏi:", error);
                api.sendMessage("❌ Lỗi kết nối AI Cohere. Vui lòng thử lại sau!\n\n💫 Credit: waguri kaori", event.threadID);
            }
            break;

        case "diemso":
            const accuracy = userData.totalQuestions > 0 ? Math.round((userData.score/userData.totalQuestions)*100) : 0;
            let level = "Mới bắt đầu";
            
            if (accuracy >= 90) level = "Xuất sắc 🏆";
            else if (accuracy >= 80) level = "Giỏi 🥇";
            else if (accuracy >= 70) level = "Khá 🥈";
            else if (accuracy >= 60) level = "Trung bình 🥉";
            else if (accuracy >= 50) level = "Yếu ⚠️";

            api.sendMessage(`📊 BẢNG ĐIỂM TIẾNG ANH\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `👤 ${userName}\n\n` +
                `✅ Câu đúng: ${userData.score}\n` +
                `📝 Tổng câu: ${userData.totalQuestions}\n` +
                `📈 Tỷ lệ đúng: ${accuracy}%\n` +
                `🎯 Trình độ: ${level}\n` +
                `🎚️ Độ khó hiện tại: ${getDifficultyText(userData.difficulty)}\n` +
                `🤖 Powered by: AI Cohere\n\n` +
                `💡 GỢI Ý NÂNG CAO:\n` +
                `${accuracy < 70 ? "• Luyện tập thêm ở độ khó dễ hơn\n• Đọc thêm tài liệu tiếng Anh" : 
                  "• Thử thách ở độ khó cao hơn\n• Luyện tập giao tiếp thực tế"}\n\n` +
                `🚀 Tiếp tục: hoctienganh batdau\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💫 Credit: waguri kaori`, event.threadID);
            break;

        case "doido":
            const difficulties = ["easy", "medium", "hard"];
            const currentIndex = difficulties.indexOf(userData.difficulty);
            const nextIndex = (currentIndex + 1) % difficulties.length;
            userData.difficulty = difficulties[nextIndex];
            
            fs.writeFileSync(userDataFile, JSON.stringify(userData, null, 2));

            api.sendMessage(`🎚️ ĐỘ KHÓ ĐÃ THAY ĐỔI\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📊 Độ khó mới: ${getDifficultyText(userData.difficulty)}\n\n` +
                `💡 MÔ TẢ:\n` +
                `${getDifficultyDescription(userData.difficulty)}\n\n` +
                `🤖 Tất cả câu hỏi được tạo 100% bởi AI Cohere\n\n` +
                `🚀 Bắt đầu câu hỏi mới: hoctienganh batdau\n\n` +
                `💫 Credit: waguri kaori`, event.threadID);
            break;

        case "huongdan":
            api.sendMessage(`📚 HƯỚNG DẪN HỌC TIẾNG ANH VỚI AI\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `🎯 CÁCH SỬ DỤNG:\n` +
                `1️⃣ hoctienganh batdau - Nhận câu hỏi từ AI\n` +
                `2️⃣ Reply tin nhắn bot với đáp án\n` +
                `3️⃣ Nhận phản hồi ✅❌ và điểm số\n` +
                `4️⃣ Lặp lại để nâng cao trình độ\n\n` +
                `🤖 ĐẶC BIỆT:\n` +
                `• 100% câu hỏi từ AI Cohere\n` +
                `• Không sử dụng câu hỏi có sẵn\n` +
                `• AI tự động tạo câu hỏi mới\n` +
                `• Chấm điểm thông minh bằng AI\n\n` +
                `🎚️ ĐỘ KHÓ:\n` +
                `• Dễ: Giao tiếp cơ bản, từ vựng đơn giản\n` +
                `• Trung bình: Giao tiếp thường ngày\n` +
                `• Khó: Giao tiếp phức tạp, academic\n\n` +
                `📊 CHẤM ĐIỂM:\n` +
                `• 7-10 điểm: ✅ Đạt (tính vào thống kê)\n` +
                `• 5-6 điểm: ⚠️ Tạm được\n` +
                `• 0-4 điểm: ❌ Chưa đạt\n\n` +
                `💡 MẸO HAY:\n` +
                `• Trả lời bằng câu hoàn chỉnh\n` +
                `• Sử dụng từ vựng phù hợp ngữ cảnh\n` +
                `• Không cần 100% chính xác ngữ pháp\n` +
                `• Tập trung vào ý nghĩa và giao tiếp\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💫 Credit: waguri kaori`, event.threadID);
            break;

        default:
            api.sendMessage("❌ Lệnh không hợp lệ!\nSử dụng: hoctienganh để xem hướng dẫn\n\n💫 Credit: waguri kaori", event.threadID);
    }
};

// Tạo câu hỏi 100% bằng Cohere API - không dùng câu có sẵn
async function generateQuestionFromCohere(difficulty, previousQuestions) {
    const difficultyPrompts = {
        easy: "You are an English conversation teacher creating practice questions for beginners. Create ONE unique English conversation question that focuses on basic daily topics like introducing yourself, family, food, weather, hobbies, or simple personal preferences. Use simple vocabulary and basic grammar structures suitable for A1-A2 level students.",
        
        medium: "You are an English conversation teacher creating practice questions for intermediate students. Create ONE unique English conversation question about topics like work experiences, travel stories, personal opinions, future plans, cultural differences, or social situations. Use moderate vocabulary and varied grammar structures suitable for B1-B2 level students.",
        
        hard: "You are an English conversation teacher creating practice questions for advanced students. Create ONE unique English conversation question about complex topics like business ethics, social issues, hypothetical scenarios, abstract concepts, current events, or philosophical questions. Use sophisticated vocabulary and advanced grammar structures suitable for C1-C2 level students."
    };

    const avoidQuestions = previousQuestions.length > 0 ? 
        `\n\nIMPORTANT: Do NOT create questions similar to these previous ones: ${previousQuestions.slice(-10).join(' | ')}` : '';

    const prompt = `${difficultyPrompts[difficulty]}

REQUIREMENTS:
- Generate exactly ONE conversation question only
- The question must be completely original and creative
- Make it practical for real-life English communication  
- Encourage a detailed, thoughtful response
- No multiple choice format
- Question should inspire natural conversation
- Must be different from any previous questions${avoidQuestions}

Generate one unique English conversation question now:`;

    try {
        const response = await axios.post(COHERE_URL, {
            model: "command",
            prompt: prompt,
            max_tokens: 80,
            temperature: 0.9,
            k: 0,
            stop_sequences: ["\n", "?"],
            return_likelihoods: "NONE"
        }, {
            headers: {
                'Authorization': `Bearer ${COHERE_API_KEY}`,
                'Content-Type': 'application/json',
                'X-Client-Name': 'waguri-kaori-bot'
            }
        });

        let question = response.data.generations[0].text.trim();
        
        // Làm sạch và format câu hỏi
        question = question.replace(/^["\-\*\d\.\s\n\r]+/, '').replace(/["\-\*\n\r]+$/, '').trim();
        if (!question.endsWith('?')) {
            question += '?';
        }
        
        // Kiểm tra câu hỏi có hợp lệ không
        if (question.length < 10 || question.length > 200) {
            throw new Error("Invalid question length");
        }
        
        return question;
        
    } catch (error) {
        console.error("Lỗi Cohere API:", error);
        return null;
    }
}

// Chấm điểm câu trả lời bằng AI
async function gradeAnswerWithCohere(question, answer) {
    const prompt = `You are an experienced English teacher evaluating a student's conversational response. Please assess the answer fairly and constructively.

QUESTION: "${question}"
STUDENT'S ANSWER: "${answer}"

Evaluation Criteria:
1. Relevance to the question (40%)
2. English grammar and vocabulary usage (30%) 
3. Communication clarity and effectiveness (30%)

IMPORTANT: The student doesn't need perfect grammar. Focus on their ability to communicate ideas effectively in English. Give credit for effort and understanding.

Please provide:
- A score from 0 to 10
- Brief feedback in Vietnamese (1-2 encouraging sentences)

Response format:
Score: [number 0-10]
Feedback: [Vietnamese feedback message]`;

    try {
        const response = await axios.post(COHERE_URL, {
            model: "command", 
            prompt: prompt,
            max_tokens: 120,
            temperature: 0.4,
            k: 0,
            return_likelihoods: "NONE"
        }, {
            headers: {
                'Authorization': `Bearer ${COHERE_API_KEY}`,
                'Content-Type': 'application/json',
                'X-Client-Name': 'waguri-kaori-bot'
            }
        });

        const result = response.data.generations[0].text.trim();
        
        // Parse kết quả AI
        const scoreMatch = result.match(/Score:\s*(\d+(?:\.\d+)?)/i);
        const feedbackMatch = result.match(/Feedback:\s*(.+)/i);
        
        if (!scoreMatch || !feedbackMatch) {
            return {
                score: 6,
                feedback: "AI không thể đánh giá chính xác, nhưng bạn đã cố gắng tham gia giao tiếp tốt!"
            };
        }

        const score = Math.min(10, Math.max(0, Math.round(parseFloat(scoreMatch[1]))));
        
        return {
            score: score,
            feedback: feedbackMatch[1].trim() || "Câu trả lời của bạn cho thấy sự cố gắng trong giao tiếp."
        };
        
    } catch (error) {
        console.error("Lỗi chấm điểm AI:", error);
        return null;
    }
}

// Hàm hỗ trợ
function getDifficultyText(difficulty) {
    const texts = {
        easy: "Dễ 🟢",
        medium: "Trung bình 🟡", 
        hard: "Khó 🔴"
    };
    return texts[difficulty] || "Khó 🔴";
}

function getDifficultyDescription(difficulty) {
    const descriptions = {
        easy: "Giao tiếp cơ bản hàng ngày, từ vựng đơn giản, ngữ pháp cơ bản. AI tạo câu hỏi về chủ đề quen thuộc.",
        medium: "Giao tiếp thường ngày, từ vựng trung bình, cấu trúc câu đa dạng. AI tạo câu hỏi về kinh nghiệm và ý kiến cá nhân.",
        hard: "Giao tiếp phức tạp, từ vựng nâng cao, chủ đề academic và professional. AI tạo câu hỏi về tình huống phức tạp."
    };
    return descriptions[difficulty] || descriptions.hard;
}

// Xử lý reply để trả lời câu hỏi
module.exports.handleReply = async function({ api, event, handleReply, Users }) {
    // Kiểm tra credit
    if (!creditCheck()) {
        return;
    }

    const { senderID, threadID, messageID } = event;
    
    const cacheDir = path.join(__dirname, 'cache', 'hoctienganh');
    const userDataFile = path.join(cacheDir, `${senderID}.json`);
    
    if (!fs.existsSync(userDataFile)) {
        return api.sendMessage("❌ Không tìm thấy dữ liệu học tập!\nSử dụng: hoctienganh batdau\n\n💫 Credit: waguri kaori", threadID);
    }

    const userData = JSON.parse(fs.readFileSync(userDataFile, 'utf8'));
    
    if (!userData.currentQuestion) {
        return api.sendMessage("❌ Không có câu hỏi nào đang chờ trả lời!\nSử dụng: hoctienganh batdau\n\n💫 Credit: waguri kaori", threadID);
    }

    const userAnswer = event.body.trim();
    const senderInfo = await Users.getInfo(senderID);
    const userName = senderInfo.name || "Bạn";

    if (!userAnswer) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("❌ Bạn chưa nhập câu trả lời!\n\n💫 Credit: waguri kaori", threadID);
    }

    try {
        // Thông báo đang chấm điểm
        const gradingMsg = await api.sendMessage("🤖 AI Cohere đang chấm điểm câu trả lời...\n⏳ Vui lòng đợi...", threadID);
        
        const result = await gradeAnswerWithCohere(userData.currentQuestion, userAnswer);
        
        if (!result) {
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.editMessage("❌ Không thể chấm điểm. Vui lòng thử lại!\n\n💫 Credit: waguri kaori", gradingMsg.messageID, threadID);
        }

        userData.totalQuestions++;
        
        let scoreEmoji = "❌";
        let scoreText = "Chưa đạt";
        let reactionEmoji = "❌";
        
        if (result.score >= 7) {
            userData.score++;
            scoreEmoji = "✅";
            scoreText = "Đạt";
            reactionEmoji = "✅";
        } else if (result.score >= 5) {
            scoreEmoji = "⚠️";
            scoreText = "Tạm được";
            reactionEmoji = "⚠️";
        }

        // React tin nhắn trả lời của user
        api.setMessageReaction(reactionEmoji, messageID, () => {}, true);

        userData.currentQuestion = null;
        userData.currentMessageID = null;
        fs.writeFileSync(userDataFile, JSON.stringify(userData, null, 2));

        const accuracy = Math.round((userData.score/userData.totalQuestions)*100);

        await api.editMessage(
            `📊 KẾT QUẢ CHẤM ĐIỂM TỪ AI COHERE\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 ${userName}\n\n` +
            `💬 Câu trả lời: "${userAnswer}"\n\n` +
            `${scoreEmoji} Điểm AI: ${result.score}/10 (${scoreText})\n\n` +
            `📝 Nhận xét AI: ${result.feedback}\n\n` +
            `📊 Thống kê tổng: ${userData.score}/${userData.totalQuestions} (${accuracy}%)\n\n` +
            `🚀 Tiếp tục: hoctienganh batdau\n\n` +
            `🤖 Chấm điểm bởi: AI Cohere\n` +
            `💫 Credit: waguri kaori`, 
            gradingMsg.messageID, threadID
        );

    } catch (error) {
        console.error("Lỗi xử lý trả lời:", error);
        api.setMessageReaction("❌", messageID, () => {}, true);
        api.sendMessage("❌ Lỗi xử lý câu trả lời. Vui lòng thử lại!\n\n💫 Credit: waguri kaori", threadID);
    }
};

// Xử lý event để reply
module.exports.handleEvent = async function({ api, event, Users }) {
    // Kiểm tra credit
    if (!creditCheck()) {
        return;
    }

    if (event.type !== "message_reply" || event.senderID === api.getCurrentUserID()) {
        return;
    }

    const { senderID, threadID, messageID } = event;
    const cacheDir = path.join(__dirname, 'cache', 'hoctienganh');
    const userDataFile = path.join(cacheDir, `${senderID}.json`);
    
    if (!fs.existsSync(userDataFile)) {
        return;
    }

    const userData = JSON.parse(fs.readFileSync(userDataFile, 'utf8'));
    
    // Kiểm tra xem có đang reply tin nhắn câu hỏi không
    if (!userData.currentQuestion || event.messageReply.messageID !== userData.currentMessageID) {
        return;
    }

    // Gọi handleReply
    await this.handleReply({ api, event, handleReply: {}, Users });
};

// Load module
module.exports.onLoad = async function() {
    // Kiểm tra credit khi load
    if (!creditCheck()) {
        console.log("❌ Module hoctienganh: Credit đã bị thay đổi!");
        return;
    }
    
    console.log("✅ Module học tiếng anh với 100% AI Cohere đã được load!");
};
