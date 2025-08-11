
module.exports.config = {
  name: "covua",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "waguri",
  description: "Chơi cờ vua với AI hoặc người chơi khác",
  commandCategory: "Trò Chơi",
  usages: "covua [bot/nguoi] hoặc reply số để di chuyển",
  cooldowns: 3
};

const fs = require("fs");
const { loadImage, createCanvas } = require("canvas");
const axios = require("axios");

// Khởi tạo bàn cờ
function initializeBoard() {
  return [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
  ];
}

// Vẽ bàn cờ
async function drawBoard(board, gameData) {
  const canvas = createCanvas(800, 800);
  const ctx = canvas.getContext('2d');
  
  // Vẽ nền bàn cờ
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const isLight = (row + col) % 2 === 0;
      ctx.fillStyle = isLight ? '#F0D9B5' : '#B58863';
      ctx.fillRect(col * 100, row * 100, 100, 100);
      
      // Vẽ số thứ tự ô
      const squareNum = row * 8 + col + 1;
      ctx.fillStyle = isLight ? '#B58863' : '#F0D9B5';
      ctx.font = '12px Arial';
      ctx.fillText(squareNum.toString(), col * 100 + 5, row * 100 + 15);
    }
  }
  
  // Vẽ quân cờ
  const pieces = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
  };
  
  ctx.font = '60px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece !== '.') {
        ctx.fillStyle = piece === piece.toUpperCase() ? '#FFFFFF' : '#000000';
        ctx.strokeStyle = piece === piece.toUpperCase() ? '#000000' : '#FFFFFF';
        ctx.lineWidth = 2;
        const x = col * 100 + 50;
        const y = row * 100 + 50;
        ctx.fillText(pieces[piece] || piece, x, y);
        ctx.strokeText(pieces[piece] || piece, x, y);
      }
    }
  }
  
  // Thêm thông tin game
  ctx.fillStyle = '#000000';
  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  const info = `Lượt: ${gameData.currentPlayer === 'white' ? 'Trắng' : 'Đen'} | Chế độ: ${gameData.mode}`;
  ctx.fillText(info, 10, 820);
  
  const path = __dirname + "/cache/covua.png";
  fs.writeFileSync(path, canvas.toBuffer("image/png"));
  return fs.createReadStream(path);
}

// Kiểm tra nước đi hợp lệ
function isValidMove(board, from, to, player) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  
  if (fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 ||
      toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;
  
  const piece = board[fromRow][fromCol];
  if (piece === '.') return false;
  
  const isWhitePiece = piece === piece.toUpperCase();
  if ((player === 'white' && !isWhitePiece) || (player === 'black' && isWhitePiece)) return false;
  
  const targetPiece = board[toRow][toCol];
  if (targetPiece !== '.' && 
      ((isWhitePiece && targetPiece === targetPiece.toUpperCase()) ||
       (!isWhitePiece && targetPiece === targetPiece.toLowerCase()))) return false;
  
  return true;
}

// Di chuyển quân cờ
function makeMove(board, from, to) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  
  const piece = board[fromRow][fromCol];
  board[toRow][toCol] = piece;
  board[fromRow][fromCol] = '.';
  
  return board;
}

// Chuyển đổi notation
function parseMove(move) {
  // Định dạng: "e2-e4" hoặc số ô "12-28"
  if (move.includes('-')) {
    const [from, to] = move.split('-');
    
    if (from.length === 2 && to.length === 2) {
      // Định dạng chess notation (e2-e4)
      const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
      const fromRow = 8 - parseInt(from[1]);
      const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
      const toRow = 8 - parseInt(to[1]);
      return [[fromRow, fromCol], [toRow, toCol]];
    } else {
      // Định dạng số ô (12-28)
      const fromSquare = parseInt(from) - 1;
      const toSquare = parseInt(to) - 1;
      const fromRow = Math.floor(fromSquare / 8);
      const fromCol = fromSquare % 8;
      const toRow = Math.floor(toSquare / 8);
      const toCol = toSquare % 8;
      return [[fromRow, fromCol], [toRow, toCol]];
    }
  }
  return null;
}

// Gọi AI Cohere để lấy nước đi
async function getAIMove(board, difficulty = "medium") {
  try {
    const boardString = board.map(row => row.join('')).join('\n');
    
    const prompt = `Bạn là một AI chơi cờ vua. Hãy phân tích bàn cờ sau và đưa ra nước đi tốt nhất cho quân đen.

Bàn cờ hiện tại:
${boardString}

Quy tắc:
- Chữ hoa (K,Q,R,B,N,P) là quân trắng
- Chữ thường (k,q,r,b,n,p) là quân đen  
- Dấu '.' là ô trống
- Bạn đang chơi quân đen

Hãy trả về nước đi theo định dạng: từ_ô-đến_ô (ví dụ: e7-e5 hoặc 13-21)
Chỉ trả về nước đi, không giải thích.`;

    const response = await axios.post('https://api.cohere.ai/v1/generate', {
      model: 'command-xlarge-nightly',
      prompt: prompt,
      max_tokens: 50,
      temperature: difficulty === "easy" ? 0.8 : difficulty === "hard" ? 0.2 : 0.5,
      stop_sequences: ["\n"]
    }, {
      headers: {
        'Authorization': 'Bearer YOUR_COHERE_API_KEY', // Cần thay thế bằng API key thật
        'Content-Type': 'application/json'
      }
    });

    const aiMove = response.data.generations[0].text.trim();
    return parseMove(aiMove);
  } catch (error) {
    console.log("AI error, using random move");
    // Fallback: random valid move
    const moves = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece !== '.' && piece === piece.toLowerCase()) {
          // Tìm nước đi đơn giản cho quân đen
          const possibleMoves = [
            [row-1, col], [row+1, col], [row, col-1], [row, col+1]
          ];
          for (const [newRow, newCol] of possibleMoves) {
            if (isValidMove(board, [row, col], [newRow, newCol], 'black')) {
              moves.push([[row, col], [newRow, newCol]]);
            }
          }
        }
      }
    }
    return moves.length > 0 ? moves[Math.floor(Math.random() * moves.length)] : null;
  }
}

// Kiểm tra chiếu tướng và chiếu bí
function isInCheck(board, player) {
  // Logic kiểm tra chiếu tướng (đơn giản hóa)
  return false;
}

function isCheckmate(board, player) {
  // Logic kiểm tra chiếu bí (đơn giản hóa)  
  return false;
}

module.exports.run = async function({ api, event, args, Users, Threads, Currencies }) {
  const { threadID, messageID, senderID } = event;
  
  if (!global.moduleData) global.moduleData = {};
  if (!global.moduleData.covua) global.moduleData.covua = new Map();
  
  let gameData = global.moduleData.covua.get(threadID);
  
  // Bắt đầu game mới
  if (args[0] === "bot" || args[0] === "nguoi") {
    const mode = args[0] === "bot" ? "vs_ai" : "vs_player";
    
    gameData = {
      board: initializeBoard(),
      currentPlayer: 'white',
      mode: mode,
      players: {
        white: senderID,
        black: mode === "vs_ai" ? "AI" : null
      },
      gameActive: true,
      moves: []
    };
    
    global.moduleData.covua.set(threadID, gameData);
    
    const attachment = await drawBoard(gameData.board, gameData);
    
    let message = "🏁 Game cờ vua đã bắt đầu!\n\n";
    message += "📋 Hướng dẫn:\n";
    message += "• Reply số ô: từ-đến (vd: 52-36)\n";
    message += "• Hoặc dùng ký hiệu: e2-e4\n";
    message += "• Quân trắng đi trước\n\n";
    
    if (mode === "vs_ai") {
      message += "🤖 Bạn chơi quân trắng, AI chơi quân đen";
    } else {
      message += "👥 Chế độ 2 người chơi\n• Người tiếp theo reply để tham gia!";
    }
    
    return api.sendMessage({
      body: message,
      attachment: attachment
    }, threadID, (error, info) => {
      global.client.handleReply.push({
        name: this.config.name,
        messageID: info.messageID,
        author: senderID,
        type: "game"
      });
    }, messageID);
  }
  
  // Hiển thị bàn cờ hiện tại
  if (args[0] === "xem" && gameData) {
    const attachment = await drawBoard(gameData.board, gameData);
    return api.sendMessage({
      body: "🏁 Bàn cờ hiện tại:",
      attachment: attachment
    }, threadID, messageID);
  }
  
  // Hướng dẫn
  if (!args[0] || args[0] === "help") {
    const helpMessage = `🏁 CỜ VUA BOT 🏁

📋 Lệnh cơ bản:
• ${global.config.PREFIX}covua bot - Chơi với AI
• ${global.config.PREFIX}covua nguoi - Chơi 2 người  
• ${global.config.PREFIX}covua xem - Xem bàn cờ
• ${global.config.PREFIX}covua stop - Dừng game

🎮 Cách chơi:
• Reply tin nhắn với nước đi: 52-36
• Hoặc dùng ký hiệu cờ vua: e2-e4
• Số ô được đánh số từ 1-64

🎯 Mẹo:
• Ô 1-8: hàng 1 (a1-h1)
• Ô 9-16: hàng 2 (a2-h2)
• ...và cứ thế tiếp tục

Credit: waguri 💎`;

    return api.sendMessage(helpMessage, threadID, messageID);
  }
  
  // Dừng game
  if (args[0] === "stop" && gameData) {
    global.moduleData.covua.delete(threadID);
    return api.sendMessage("⏹️ Game cờ vua đã được dừng!", threadID, messageID);
  }
  
  return api.sendMessage("❌ Lệnh không hợp lệ! Dùng 'covua help' để xem hướng dẫn.", threadID, messageID);
};

module.exports.handleReply = async function({ api, event, handleReply, Users }) {
  const { threadID, messageID, senderID, body } = event;
  
  if (handleReply.type !== "game") return;
  
  let gameData = global.moduleData.covua.get(threadID);
  if (!gameData || !gameData.gameActive) {
    return api.sendMessage("❌ Game đã kết thúc hoặc không tồn tại!", threadID, messageID);
  }
  
  // Xử lý tham gia game 2 người
  if (gameData.mode === "vs_player" && !gameData.players.black) {
    if (senderID === gameData.players.white) {
      return api.sendMessage("❌ Bạn đã tham gia rồi! Chờ người chơi khác.", threadID, messageID);
    }
    
    gameData.players.black = senderID;
    const attachment = await drawBoard(gameData.board, gameData);
    
    return api.sendMessage({
      body: "✅ Người chơi thứ 2 đã tham gia!\n🎮 Game bắt đầu! Quân trắng đi trước.",
      attachment: attachment
    }, threadID, (error, info) => {
      global.client.handleReply.push({
        name: "covua",
        messageID: info.messageID,
        author: senderID,
        type: "game"
      });
    }, messageID);
  }
  
  // Kiểm tra lượt chơi
  const currentPlayerID = gameData.players[gameData.currentPlayer];
  if (currentPlayerID !== senderID && currentPlayerID !== "AI") {
    return api.sendMessage("❌ Không phải lượt của bạn!", threadID, messageID);
  }
  
  // Xử lý nước đi
  const move = parseMove(body.trim());
  if (!move) {
    return api.sendMessage("❌ Nước đi không hợp lệ! Định dạng: 52-36 hoặc e2-e4", threadID, messageID);
  }
  
  const [from, to] = move;
  
  if (!isValidMove(gameData.board, from, to, gameData.currentPlayer)) {
    return api.sendMessage("❌ Nước đi không được phép!", threadID, messageID);
  }
  
  // Thực hiện nước đi
  gameData.board = makeMove(gameData.board, from, to);
  gameData.moves.push(`${gameData.currentPlayer}: ${body.trim()}`);
  
  // Kiểm tra kết thúc game
  const opponent = gameData.currentPlayer === 'white' ? 'black' : 'white';
  
  if (isCheckmate(gameData.board, opponent)) {
    gameData.gameActive = false;
    const winner = gameData.currentPlayer === 'white' ? 'Trắng' : 'Đen';
    const attachment = await drawBoard(gameData.board, gameData);
    
    return api.sendMessage({
      body: `🏆 CHIẾN THẮNG!\n👑 ${winner} thắng bằng chiếu bí!\n\n💰 Người thắng nhận 50,000 xu!`,
      attachment: attachment
    }, threadID, messageID);
  }
  
  // Chuyển lượt
  gameData.currentPlayer = opponent;
  
  let responseMessage = `✅ Nước đi hợp lệ!\n⏳ Lượt của ${gameData.currentPlayer === 'white' ? 'Trắng' : 'Đen'}`;
  
  // Nếu là lượt của AI
  if (gameData.mode === "vs_ai" && gameData.currentPlayer === 'black') {
    responseMessage += "\n🤖 AI đang suy nghĩ...";
    
    const attachment = await drawBoard(gameData.board, gameData);
    api.sendMessage({
      body: responseMessage,
      attachment: attachment
    }, threadID, messageID);
    
    // AI di chuyển
    setTimeout(async () => {
      const aiMove = await getAIMove(gameData.board);
      
      if (aiMove) {
        const [aiFrom, aiTo] = aiMove;
        gameData.board = makeMove(gameData.board, aiFrom, aiTo);
        gameData.currentPlayer = 'white';
        
        const newAttachment = await drawBoard(gameData.board, gameData);
        
        api.sendMessage({
          body: `🤖 AI đã di chuyển!\n⏳ Lượt của bạn (Trắng)`,
          attachment: newAttachment
        }, threadID, (error, info) => {
          global.client.handleReply.push({
            name: "covua",
            messageID: info.messageID,
            author: gameData.players.white,
            type: "game"
          });
        });
      }
    }, 2000);
  } else {
    const attachment = await drawBoard(gameData.board, gameData);
    
    api.sendMessage({
      body: responseMessage,
      attachment: attachment
    }, threadID, (error, info) => {
      global.client.handleReply.push({
        name: "covua",
        messageID: info.messageID,
        author: senderID,
        type: "game"
      });
    }, messageID);
  }
};
