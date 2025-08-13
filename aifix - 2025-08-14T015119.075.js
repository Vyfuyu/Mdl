
module.exports.config = {
  name: "aifix",
  version: "1.0.0",
  hasPermssion: 3,
  credits: "Kaori Waguri",
  description: "Hệ thống AI tự động phát hiện và sửa lỗi toàn bộ bot",
  commandCategory: "System",
  usages: "aifix [enable/disable/status/scan/logs]",
  cooldowns: 3,
  images: [],
};

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const moment = require("moment-timezone");

// DeepSeek API 🤨 nhìn con cặc
const DEEPSEEK_API = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_API_KEY = "sk-e4891c5b643e4a50b4d521398143a455";

// Auto-Fix 
const AI_FIX_CONFIG = {
  enabled: false,
  scanInterval: 300000, // 5 minutes
  maxRetries: 3,
  excludePaths: [
    'node_modules',
    '.git',
    'appstate.json',
    'config.json',
    'package-lock.json'
  ],
  watchPaths: [
    'modules/commands',
    'modules/events',
    'includes',
    'main.js',
    'lib'
  ]
};

// Global state for auto-fix system
global.AI_FIX_SYSTEM = {
  enabled: false,
  scanInterval: null,
  fixHistory: [],
  errorLog: [],
  lastScan: null
};

// DeepSeek AI Analysis Function
async function analyzeCodeWithAI(code, filePath, errorDetails = null) {
  try {
    const systemPrompt = `Bạn là một chuyên gia phân tích và sửa lỗi code JavaScript/Node.js. 
    Nhiệm vụ: Phân tích code và đưa ra giải pháp sửa lỗi cụ thể.
    
    Quy tắc phản hồi:
    1. Phân tích lỗi (nếu có)
    2. Đưa ra code đã sửa hoàn chỉnh
    3. Giải thích chi tiết những gì đã sửa
    4. Đánh giá mức độ nghiêm trọng (LOW/MEDIUM/HIGH/CRITICAL)
    
    Định dạng phản hồi JSON:
    {
      "hasError": boolean,
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "errorDescription": "mô tả lỗi",
      "fixedCode": "code đã sửa hoàn chỉnh",
      "changes": ["danh sách thay đổi"],
      "explanation": "giải thích chi tiết"
    }`;

    const userPrompt = `File: ${filePath}
    ${errorDetails ? `Error Details: ${errorDetails}` : ''}
    
    Code cần phân tích:
    \`\`\`javascript
    ${code}
    \`\`\``;

    const response = await axios.post(DEEPSEEK_API, {
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const aiResponse = response.data.choices[0].message.content;
    
    // Extract JSON from AI response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {
      hasError: false,
      severity: "LOW",
      errorDescription: "No issues detected",
      fixedCode: code,
      changes: [],
      explanation: "Code appears to be functioning correctly"
    };

  } catch (error) {
    console.error("DeepSeek AI Error:", error);
    return {
      hasError: true,
      severity: "MEDIUM",
      errorDescription: `AI Analysis failed: ${error.message}`,
      fixedCode: code,
      changes: [],
      explanation: "Unable to analyze with AI"
    };
  }
}

// File scanning functions
function getAllJSFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!AI_FIX_CONFIG.excludePaths.some(exclude => filePath.includes(exclude))) {
        getAllJSFiles(filePath, fileList);
      }
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

async function scanAndFixFiles(api, adminIDs) {
  const scanStartTime = Date.now();
  let totalFiles = 0;
  let filesWithIssues = 0;
  let fixedFiles = 0;
  
  try {
    // Get all JS files to scan
    const filesToScan = [];
    AI_FIX_CONFIG.watchPaths.forEach(watchPath => {
      if (fs.existsSync(watchPath)) {
        if (fs.statSync(watchPath).isDirectory()) {
          filesToScan.push(...getAllJSFiles(watchPath));
        } else if (watchPath.endsWith('.js')) {
          filesToScan.push(watchPath);
        }
      }
    });

    totalFiles = filesToScan.length;
    
    for (const filePath of filesToScan) {
      try {
        const code = fs.readFileSync(filePath, 'utf-8');
        const analysis = await analyzeCodeWithAI(code, filePath);
        
        if (analysis.hasError && analysis.severity !== 'LOW') {
          filesWithIssues++;
          
          // Request admin approval for critical fixes
          if (analysis.severity === 'CRITICAL' || analysis.severity === 'HIGH') {
            const approvalMessage = `🚨 AI FIX SYSTEM - YÊU CẦU PHÉP DUYỆT\n\n` +
              `📁 File: ${filePath}\n` +
              `⚠️ Mức độ: ${analysis.severity}\n` +
              `🔍 Lỗi: ${analysis.errorDescription}\n\n` +
              `🔧 Những thay đổi sẽ được thực hiện:\n` +
              `${analysis.changes.map(change => `• ${change}`).join('\n')}\n\n` +
              `💡 Giải thích: ${analysis.explanation}\n\n` +
              `⏰ Thời gian: ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY')}\n\n` +
              `Reply "APPROVE" để cho phép sửa chữa`;

            // Send to all admins
            for (const adminID of adminIDs) {
              api.sendMessage(approvalMessage, adminID, (err, info) => {
                if (!err) {
                  global.client.handleReply.push({
                    name: "aifix_approval",
                    messageID: info.messageID,
                    author: adminID,
                    filePath: filePath,
                    analysis: analysis,
                    type: "approval_request"
                  });
                }
              });
            }
          } else {
            // Auto-fix for low and medium severity issues
            await applyFix(filePath, analysis);
            fixedFiles++;
            
            // Log the fix
            const fixLog = {
              timestamp: Date.now(),
              filePath: filePath,
              severity: analysis.severity,
              error: analysis.errorDescription,
              changes: analysis.changes,
              explanation: analysis.explanation
            };
            
            global.AI_FIX_SYSTEM.fixHistory.push(fixLog);
            
            // Notify admins about auto-fix
            const notifyMessage = `✅ AI AUTO-FIX\n\n` +
              `📁 File: ${filePath}\n` +
              `⚠️ Mức độ: ${analysis.severity}\n` +
              `🔧 Đã tự động sửa chữa\n` +
              `💡 ${analysis.explanation}`;
              
            adminIDs.forEach(adminID => {
              api.sendMessage(notifyMessage, adminID);
            });
          }
        }
        
        // Add small delay to avoid API rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error scanning file ${filePath}:`, error);
        global.AI_FIX_SYSTEM.errorLog.push({
          timestamp: Date.now(),
          filePath: filePath,
          error: error.message
        });
      }
    }
    
    const scanDuration = Date.now() - scanStartTime;
    global.AI_FIX_SYSTEM.lastScan = Date.now();
    
    // Send scan summary to admins
    const summaryMessage = `📊 AI FIX SYSTEM - BÁO CÁO QUÉT\n\n` +
      `⏰ Thời gian quét: ${Math.round(scanDuration / 1000)}s\n` +
      `📁 Tổng files: ${totalFiles}\n` +
      `⚠️ Files có vấn đề: ${filesWithIssues}\n` +
      `✅ Files đã sửa: ${fixedFiles}\n` +
      `🕐 ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY')}`;
      
    adminIDs.forEach(adminID => {
      api.sendMessage(summaryMessage, adminID);
    });
    
  } catch (error) {
    console.error("Scan and fix error:", error);
    adminIDs.forEach(adminID => {
      api.sendMessage(`❌ Lỗi hệ thống AI Fix: ${error.message}`, adminID);
    });
  }
}

async function applyFix(filePath, analysis) {
  try {
    // Create backup
    const backupPath = `${filePath}.backup.${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);
    
    // Apply fix
    fs.writeFileSync(filePath, analysis.fixedCode, 'utf-8');
    
    return true;
  } catch (error) {
    console.error(`Error applying fix to ${filePath}:`, error);
    return false;
  }
}

// Handle reply for approval requests
module.exports.handleReply = async function({ api, event, Users, Threads, Currencies }) {
  const { body, senderID } = event;
  
  if (body.toUpperCase() === "APPROVE") {
    const replyData = global.client.handleReply.find(reply => 
      reply.messageID === event.messageReply.messageID && 
      reply.name === "aifix_approval"
    );
    
    if (replyData && replyData.author === senderID) {
      try {
        await applyFix(replyData.filePath, replyData.analysis);
        
        // Log the approved fix
        const fixLog = {
          timestamp: Date.now(),
          filePath: replyData.filePath,
          severity: replyData.analysis.severity,
          error: replyData.analysis.errorDescription,
          changes: replyData.analysis.changes,
          explanation: replyData.analysis.explanation,
          approvedBy: senderID
        };
        
        global.AI_FIX_SYSTEM.fixHistory.push(fixLog);
        
        api.sendMessage(
          `✅ Đã áp dụng fix cho file:\n${replyData.filePath}\n\n` +
          `${replyData.analysis.explanation}`,
          senderID
        );
        
        // Remove from handleReply
        const index = global.client.handleReply.findIndex(reply => 
          reply.messageID === event.messageReply.messageID
        );
        if (index !== -1) {
          global.client.handleReply.splice(index, 1);
        }
        
      } catch (error) {
        api.sendMessage(`❌ Lỗi khi áp dụng fix: ${error.message}`, senderID);
      }
    }
  }
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const adminIDs = global.config.ADMINBOT || [];
  
  if (!adminIDs.includes(senderID)) {
    return api.sendMessage("⚠️ Chỉ admin mới có thể sử dụng lệnh này!", threadID, messageID);
  }
  
  const action = args[0]?.toLowerCase();
  
  switch (action) {
    case "enable":
      global.AI_FIX_SYSTEM.enabled = true;
      
      // Start periodic scanning
      if (global.AI_FIX_SYSTEM.scanInterval) {
        clearInterval(global.AI_FIX_SYSTEM.scanInterval);
      }
      
      global.AI_FIX_SYSTEM.scanInterval = setInterval(() => {
        if (global.AI_FIX_SYSTEM.enabled) {
          scanAndFixFiles(api, adminIDs);
        }
      }, AI_FIX_CONFIG.scanInterval);
      
      api.sendMessage(
        `✅ AI AUTO-FIX SYSTEM ACTIVATED\n\n` +
        `🤖 DeepSeek AI đã được kích hoạt\n` +
        `⏰ Quét tự động mỗi ${AI_FIX_CONFIG.scanInterval / 60000} phút\n` +
        `📁 Theo dõi: ${AI_FIX_CONFIG.watchPaths.join(', ')}\n` +
        `🛡️ Hệ thống Premium VIP - Kaori Waguri`,
        threadID, messageID
      );
      break;
      
    case "disable":
      global.AI_FIX_SYSTEM.enabled = false;
      
      if (global.AI_FIX_SYSTEM.scanInterval) {
        clearInterval(global.AI_FIX_SYSTEM.scanInterval);
        global.AI_FIX_SYSTEM.scanInterval = null;
      }
      
      api.sendMessage("❌ AI Auto-Fix System đã được tắt", threadID, messageID);
      break;
      
    case "status":
      const lastScanTime = global.AI_FIX_SYSTEM.lastScan 
        ? moment(global.AI_FIX_SYSTEM.lastScan).tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY')
        : "Chưa quét lần nào";
        
      api.sendMessage(
        `📊 AI FIX SYSTEM STATUS\n\n` +
        `🟢 Trạng thái: ${global.AI_FIX_SYSTEM.enabled ? 'HOẠT ĐỘNG' : 'TẮT'}\n` +
        `🕐 Quét lần cuối: ${lastScanTime}\n` +
        `🔧 Tổng fixes: ${global.AI_FIX_SYSTEM.fixHistory.length}\n` +
        `❌ Tổng lỗi: ${global.AI_FIX_SYSTEM.errorLog.length}\n` +
        `⚡ API: DeepSeek Connected\n` +
        `👑 Kaori Waguri Premium VIP`,
        threadID, messageID
      );
      break;
      
    case "scan":
      api.sendMessage("🔍 Bắt đầu quét toàn bộ hệ thống...", threadID, messageID);
      await scanAndFixFiles(api, adminIDs);
      break;
      
    case "logs":
      const recentFixes = global.AI_FIX_SYSTEM.fixHistory.slice(-10);
      let logMessage = "📋 LỊCH SỬ FIX GẦN ĐÂY (10 lần cuối)\n\n";
      
      if (recentFixes.length === 0) {
        logMessage += "Chưa có fix nào được thực hiện";
      } else {
        recentFixes.forEach((fix, index) => {
          const time = moment(fix.timestamp).tz('Asia/Ho_Chi_Minh').format('HH:mm DD/MM');
          logMessage += `${index + 1}. [${fix.severity}] ${time}\n`;
          logMessage += `   📁 ${fix.filePath}\n`;
          logMessage += `   🔧 ${fix.error}\n\n`;
        });
      }
      
      api.sendMessage(logMessage, threadID, messageID);
      break;
      
    default:
      api.sendMessage(
        `🤖 AI AUTO-FIX SYSTEM - KAORI WAGURI\n\n` +
        `📋 Cách sử dụng:\n` +
        `• aifix enable - Kích hoạt hệ thống\n` +
        `• aifix disable - Tắt hệ thống\n` +
        `• aifix status - Xem trạng thái\n` +
        `• aifix scan - Quét ngay lập tức\n` +
        `• aifix logs - Xem lịch sử fixes\n\n` +
        `⚡ Powered by DeepSeek AI\n` +
        `🛡️ Premium VIP System`,
        threadID, messageID
      );
      break;
  }
};

// Auto-initialize when module loads
module.exports.onLoad = function() {
  console.log("AI Auto-Fix System Loaded - Ready for deployment");
  
  // Initialize global state if not exists
  if (!global.AI_FIX_SYSTEM) {
    global.AI_FIX_SYSTEM = {
      enabled: false,
      scanInterval: null,
      fixHistory: [],
      errorLog: [],
      lastScan: null
    };
  }
};
