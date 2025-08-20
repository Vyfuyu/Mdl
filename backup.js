
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const extract = require('extract-zip');

module.exports.config = {
  name: "backup",
  version: "2.0.0", 
  hasPermssion: 2,
  credits: "Kaori Waguri",
  description: "Quản lý backup hệ thống bot - lưu, khôi phục, xóa backup",
  commandCategory: "Admin",
  usages: "[create/restore/list/delete/info] [tên backup]",
  cooldowns: 5
};

module.exports.run = async ({ api, event, args, Threads, Users, Currencies }) => {
  const { threadID, messageID, senderID } = event;
  const backupPath = path.join(__dirname, 'cache/backups');
  
  // Tạo thư mục backup nếu chưa có
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
  }

  const action = args[0]?.toLowerCase();
  const backupName = args[1] || `backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;

  switch (action) {
    case 'create':
    case 'tao':
      return createBackup();
    case 'restore': 
    case 'phuchoi':
      return restoreBackup();
    case 'list':
    case 'ds':
      return listBackups();
    case 'delete':
    case 'xoa':
      return deleteBackup();
    case 'info':
    case 'thongtin':
      return backupInfo();
    case 'clean':
    case 'donep':
      return cleanOldBackups();
    default:
      return api.sendMessage(
        "🗂️ BACKUP SYSTEM - Kaori Waguri\n\n" +
        "📝 Cách sử dụng:\n" +
        "• backup create [tên] - Tạo backup mới\n" +
        "• backup restore [tên] - Khôi phục backup\n" +
        "• backup list - Danh sách backup\n" +
        "• backup delete [tên] - Xóa backup\n" +
        "• backup info [tên] - Thông tin backup\n" +
        "• backup clean - Dọn backup cũ (>7 ngày)\n\n" +
        "💡 Tip: Không cần nhập tên, hệ thống tự tạo tên theo thời gian!",
        threadID, messageID
      );
  }

  async function createBackup() {
    try {
      api.sendMessage("⏳ Đang tạo backup hệ thống...", threadID, messageID);

      const zipPath = path.join(backupPath, `${backupName}.zip`);
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      return new Promise((resolve, reject) => {
        output.on('close', async () => {
          const size = archive.pointer();
          const info = {
            name: backupName,
            created: new Date().toISOString(),
            size: size,
            files: archive.pointer(),
            creator: senderID
          };

          // Lưu thông tin backup
          const infoPath = path.join(backupPath, `${backupName}.json`);
          fs.writeJSONSync(infoPath, info, { spaces: 2 });

          resolve(api.sendMessage(
            `✅ Backup thành công!\n\n` +
            `📁 Tên: ${backupName}\n` +
            `📊 Kích thước: ${formatBytes(size)}\n` +
            `⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}\n` +
            `💾 Lưu tại: /cache/backups/${backupName}.zip`,
            threadID, messageID
          ));
        });

        archive.on('error', reject);
        archive.pipe(output);

        // Backup các thư mục quan trọng
        const foldersToBackup = [
          'modules/commands',
          'modules/events', 
          'utils',
          'languages',
          'Fca_Database'
        ];

        const filesToBackup = [
          'config.json',
          'package.json', 
          'appstate.json',
          'index.js',
          'eddy.js'
        ];

        // Backup folders
        for (const folder of foldersToBackup) {
          if (fs.existsSync(folder)) {
            archive.directory(folder, folder);
          }
        }

        // Backup files
        for (const file of filesToBackup) {
          if (fs.existsSync(file)) {
            archive.file(file, { name: file });
          }
        }

        archive.finalize();
      });

    } catch (error) {
      console.error(error);
      return api.sendMessage("❌ Lỗi khi tạo backup: " + error.message, threadID, messageID);
    }
  }

  async function restoreBackup() {
    if (!args[1]) {
      return api.sendMessage("❌ Vui lòng nhập tên backup cần khôi phục!", threadID, messageID);
    }

    try {
      const zipPath = path.join(backupPath, `${backupName}.zip`);
      const infoPath = path.join(backupPath, `${backupName}.json`);

      if (!fs.existsSync(zipPath)) {
        return api.sendMessage("❌ Backup không tồn tại!", threadID, messageID);
      }

      api.sendMessage("⏳ Đang khôi phục backup...\n⚠️ Bot sẽ restart sau khi hoàn thành!", threadID, messageID);

      // Tạo backup hiện tại trước khi restore
      const currentBackupName = `pre_restore_${Date.now()}`;
      await module.exports.run({ api, event: { ...event, args: ['create', currentBackupName] }, args: ['create', currentBackupName] });

      // Extract backup
      await extract(zipPath, { dir: process.cwd() });

      // Đọc thông tin backup
      let info = {};
      if (fs.existsSync(infoPath)) {
        info = fs.readJSONSync(infoPath);
      }

      api.sendMessage(
        `✅ Khôi phục thành công!\n\n` +
        `📁 Backup: ${backupName}\n` +
        `📅 Tạo lúc: ${info.created ? new Date(info.created).toLocaleString('vi-VN') : 'Không xác định'}\n` +
        `🔄 Bot sẽ tự restart trong 5 giây...`,
        threadID, () => {
          setTimeout(() => {
            process.exit(1);
          }, 5000);
        }, messageID
      );

    } catch (error) {
      console.error(error);
      return api.sendMessage("❌ Lỗi khi khôi phục: " + error.message, threadID, messageID);
    }
  }

  function listBackups() {
    try {
      const backups = fs.readdirSync(backupPath)
        .filter(file => file.endsWith('.zip'))
        .map(file => {
          const name = file.replace('.zip', '');
          const zipPath = path.join(backupPath, file);
          const infoPath = path.join(backupPath, `${name}.json`);
          const stats = fs.statSync(zipPath);
          
          let info = { created: stats.birthtime.toISOString(), size: stats.size };
          if (fs.existsSync(infoPath)) {
            info = { ...info, ...fs.readJSONSync(infoPath) };
          }
          
          return { name, ...info };
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created));

      if (backups.length === 0) {
        return api.sendMessage("📂 Chưa có backup nào được tạo!", threadID, messageID);
      }

      let message = `📋 DANH SÁCH BACKUP (${backups.length})\n\n`;
      
      backups.forEach((backup, index) => {
        const date = new Date(backup.created).toLocaleString('vi-VN');
        const size = formatBytes(backup.size);
        message += `${index + 1}. 📁 ${backup.name}\n`;
        message += `   ⏰ ${date}\n`;
        message += `   📊 ${size}\n\n`;
      });

      message += "💡 Dùng: backup restore [tên] để khôi phục";

      return api.sendMessage(message, threadID, messageID);

    } catch (error) {
      return api.sendMessage("❌ Lỗi khi đọc danh sách backup!", threadID, messageID);
    }
  }

  function deleteBackup() {
    if (!args[1]) {
      return api.sendMessage("❌ Vui lòng nhập tên backup cần xóa!", threadID, messageID);
    }

    try {
      const zipPath = path.join(backupPath, `${backupName}.zip`);
      const infoPath = path.join(backupPath, `${backupName}.json`);

      if (!fs.existsSync(zipPath)) {
        return api.sendMessage("❌ Backup không tồn tại!", threadID, messageID);
      }

      fs.removeSync(zipPath);
      if (fs.existsSync(infoPath)) {
        fs.removeSync(infoPath);
      }

      return api.sendMessage(`✅ Đã xóa backup: ${backupName}`, threadID, messageID);

    } catch (error) {
      return api.sendMessage("❌ Lỗi khi xóa backup: " + error.message, threadID, messageID);
    }
  }

  function backupInfo() {
    if (!args[1]) {
      return api.sendMessage("❌ Vui lòng nhập tên backup!", threadID, messageID);
    }

    try {
      const zipPath = path.join(backupPath, `${backupName}.zip`);
      const infoPath = path.join(backupPath, `${backupName}.json`);

      if (!fs.existsSync(zipPath)) {
        return api.sendMessage("❌ Backup không tồn tại!", threadID, messageID);
      }

      const stats = fs.statSync(zipPath);
      let info = {
        name: backupName,
        created: stats.birthtime.toISOString(),
        size: stats.size,
        modified: stats.mtime.toISOString()
      };

      if (fs.existsSync(infoPath)) {
        info = { ...info, ...fs.readJSONSync(infoPath) };
      }

      let message = `📊 THÔNG TIN BACKUP\n\n`;
      message += `📁 Tên: ${info.name}\n`;
      message += `📅 Tạo lúc: ${new Date(info.created).toLocaleString('vi-VN')}\n`;
      message += `📊 Kích thước: ${formatBytes(info.size)}\n`;
      message += `👤 Người tạo: ${info.creator || 'Không xác định'}\n`;
      message += `🔄 Sửa cuối: ${new Date(info.modified).toLocaleString('vi-VN')}`;

      return api.sendMessage(message, threadID, messageID);

    } catch (error) {
      return api.sendMessage("❌ Lỗi khi đọc thông tin backup!", threadID, messageID);
    }
  }

  function cleanOldBackups() {
    try {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const backups = fs.readdirSync(backupPath).filter(file => file.endsWith('.zip'));
      let deletedCount = 0;

      for (const backup of backups) {
        const backupPath_ = path.join(backupPath, backup);
        const stats = fs.statSync(backupPath_);
        
        if (stats.birthtime.getTime() < sevenDaysAgo) {
          const name = backup.replace('.zip', '');
          const infoPath = path.join(backupPath, `${name}.json`);
          
          fs.removeSync(backupPath_);
          if (fs.existsSync(infoPath)) {
            fs.removeSync(infoPath);
          }
          deletedCount++;
        }
      }

      return api.sendMessage(
        `🧹 Dọn dẹp hoàn tất!\n📦 Đã xóa ${deletedCount} backup cũ (>7 ngày)`,
        threadID, messageID
      );

    } catch (error) {
      return api.sendMessage("❌ Lỗi khi dọn dẹp backup!", threadID, messageID);
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};
