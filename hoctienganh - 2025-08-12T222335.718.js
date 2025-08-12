
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
    description: "Học tiếng Anh với AI Cohere - tạo câu hỏi và chấm điểm",
    commandCategory: "Giáo dục",
    usages: "[batdau/traloijj/diemso/doido/huongdan]",
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
        return api.sendMessage("📚 HỌC TIẾNG ANH VỚI AI\n" +
            "━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "🎯 CÁC LỆNH CHÍNH:\n" +
            "• hoctienganh batdau - Bắt đầu câu hỏi mới\n" +
            "• hoctienganh traloijj [câu trả lời] - Trả lời câu hỏi\n" +
            "• hoctienganh diemso - Xem điểm số của bạn\n" +
            "• hoctienganh doido - Thay đổi độ khó\n" +
            "• hoctienganh huongdan - Hướng dẫn chi tiết\n\n" +
            "💡 TÍNH NĂNG:\n" +
            "- AI tạo câu hỏi giao tiếp tiếng Anh\n" +
            "- Không trùng câu hỏi cũ\n" +
            "- Chấm điểm thông minh\n" +
            "- 3 độ khó: dễ, trung bình, khó\n\n" +
            `📊 Điểm hiện tại: ${userData.score}/${userData.totalQuestions}\n` +
            `🎚️ Độ khó: ${getDifficultyText(userData.difficulty)}\n\n` +
            "━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "💫 Credit: waguri kaori", event.threadID);
    }

    switch (args[0].toLowerCase()) {
        case "batdau":
            try {
                api.sendMessage("🤖 Đang tạo câu hỏi tiếng Anh cho bạn...", event.threadID);
                
                const question = await generateQuestion(userData.difficulty, userData.lastQuestions);
                
                if (!question) {
                    return api.sendMessage("❌ Không thể tạo câu hỏi. Vui lòng thử lại!", event.threadID);
                }

                userData.currentQuestion = question;
                userData.lastQuestions.push(question.toLowerCase());
                
                // Giữ chỉ 20 câu hỏi gần nhất để tránh trùng lặp
                if (userData.lastQuestions.length > 20) {
                    userData.lastQuestions.shift();
                }

                fs.writeFileSync(userDataFile, JSON.stringify(userData, null, 2));

                api.sendMessage(`📝 CÂU HỎI TIẾNG ANH\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `👤 ${userName}\n` +
                    `🎚️ Độ khó: ${getDifficultyText(userData.difficulty)}\n\n` +
                    `❓ ${question}\n\n` +
                    `💬 Trả lời bằng: hoctienganh traloijj [câu trả lời]\n` +
                    `⏰ Thời gian: không giới hạn\n\n` +
                    `📊 Điểm: ${userData.score}/${userData.totalQuestions}\n\n` +
                    `💫 Credit: waguri kaori`, event.threadID);

            } catch (error) {
                console.error("Lỗi tạo câu hỏi:", error);
                api.sendMessage("❌ Lỗi kết nối API. Vui lòng thử lại sau!", event.threadID);
            }
            break;

        case "traloijj":
            if (!userData.currentQuestion) {
                return api.sendMessage("❌ Bạn chưa có câu hỏi nào!\n" +
                    "Sử dụng: hoctienganh batdau", event.threadID);
            }

            if (!args[1]) {
                return api.sendMessage("❌ Bạn chưa nhập câu trả lời!\n" +
                    "Sử dụng: hoctienganh traloijj [câu trả lời]", event.threadID);
            }

            const userAnswer = args.slice(1).join(' ');
            
            try {
                api.sendMessage("🤖 Đang chấm điểm câu trả lời...", event.threadID);
                
                const result = await gradeAnswer(userData.currentQuestion, userAnswer);
                
                if (!result) {
                    return api.sendMessage("❌ Không thể chấm điểm. Vui lòng thử lại!", event.threadID);
                }

                userData.totalQuestions++;
                
                let scoreEmoji = "❌";
                let scoreText = "Chưa đạt";
                
                if (result.score >= 7) {
                    userData.score++;
                    scoreEmoji = "✅";
                    scoreText = "Đạt";
                } else if (result.score >= 5) {
                    scoreEmoji = "⚠️";
                    scoreText = "Tạm được";
                }

                userData.currentQuestion = null;
                fs.writeFileSync(userDataFile, JSON.stringify(userData, null, 2));

                api.sendMessage(`📊 KẾT QUẢ CHẤM ĐIỂM\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `👤 ${userName}\n\n` +
                    `❓ Câu hỏi: ${userData.currentQuestion || "N/A"}\n\n` +
                    `💬 Câu trả lời: "${userAnswer}"\n\n` +
                    `${scoreEmoji} Điểm: ${result.score}/10 (${scoreText})\n\n` +
                    `📝 Nhận xét: ${result.feedback}\n\n` +
                    `📊 Tổng điểm: ${userData.score}/${userData.totalQuestions}\n` +
                    `📈 Tỷ lệ đúng: ${userData.totalQuestions > 0 ? Math.round((userData.score/userData.totalQuestions)*100) : 0}%\n\n` +
                    `🚀 Tiếp tục với: hoctienganh batdau\n\n` +
                    `💫 Credit: waguri kaori`, event.threadID);

            } catch (error) {
                console.error("Lỗi chấm điểm:", error);
                api.sendMessage("❌ Lỗi chấm điểm. Vui lòng thử lại!", event.threadID);
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
                `🎚️ Độ khó hiện tại: ${getDifficultyText(userData.difficulty)}\n\n` +
                `💡 GỢI Ý NÂNG CAO:\n` +
                `${accuracy < 70 ? "• Luyện tập thêm ở độ khó dễ hơn\n• Đọc thêm tài liệu tiếng Anh" : 
                  "• Thử thách ở độ khó cao hơn\n• Luyện tập giao tiếp thực tế"}\n\n` +
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
                `🚀 Bắt đầu câu hỏi mới: hoctienganh batdau\n\n` +
                `💫 Credit: waguri kaori`, event.threadID);
            break;

        case "huongdan":
            api.sendMessage(`📚 HƯỚNG DẪN HỌC TIẾNG ANH\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `🎯 CÁCH SỬ DỤNG:\n` +
                `1️⃣ hoctienganh batdau - Nhận câu hỏi mới\n` +
                `2️⃣ hoctienganh traloijj [đáp án] - Trả lời\n` +
                `3️⃣ Xem kết quả và nhận xét từ AI\n` +
                `4️⃣ Lặp lại để nâng cao trình độ\n\n` +
                `🎚️ ĐỘ KHÓ:\n` +
                `• Dễ: Giao tiếp cơ bản, từ vựng đơn giản\n` +
                `• Trung bình: Giao tiếp thường ngày\n` +
                `• Khó: Giao tiếp phức tạp, academic\n\n` +
                `📊 CHẤM ĐIỂM:\n` +
                `• 7-10 điểm: Đạt (tính vào thống kê)\n` +
                `• 5-6 điểm: Tạm được\n` +
                `• 0-4 điểm: Chưa đạt\n\n` +
                `💡 MẸO HAY:\n` +
                `• Trả lời bằng câu hoàn chỉnh\n` +
                `• Sử dụng từ vựng phù hợp ngữ cảnh\n` +
                `• Không cần 100% chính xác về ngữ pháp\n` +
                `• Tập trung vào ý nghĩa và giao tiếp\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💫 Credit: waguri kaori`, event.threadID);
            break;

        default:
            api.sendMessage("❌ Lệnh không hợp lệ!\nSử dụng: hoctienganh để xem hướng dẫn", event.threadID);
    }
};

// Tạo câu hỏi bằng Cohere API
async function generateQuestion(difficulty, previousQuestions) {
    const difficultyPrompts = {
        easy: "Create a simple English conversation question for beginners. Focus on basic daily topics like food, weather, family, hobbies. Use simple vocabulary and grammar.",
        medium: "Create an intermediate English conversation question. Topics can include work, travel, opinions, experiences. Use moderate vocabulary and grammar structures.",
        hard: "Create an advanced English conversation question. Include complex topics like business, politics, abstract concepts, hypothetical situations. Use sophisticated vocabulary."
    };

    const avoidQuestions = previousQuestions.length > 0 ? 
        `\n\nAvoid questions similar to: ${previousQuestions.slice(-5).join(', ')}` : '';

    const prompt = `${difficultyPrompts[difficulty]}

Requirements:
- Generate only ONE conversation question
- Make it practical for real-life communication
- Question should encourage a detailed response
- Don't include multiple choice options
- The question should be different from previous ones${avoidQuestions}

Generate a single English conversation question:`;

    try {
        const response = await axios.post(COHERE_URL, {
            model: "command",
            prompt: prompt,
            max_tokens: 100,
            temperature: 0.8,
            k: 0,
            stop_sequences: ["\n\n"],
            return_likelihoods: "NONE"
        }, {
            headers: {
                'Authorization': `Bearer ${COHERE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const question = response.data.generations[0].text.trim();
        
        // Loại bỏ các ký tự không mong muốn
        return question.replace(/^["\-\*\d\.\s]+/, '').replace(/["\-\*]+$/, '').trim();
        
    } catch (error) {
        console.error("Lỗi API Cohere:", error);
        return null;
    }
}

// Chấm điểm câu trả lời
async function gradeAnswer(question, answer) {
    const prompt = `You are an English teacher evaluating a student's conversational response.

Question: "${question}"
Student's Answer: "${answer}"

Please evaluate the answer based on:
1. Relevance to the question (40%)
2. English grammar and vocabulary usage (30%)
3. Communication effectiveness (30%)

Provide:
- A score from 0-10
- Brief feedback in Vietnamese (1-2 sentences)

The student doesn't need perfect grammar, focus on communication ability.

Format your response as:
Score: [number]
Feedback: [Vietnamese feedback]`;

    try {
        const response = await axios.post(COHERE_URL, {
            model: "command",
            prompt: prompt,
            max_tokens: 150,
            temperature: 0.3,
            k: 0,
            return_likelihoods: "NONE"
        }, {
            headers: {
                'Authorization': `Bearer ${COHERE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const result = response.data.generations[0].text.trim();
        
        // Parse kết quả
        const scoreMatch = result.match(/Score:\s*(\d+)/i);
        const feedbackMatch = result.match(/Feedback:\s*(.+)/i);
        
        if (!scoreMatch || !feedbackMatch) {
            return {
                score: 5,
                feedback: "Không thể đánh giá chính xác, nhưng bạn đã cố gắng tham gia giao tiếp!"
            };
        }

        return {
            score: parseInt(scoreMatch[1]) || 5,
            feedback: feedbackMatch[1].trim() || "Câu trả lời của bạn có thể cải thiện thêm."
        };
        
    } catch (error) {
        console.error("Lỗi chấm điểm:", error);
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
        easy: "Giao tiếp cơ bản hàng ngày, từ vựng đơn giản, ngữ pháp cơ bản",
        medium: "Giao tiếp thường ngày, từ vựng trung bình, cấu trúc câu đa dạng",
        hard: "Giao tiếp phức tạp, từ vựng nâng cao, chủ đề academic và professional"
    };
    return descriptions[difficulty] || descriptions.hard;
}

// Auto-save data periodically
module.exports.handleEvent = async function({ api, event }) {
    // Không xử lý event để tránh spam
    return;
};

module.exports.onLoad = async function() {
    // Kiểm tra credit khi load module
    if (!creditCheck()) {
        console.log("❌ Module hoctienganh: Credit đã bị thay đổi!");
        return;
    }
    
    console.log("✅ Module hoctienganh đã được load thành công!");
};
