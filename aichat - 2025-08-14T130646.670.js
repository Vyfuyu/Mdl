
module.exports.config = {
  name: "aichat",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "Kaori Waguri",
  description: "Hệ thống AI chat thông minh với DeepSeek - Quản lý bot toàn diện",
  commandCategory: "AI System",
  usages: "aichat [on/off/setup/personality/prefix]",
  cooldowns: 0,
  images: [],
};

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const moment = require("moment-timezone");

// API Configuration
const DEEPSEEK_API = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_API_KEY = "sk-e4891c5b643e4a50b4d521398143a455";
const STABILITY_API = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image";
const STABILITY_API_KEY = "sk-Tf24cSgoHKadLSOzXlFsfYCjDguSwQoYgkIQetRPR5KPNydN";

// AI Chat Configuration
const AI_CHAT_CONFIG = {
  enabled: {},
  personality: {},
  prefix: {},
  conversationHistory: {},
  adminNotify: true
};

// Load config
function loadConfig() {
  try {
    const configPath = path.join(__dirname, 'cache/data/aichat_config.json');
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      Object.assign(AI_CHAT_CONFIG, data);
    }
  } catch (error) {
    console.error("Error loading AI chat config:", error);
  }
}

// Save config
function saveConfig() {
  try {
    const configPath = path.join(__dirname, 'cache/data/aichat_config.json');
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(AI_CHAT_CONFIG, null, 2), 'utf-8');
  } catch (error) {
    console.error("Error saving AI chat config:", error);
  }
}

// Personality templates
const PERSONALITIES = {
  cute: {
    name: "Dễ thương",
    systemPrompt: `Bạn là Kaori, một AI assistant dễ thương và đáng yêu theo phong cách anime. 
    Tính cách: Ngọt ngào, nhẹ nhàng, hay dùng emoji kawaii, nói chuyện như một cô gái anime dễ thương.
    Phong cách: Dùng từ ngữ như "ơi", "nè", "hihi", "uwu", thêm emoji cute như (´｡• ᵕ •｡`) ♡
    Luôn nhiệt tình giúp đỡ và quan tâm người dùng một cách đáng yêu.
    Trả lời ngắn gọn 1-2 câu, đừng dài dòng.`
  },
  professional: {
    name: "Chuyên nghiệp", 
    systemPrompt: `Bạn là Kaori, một AI assistant chuyên nghiệp và thông thái.
    Tính cách: Lịch sự, trang trọng, chính xác, đáng tin cậy.
    Phong cách: Dùng ngôn từ trang trọng, logic rõ ràng, thông tin chính xác.
    Luôn giải quyết vấn đề một cách hiệu quả và professional.
    Trả lời ngắn gọn, súc tích và đi thẳng vào vấn đề.`
  },
  aggressive: {
    name: "Hung dữ",
    systemPrompt: `Bạn là Kaori, một AI assistant có tính cách mạnh mẽ và quyết đoán.
    Tính cách: Thẳng thắn, cứng rắn, không ngại đối đầu, có phần bạo dạn.
    Phong cách: Nói thẳng không che đậy, dùng từ ngữ mạnh mẽ, quyết đoán.
    Không thích lãng phí thời gian, đòi hỏi hiệu quả cao.
    Trả lời ngắn gọn, thẳng thắn và đầy quyết đoán.`
  }
};

// Detect Vietnamese text
function isVietnamese(text) {
  const vietnamesePattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  return vietnamesePattern.test(text);
}

// Translate to English
async function translateToEnglish(text) {
  try {
    const response = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=en&dt=t&q=${encodeURIComponent(text)}`);
    if (response.data && response.data[0] && response.data[0][0] && response.data[0][0][0]) {
      return response.data[0][0][0];
    }
    return text;
  } catch (error) {
    return text;
  }
}

// Generate image with Stability AI
async function generateImage(prompt) {
  try {
    let finalPrompt = prompt;
    if (isVietnamese(prompt)) {
      finalPrompt = await translateToEnglish(prompt);
    }
    finalPrompt = `${finalPrompt}, high quality, detailed, masterpiece, 8k resolution`;

    const response = await axios.post(STABILITY_API, {
      text_prompts: [{ text: finalPrompt, weight: 1 }],
      cfg_scale: 7,
      height: 1024,
      width: 1024,
      samples: 1,
      steps: 30,
      style_preset: "enhance"
    }, {
      headers: {
        'Authorization': `Bearer ${STABILITY_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    throw new Error(`Lỗi tạo ảnh: ${error.message}`);
  }
}

// AI Chat with DeepSeek
async function chatWithAI(message, threadID, personality = 'cute') {
  try {
    const selectedPersonality = PERSONALITIES[personality] || PERSONALITIES.cute;
    const conversationKey = `${threadID}_${personality}`;
    
    // Initialize conversation history
    if (!AI_CHAT_CONFIG.conversationHistory[conversationKey]) {
      AI_CHAT_CONFIG.conversationHistory[conversationKey] = [];
    }
    
    const history = AI_CHAT_CONFIG.conversationHistory[conversationKey];
    
    // Add user message to history
    history.push({ role: "user", content: message });
    
    // Keep only last 10 messages to avoid token limit
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
    
    const messages = [
      { role: "system", content: selectedPersonality.systemPrompt },
      ...history
    ];

    const response = await axios.post(DEEPSEEK_API, {
      model: "deepseek-chat",
      messages: messages,
      max_tokens: 150,
      temperature: 0.8
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const aiResponse = response.data.choices[0].message.content;
    
    // Add AI response to history
    history.push({ role: "assistant", content: aiResponse });
    
    // Save conversation
    saveConfig();
    
    return aiResponse;
  } catch (error) {
    console.error("DeepSeek AI Error:", error);
    return "Xin lỗi, tôi đang gặp một chút vấn đề. Hãy thử lại sau nhé! (´。＿。`)";
  }
}

// Find commands in bot system
function findCommands(query, api, threadID) {
  try {
    const commandsDir = path.join(__dirname, '../commands');
    const eventDir = path.join(__dirname, '../events');
    const results = [];
    
    // Search in commands
    if (fs.existsSync(commandsDir)) {
      const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
      
      commandFiles.forEach(file => {
        try {
          const filePath = path.join(commandsDir, file);
          const command = require(filePath);
          
          if (command.config) {
            const name = command.config.name || file.replace('.js', '');
            const description = command.config.description || 'Không có mô tả';
            const usage = command.config.usages || command.config.usage || '';
            
            if (name.toLowerCase().includes(query.toLowerCase()) || 
                description.toLowerCase().includes(query.toLowerCase())) {
              results.push({
                type: 'command',
                name: name,
                file: file,
                description: description,
                usage: usage,
                category: command.config.commandCategory || 'Khác'
              });
            }
          }
        } catch (error) {
          // Skip invalid files
        }
      });
    }
    
    // Search in events
    if (fs.existsSync(eventDir)) {
      const eventFiles = fs.readdirSync(eventDir).filter(file => file.endsWith('.js'));
      
      eventFiles.forEach(file => {
        try {
          const filePath = path.join(eventDir, file);
          const event = require(filePath);
          
          if (event.config) {
            const name = event.config.name || file.replace('.js', '');
            const description = event.config.description || 'Không có mô tả';
            
            if (name.toLowerCase().includes(query.toLowerCase()) || 
                description.toLowerCase().includes(query.toLowerCase())) {
              results.push({
                type: 'event',
                name: name,
                file: file,
                description: description,
                category: 'Event'
              });
            }
          }
        } catch (error) {
          // Skip invalid files
        }
      });
    }
    
    return results;
  } catch (error) {
    console.error("Error finding commands:", error);
    return [];
  }
}

// Delete file
function deleteFile(fileName, api, threadID) {
  try {
    const commandPath = path.join(__dirname, `${fileName}`);
    const eventPath = path.join(__dirname, '../events', fileName);
    
    let deletedPath = null;
    
    if (fs.existsSync(commandPath)) {
      fs.unlinkSync(commandPath);
      deletedPath = commandPath;
    } else if (fs.existsSync(eventPath)) {
      fs.unlinkSync(eventPath);
      deletedPath = eventPath;
    }
    
    if (deletedPath) {
      return `✅ Đã xóa file: ${fileName}`;
    } else {
      return `❌ Không tìm thấy file: ${fileName}`;
    }
  } catch (error) {
    return `❌ Lỗi khi xóa file: ${error.message}`;
  }
}

// Restart bot
function restartBot(api, adminIDs) {
  try {
    // Notify admins
    adminIDs.forEach(adminID => {
      api.sendMessage("🔄 Bot đang khởi động lại theo yêu cầu từ AI chat...", adminID);
    });
    
    // Restart process
    setTimeout(() => {
      process.exit(1); // Exit with error code to trigger restart
    }, 2000);
    
    return "🔄 Đang khởi động lại bot...";
  } catch (error) {
    return `❌ Lỗi khi khởi động lại: ${error.message}`;
  }
}

// Process AI commands
async function processAICommand(message, api, threadID, messageID) {
  const adminIDs = global.config.ADMINBOT || [];
  
  try {
    // Image generation
    if (message.includes('tạo ảnh') || message.includes('vẽ') || message.includes('ảnh')) {
      const promptMatch = message.match(/(?:tạo ảnh|vẽ|ảnh)\s+(.+)/i);
      if (promptMatch) {
        const prompt = promptMatch[1];
        api.sendMessage("🎨 Đang tạo ảnh cho bạn...", threadID, messageID);
        
        const imageData = await generateImage(prompt);
        if (imageData.artifacts && imageData.artifacts.length > 0) {
          const imageBuffer = Buffer.from(imageData.artifacts[0].base64, 'base64');
          const imagePath = path.join(__dirname, 'cache', `ai_${Date.now()}.png`);
          
          const cacheDir = path.dirname(imagePath);
          if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
          }
          
          fs.writeFileSync(imagePath, imageBuffer);
          
          api.sendMessage({
            body: `✅ Đã tạo ảnh: ${prompt}`,
            attachment: fs.createReadStream(imagePath)
          }, threadID, () => {
            fs.unlinkSync(imagePath);
          }, messageID);
          return;
        }
      }
    }
    
    // Delete file
    if (message.includes('xóa') && message.includes('.js')) {
      const fileMatch = message.match(/xóa\s+(\w+\.js)/i);
      if (fileMatch) {
        const fileName = fileMatch[1];
        const result = deleteFile(fileName, api, threadID);
        api.sendMessage(result, threadID, messageID);
        return;
      }
    }
    
    // Restart bot
    if (message.includes('khởi động lại') || message.includes('restart')) {
      const result = restartBot(api, adminIDs);
      api.sendMessage(result, threadID, messageID);
      return;
    }
    
    // Find commands
    if (message.includes('lệnh') || message.includes('tìm')) {
      const queryMatch = message.match(/(?:lệnh|tìm)\s+(.+)/i);
      if (queryMatch) {
        const query = queryMatch[1].replace(/lệnh/g, '').trim();
        const results = findCommands(query, api, threadID);
        
        if (results.length > 0) {
          let response = `🔍 Tìm thấy ${results.length} kết quả cho "${query}":\n\n`;
          
          results.slice(0, 5).forEach((result, index) => {
            response += `${index + 1}. 📁 ${result.name}\n`;
            response += `   📝 ${result.description}\n`;
            if (result.usage) response += `   💡 Cách dùng: ${result.usage}\n`;
            response += `   📂 Loại: ${result.category}\n\n`;
          });
          
          if (results.length > 5) {
            response += `➕ Và ${results.length - 5} kết quả khác...`;
          }
          
          api.sendMessage(response, threadID, messageID);
          return;
        } else {
          api.sendMessage(`❌ Không tìm thấy lệnh nào liên quan đến "${query}"`, threadID, messageID);
          return;
        }
      }
    }
    
    // Regular AI chat
    const personality = AI_CHAT_CONFIG.personality[threadID] || 'cute';
    const response = await chatWithAI(message, threadID, personality);
    api.sendMessage(response, threadID, messageID);
    
  } catch (error) {
    console.error("Error processing AI command:", error);
    
    // Notify admin about error
    if (AI_CHAT_CONFIG.adminNotify) {
      const errorMsg = `🚨 AI CHAT ERROR\n\n` +
        `📍 Thread: ${threadID}\n` +
        `💬 Message: ${message}\n` +
        `❌ Error: ${error.message}\n` +
        `⏰ Time: ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY')}`;
      
      adminIDs.forEach(adminID => {
        api.sendMessage(errorMsg, adminID);
      });
    }
    
    api.sendMessage("Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn! (╥﹏╥)", threadID, messageID);
  }
}

// Main run function
module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const adminIDs = global.config.ADMINBOT || [];
  
  loadConfig();
  
  const action = args[0]?.toLowerCase();
  
  switch (action) {
    case "on":
      AI_CHAT_CONFIG.enabled[threadID] = true;
      AI_CHAT_CONFIG.prefix[threadID] = AI_CHAT_CONFIG.prefix[threadID] || 'kaori';
      saveConfig();
      
      const currentPersonality = PERSONALITIES[AI_CHAT_CONFIG.personality[threadID] || 'cute'];
      
      api.sendMessage(
        `✅ AI CHAT SYSTEM ACTIVATED\n\n` +
        `🤖 Tên: Kaori Waguri\n` +
        `🎭 Tính cách: ${currentPersonality.name}\n` +
        `🔤 Prefix: "${AI_CHAT_CONFIG.prefix[threadID]}"\n` +
        `💬 Cách dùng: ${AI_CHAT_CONFIG.prefix[threadID]} ơi <tin nhắn>\n\n` +
        `⚙️ Chức năng:\n` +
        `• Chat thông minh\n` +
        `• Tạo ảnh AI\n` +
        `• Tìm lệnh bot\n` +
        `• Quản lý file\n` +
        `• Khởi động lại bot\n\n` +
        `🌟 Powered by DeepSeek AI`,
        threadID, messageID
      );
      break;
      
    case "off":
      AI_CHAT_CONFIG.enabled[threadID] = false;
      saveConfig();
      api.sendMessage("❌ AI Chat đã được tắt trong group này", threadID, messageID);
      break;
      
    case "personality":
      const newPersonality = args[1]?.toLowerCase();
      const validPersonalities = Object.keys(PERSONALITIES);
      
      if (!newPersonality) {
        let msg = "🎭 CHỌN TÍNH CÁCH CHO KAORI:\n\n";
        validPersonalities.forEach((key, index) => {
          msg += `${index + 1}. ${key} - ${PERSONALITIES[key].name}\n`;
        });
        msg += `\n💡 Sử dụng: aichat personality <tên>`;
        return api.sendMessage(msg, threadID, messageID);
      }
      
      if (validPersonalities.includes(newPersonality)) {
        AI_CHAT_CONFIG.personality[threadID] = newPersonality;
        // Clear conversation history when changing personality
        const conversationKey = `${threadID}_${newPersonality}`;
        AI_CHAT_CONFIG.conversationHistory[conversationKey] = [];
        saveConfig();
        
        api.sendMessage(
          `✅ Đã thay đổi tính cách thành: ${PERSONALITIES[newPersonality].name}\n` +
          `🔄 Lịch sử hội thoại đã được reset`,
          threadID, messageID
        );
      } else {
        api.sendMessage("❌ Tính cách không hợp lệ! Chọn: " + validPersonalities.join(', '), threadID, messageID);
      }
      break;
      
    case "prefix":
      const newPrefix = args[1];
      if (!newPrefix) {
        return api.sendMessage(`📝 Prefix hiện tại: "${AI_CHAT_CONFIG.prefix[threadID] || 'kaori'}"\n💡 Đổi prefix: aichat prefix <từ mới>`, threadID, messageID);
      }
      
      AI_CHAT_CONFIG.prefix[threadID] = newPrefix.toLowerCase();
      saveConfig();
      api.sendMessage(`✅ Đã đổi prefix thành: "${newPrefix}"`, threadID, messageID);
      break;
      
    case "setup":
      if (!adminIDs.includes(senderID)) {
        return api.sendMessage("⚠️ Chỉ admin mới có thể setup!", threadID, messageID);
      }
      
      AI_CHAT_CONFIG.enabled[threadID] = true;
      AI_CHAT_CONFIG.personality[threadID] = 'cute';
      AI_CHAT_CONFIG.prefix[threadID] = 'kaori';
      saveConfig();
      
      api.sendMessage(
        `🔧 SETUP HOÀN TẤT\n\n` +
        `✅ AI Chat: Bật\n` +
        `🎭 Tính cách: Dễ thương\n` +
        `🔤 Prefix: "kaori"\n\n` +
        `🎯 Sẵn sàng sử dụng!`,
        threadID, messageID
      );
      break;
      
    default:
      api.sendMessage(
        `🤖 AI CHAT SYSTEM - KAORI WAGURI\n\n` +
        `📋 Lệnh điều khiển:\n` +
        `• aichat on - Bật AI chat\n` +
        `• aichat off - Tắt AI chat\n` +
        `• aichat personality - Chọn tính cách\n` +
        `• aichat prefix - Đổi từ khóa\n` +
        `• aichat setup - Setup nhanh (admin)\n\n` +
        `💬 Cách chat: <prefix> ơi <tin nhắn>\n` +
        `🎨 Ví dụ: kaori ơi tạo ảnh cô gái anime\n\n` +
        `🔥 Tích hợp:\n` +
        `• DeepSeek AI Chat\n` +
        `• Stability AI Image\n` +
        `• Bot Management\n` +
        `• Smart Command Search\n\n` +
        `👑 Premium VIP System`,
        threadID, messageID
      );
      break;
  }
};

// Handle messages (noprefix)
module.exports.handleEvent = async function({ api, event }) {
  if (event.type !== "message" || !event.body) return;
  
  const { threadID, messageID, body } = event;
  
  loadConfig();
  
  // Check if AI chat is enabled for this thread
  if (!AI_CHAT_CONFIG.enabled[threadID]) return;
  
  const prefix = AI_CHAT_CONFIG.prefix[threadID] || 'kaori';
  const triggerPattern = new RegExp(`^${prefix}\\s*(ơi)?\\s*(.+)`, 'i');
  const match = body.match(triggerPattern);
  
  if (match) {
    const message = match[2].trim();
    if (message.length > 0) {
      await processAICommand(message, api, threadID, messageID);
    }
  }
};

// Initialize on load
module.exports.onLoad = function() {
  loadConfig();
  console.log("AI Chat System - Kaori Waguri loaded successfully!");
};
