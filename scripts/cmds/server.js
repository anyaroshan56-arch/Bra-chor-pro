const os = require("os");
const fs = require("fs");

function fmtBytes(b) {
  if (!b || b < 0) return "0 MB";
  const mb = b / 1048576;
  if (mb >= 1024) return (mb / 1073741824).toFixed(2) + " GB";
  return mb.toFixed(1) + " MB";
}

function fmtTime(sec) {
  sec = Math.floor(sec);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return (d ? d + "d " : "") + (h ? h + "h " : "") + m + "m " + s + "s";
}

function readNum(file) {
  try {
    const v = fs.readFileSync(file, "utf8").trim();
    if (v === "max") return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  } catch (e) {
    return null;
  }
}

function containerMemory() {
  let usage = process.memoryUsage().rss;
  let limit = os.totalmem();
  try {
    if (fs.existsSync("/sys/fs/cgroup/memory.current")) {
      const cur = readNum("/sys/fs/cgroup/memory.current");
      if (cur) usage = cur;
    }
    if (fs.existsSync("/sys/fs/cgroup/memory.max")) {
      const max = readNum("/sys/fs/cgroup/memory.max");
      if (max) limit = max;
    }
  } catch (e) {}
  return { usage, limit };
}

async function statusText() {
  const mem = containerMemory();
  const freeMem = mem.limit - mem.usage;
  const uptime = fmtTime(os.uptime());
  const cpuLoad = os.loadavg();
  
  return [
    "=== SYSTEM STATUS ===",
    "RAM Usage: " + fmtBytes(mem.usage) + " / " + fmtBytes(mem.limit),
    "Free RAM: " + fmtBytes(freeMem),
    "CPU Cores: " + os.cpus().length,
    "Load Average: " + cpuLoad[0].toFixed(2),
    "Uptime: " + uptime,
    "Platform: " + os.platform() + " " + os.release()
  ].join("\n");
}

async function pingText() {
  const start = Date.now();
  return "Pong: " + (Date.now() - start) + "ms";
}

module.exports = {
  config: {
    name: "server",
    version: "2.0.0",
    role: 0,
    author: "Mr.King",
    description: { en: "Server status, ping and restart" },
    category: "system",
    guide: {
      en: "{pn} -> status\n{pn} ping -> ping\n{pn} restart -> restart (admin only)"
    }
  },

  onStart: async function ({ message, args, role }) {
    const sub = (args[0] || "").toLowerCase();

    if (sub === "ping") {
      return message.reply(await pingText());
    }

    if (sub === "restart") {
      if (role < 2) return message.reply("Shudhu admin restart korte parbe.");
      await message.reply("Restart hocche... ektu opekkha koro.");
      setTimeout(() => process.exit(2), 1500);
      return;
    }

    try {
      return message.reply(await statusText());
    } catch (e) {
      return message.reply("Status ana jayni: " + e.message);
    }
  }
};
