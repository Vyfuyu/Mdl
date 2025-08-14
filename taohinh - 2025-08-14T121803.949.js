
module.exports.config = {
  name: "taohinh",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Kaori Waguri",
  description: "Tạo ảnh bằng AI với Stability AI - Hỗ trợ tự động dịch từ tiếng Việt sang tiếng Anh",
  commandCategory: "Tiện ích",
  usages: "taohinh <mô tả ảnh>",
  cooldowns: 10,
  images: [],
};

const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Stability AI Configuration
const STABILITY_API = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image";
const STABILITY_API_KEY = "sk-Tf24cSgoHKadLSOzXlFsfYCjDguSwQoYgkIQetRPR5KPNydN";

// Google Translate API (free endpoint)
async function translateToEnglish(text) {
  try {
    const response = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=en&dt=t&q=${encodeURIComponent(text)}`);
    
    if (response.data && response.data[0] && response.data[0][0] && response.data[0][0][0]) {
      return response.data[0][0][0];
    }
    
    return text; // Fallback to original text if translation fails
  } catch (error) {
    console.error("Translation error:", error);
    return text; // Fallback to original text
  }
}

// Detect if text contains Vietnamese characters
function isVietnamese(text) {
  const vietnamesePattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  return vietnamesePattern.test(text);
}

// Generate image with Stability AI
async function generateImage(prompt) {
  try {
    const response = await axios.post(STABILITY_API, {
      text_prompts: [
        {
          text: prompt,
          weight: 1
        }
      ],
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
    console.error("Stability AI Error:", error.response?.data || error.message);
    throw new Error(`Lỗi tạo ảnh: ${error.response?.data?.message || error.message}`);
  }
}

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  if (args.length === 0) {
    return api.sendMessage(
      `🎨 TẠO ẢNH AI - KAORI WAGURI\n\n` +
      `📋 Cách sử dụng:\n` +
      `• ${this.config.name} <mô tả ảnh>\n\n` +
      `💡 Ví dụ:\n` +
      `• ${this.config.name} cô gái anime tóc xanh\n` +
      `• ${this.config.name} beautiful sunset over mountains\n` +
      `• ${this.config.name} robot trong thành phố tương lai\n\n` +
      `🌐 Tự động dịch tiếng Việt sang tiếng Anh\n` +
      `⚡ Powered by Stability AI`,
      threadID, messageID
    );
  }

  const originalPrompt = args.join(" ");
  
  if (originalPrompt.length > 500) {
    return api.sendMessage("❌ Mô tả quá dài! Vui lòng giới hạn dưới 500 ký tự.", threadID, messageID);
  }

  try {
    // Send processing message
    api.sendMessage("🎨 Đang tạo ảnh... Vui lòng đợi 20-30 giây ⏳", threadID, messageID);

    let finalPrompt = originalPrompt;
    
    // Translate if Vietnamese is detected
    if (isVietnamese(originalPrompt)) {
      const translatedPrompt = await translateToEnglish(originalPrompt);
      finalPrompt = translatedPrompt;
      
      // Enhance prompt for better results
      finalPrompt = `${finalPrompt}, high quality, detailed, masterpiece, 8k resolution`;
    } else {
      // Enhance English prompts
      finalPrompt = `${originalPrompt}, high quality, detailed, masterpiece, 8k resolution`;
    }

    // Generate image
    const imageData = await generateImage(finalPrompt);
    
    if (!imageData.artifacts || imageData.artifacts.length === 0) {
      throw new Error("Không nhận được dữ liệu ảnh từ API");
    }

    // Process the first image
    const artifact = imageData.artifacts[0];
    const imageBuffer = Buffer.from(artifact.base64, 'base64');
    
    // Save image to cache
    const imagePath = path.join(__dirname, 'cache', `stability_${Date.now()}_${senderID}.png`);
    
    // Ensure cache directory exists
    const cacheDir = path.dirname(imagePath);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    fs.writeFileSync(imagePath, imageBuffer);

    // Send image with information
    const message = `✅ TẠO ẢNH THÀNH CÔNG!\n\n` +
      `🎯 Prompt gốc: ${originalPrompt}\n` +
      `🌐 Prompt AI: ${finalPrompt}\n` +
      `🤖 Engine: Stability AI SDXL\n` +
      `📊 Resolution: 1024x1024\n` +
      `👑 Kaori Waguri Premium`;

    api.sendMessage({
      body: message,
      attachment: fs.createReadStream(imagePath)
    }, threadID, () => {
      // Clean up temp file
      fs.unlinkSync(imagePath);
    }, messageID);

  } catch (error) {
    console.error("Generate image error:", error);
    
    let errorMessage = "❌ Có lỗi xảy ra khi tạo ảnh!";
    
    if (error.message.includes("quota")) {
      errorMessage = "❌ Đã hết quota API! Vui lòng thử lại sau.";
    } else if (error.message.includes("safety")) {
      errorMessage = "❌ Nội dung không phù hợp! Vui lòng thử prompt khác.";
    } else if (error.message.includes("network")) {
      errorMessage = "❌ Lỗi kết nối mạng! Vui lòng thử lại.";
    }

    api.sendMessage(`${errorMessage}\n\n🔧 Chi tiết lỗi: ${error.message}`, threadID, messageID);
  }
};
