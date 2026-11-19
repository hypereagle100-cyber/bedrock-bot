const express = require('express');
const bedrock = require('bedrock-protocol');
const fs = require('fs');

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Rejection:', reason);
});

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5 Bedrock Accounts (Bot 1 to Bot 5)
const botsConfig = [];
for (let i = 1; i <= 5; i++) {
  botsConfig.push({
    id: i,
    username: `hyper.eagle${49 + i}@outlook.com`,
    folder: `./profiles/bot${i}`
  });
}

// Ensure profile directories exist for Microsoft token caching
botsConfig.forEach(cfg => {
  if (!fs.existsSync(cfg.folder)) {
    fs.mkdirSync(cfg.folder, { recursive: true });
  }
});

const activeBots = {};          // Stores active bedrock-protocol client instances
const botSpawned = {};          // Tracks if the bot reached the world/spawn state
const botEnabled = {};          // Tracks if a bot is authorized to run
const botLoginData = {};        // Stores active Microsoft MSA verification URIs and user codes

let currentHost = 'og-donutsmp.net';
let currentPort = 19132;

// ==========================================
// WEB DASHBOARD INTERFACE
// ==========================================
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>OG-DonutSMP Bot Command Center</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap');

        body {
          margin: 0;
          padding: 30px;
          font-family: 'Poppins', sans-serif;
          color: #fff;
          text-align: center;
          min-height: 100vh;
          overflow-x: hidden;
          background-color: #080c14;
        }

        .mesh-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: -1;
          background-color: #080c14;
          overflow: hidden;
        }

        .blob {
          position: absolute;
          filter: blur(90px);
          opacity: 0.6;
          animation: floatBlob 14s ease-in-out infinite alternate;
        }

        .blob-1 {
          width: 550px;
          height: 550px;
          background: #38bdf8;
          top: -15%;
          left: -10%;
          animation-duration: 16s;
        }

        .blob-2 {
          width: 600px;
          height: 600px;
          background: #f43f5e;
          bottom: -20%;
          right: -10%;
          animation-duration: 20s;
          animation-delay: -4s;
        }

        .blob-3 {
          width: 450px;
          height: 450px;
          background: #10b981;
          top: 25%;
          left: 40%;
          animation-duration: 12s;
          animation-delay: -2s;
          opacity: 0.5;
        }

        @keyframes floatBlob {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(90px, 70px) scale(1.2); }
          100% { transform: translate(-70px, -50px) scale(0.85); }
        }

        h1 {
          color: #f8fafc;
          font-weight: 800;
          font-size: 2.8rem;
          margin-bottom: 5px;
          text-shadow: 0 0 25px rgba(56, 189, 248, 0.5);
          letter-spacing: -0.5px;
        }

        p.subtitle {
          color: #94a3b8;
          font-size: 1.05rem;
          margin-bottom: 30px;
        }

        .config-bar {
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(16px);
          padding: 14px 24px;
          border-radius: 14px;
          width: 440px;
          margin: 0 auto 20px auto;
          display: flex;
          justify-content: space-around;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        }

        .config-bar input {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid #475569;
          color: #38bdf8;
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 600;
          outline: none;
          width: 145px;
          text-align: center;
        }

        .global-btns {
          margin: 20px 0 35px 0;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          max-width: 1150px;
          margin: 0 auto;
        }

        @media (max-width: 900px) {
          .grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 600px) {
          .grid { grid-template-columns: 1fr; }
          .config-bar { width: 92%; flex-direction: column; gap: 10px; }
        }

        .card {
          background: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(16px);
          padding: 22px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          text-align: left;
          box-shadow: 0 12px 30px rgba(0,0,0,0.4);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }

        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(56, 189, 248, 0.25);
          border-color: rgba(56, 189, 248, 0.5);
        }

        .card h3 {
          margin-top: 0;
          margin-bottom: 6px;
          color: #f8fafc;
          font-size: 1.2rem;
        }

        .card p {
          margin: 6px 0 10px 0;
          font-size: 0.82rem;
          color: #94a3b8;
          word-break: break-all;
        }

        .login-box {
          background: rgba(15, 23, 42, 0.85);
          padding: 12px;
          margin: 12px 0;
          border-radius: 10px;
          border: 1px solid #38bdf8;
          font-size: 0.78rem;
        }

        .login-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 8px;
          gap: 8px;
        }

        .login-box a {
          color: #38bdf8;
          font-weight: bold;
          text-decoration: underline;
        }

        .login-code {
          color: #f43f5e;
          font-size: 1rem;
          font-weight: bold;
          background: #1e293b;
          padding: 2px 8px;
          border-radius: 6px;
          display: inline-block;
          letter-spacing: 1px;
        }

        .btn-copy {
          background: #38bdf8;
          color: #080c14;
          padding: 4px 10px;
          font-size: 0.75rem;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          border: none;
          white-space: nowrap;
          transition: background 0.2s;
        }

        .btn-copy:hover {
          background: #0ea5e9;
        }

        button {
          padding: 10px 16px;
          cursor: pointer;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.85rem;
          transition: filter 0.2s, transform 0.1s;
        }

        button:active {
          transform: scale(0.95);
        }

        .btn-connect { background: #22c55e; color: white; flex: 1; box-shadow: 0 4px 12px rgba(34,197,94,0.3); }
        .btn-connect:hover { background: #16a34a; }

        .btn-disconnect { background: #ef4444; color: white; flex: 1; box-shadow: 0 4px 12px rgba(239,68,68,0.3); }
        .btn-disconnect:hover { background: #dc2626; }

        .btn-row { display: flex; gap: 10px; margin-top: auto; }

        .btn-global-connect {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
          padding: 12px 26px;
          font-size: 0.95rem;
          margin-right: 12px;
          border-radius: 10px;
          border: none;
          font-weight: 600;
          box-shadow: 0 6px 20px rgba(34,197,94,0.4);
        }

        .btn-global-disconnect {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          padding: 12px 26px;
          font-size: 0.95rem;
          border-radius: 10px;
          border: none;
          font-weight: 600;
          box-shadow: 0 6px 20px rgba(239,68,68,0.4);
        }

        .status-online { color: #4ade80; font-weight: bold; text-shadow: 0 0 10px rgba(74,222,128,0.4); }
        .status-offline { color: #f87171; font-weight: bold; }
        .status-awaiting { color: #fbbf24; font-weight: bold; }
        .status-connecting { color: #38bdf8; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="mesh-bg">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
      </div>

      <h1>⚡ OG-DonutSMP Bot Dashboard</h1>
      <p class="subtitle">Managing 5 Bedrock Accounts on og-donutsmp.net:19132</p>

      <div class="config-bar">
        <div>Server IP: <input type="text" id="serverIp" value="og-donutsmp.net"></div>
        <div>Port: <input type="text" id="serverPort" value="19132"></div>
      </div>

      <div class="global-btns">
        <button class="btn-global-connect" onclick="controlAll('connect')">Connect All Accounts</button>
        <button class="btn-global-disconnect" onclick="controlAll('disconnect')">Disconnect All Accounts</button>
      </div>

      <div class="grid" id="botGrid"></div>

      <script>
        const bots = ${JSON.stringify(botsConfig)};

        function renderCards() {
          const grid = document.getElementById('botGrid');
          grid.innerHTML = '';

          bots.forEach(bot => {
            grid.innerHTML += \`
              <div class="card" id="card-\${bot.id}">
                <div>
                  <h3>Bot \${bot.id}</h3>
                  <p>\${bot.username} <br>Status: <span id="status-\${bot.id}" class="status-offline">Offline</span></p>
                  <div id="login-\${bot.id}"></div>
                </div>
                <div class="btn-row">
                  <button class="btn-connect" onclick="botAction(\${bot.id}, 'connect')">Connect</button>
                  <button class="btn-disconnect" onclick="botAction(\${bot.id}, 'disconnect')">Disconnect</button>
                </div>
              </div>
            \`;
          });
        }

        async function fetchStatus() {
          try {
            const res = await fetch('/status');
            const data = await res.json();

            bots.forEach(bot => {
              const info = data[bot.id] || { status: 'Offline', verification_uri: null, user_code: null };
              const statusEl = document.getElementById('status-' + bot.id);
              const loginEl = document.getElementById('login-' + bot.id);

              if (statusEl) {
                let statusClass = 'status-offline';
                if (info.status === 'Online') statusClass = 'status-online';
                else if (info.status === 'Awaiting Login') statusClass = 'status-awaiting';
                else if (info.status === 'Connecting...') statusClass = 'status-connecting';

                statusEl.innerText = info.status;
                statusEl.className = statusClass;
              }

              if (loginEl) {
                if (info.user_code && info.verification_uri) {
                  loginEl.innerHTML = \`
                    <div class="login-box">
                      🔑 <b>Login Required:</b>
                      <div class="login-row">
                        🔗 <a href="\${info.verification_uri}" target="_blank">Open Microsoft Link</a>
                        <button class="btn-copy" onclick="copyText('\${info.verification_uri}', this)">Copy Link</button>
                      </div>
                      <div class="login-row">
                        <span>Code: <span class="login-code">\${info.user_code}</span></span>
                        <button class="btn-copy" onclick="copyText('\${info.user_code}', this)">Copy Code</button>
                      </div>
                    </div>
                  \`;
                } else {
                  loginEl.innerHTML = '';
                }
              }
            });
          } catch (e) {}
        }

        function copyText(text, btn) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
              showCopied(btn);
            }).catch(() => {
              fallbackCopy(text, btn);
            });
          } else {
            fallbackCopy(text, btn);
          }
        }

        function fallbackCopy(text, btn) {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          try {
            document.execCommand('copy');
            showCopied(btn);
          } catch (err) {}
          document.body.removeChild(textarea);
        }

        function showCopied(btn) {
          const original = btn.innerText;
          btn.innerText = 'Copied!';
          btn.style.background = '#22c55e';
          btn.style.color = '#fff';
          setTimeout(() => {
            btn.innerText = original;
            btn.style.background = '#38bdf8';
            btn.style.color = '#080c14';
          }, 2000);
        }

        async function botAction(id, action) {
          const host = document.getElementById('serverIp').value;
          const port = document.getElementById('serverPort').value;
          await fetch('/bot/' + id + '/' + action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port })
          });
          fetchStatus();
        }

        async function controlAll(action) {
          const host = document.getElementById('serverIp').value;
          const port = document.getElementById('serverPort').value;
          await fetch('/bots/' + action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port })
          });
          fetchStatus();
        }

        renderCards();
        fetchStatus();
        setInterval(fetchStatus, 3000);
      </script>
    </body>
    </html>
  `);
});

app.get('/status', (req, res) => {
  const status = {};
  botsConfig.forEach(bot => {
    let stat = 'Offline';
    if (botSpawned[bot.id]) {
      stat = 'Online';
    } else if (botLoginData[bot.id]) {
      stat = 'Awaiting Login';
    } else if (activeBots[bot.id]) {
      stat = 'Connecting...';
    }

    status[bot.id] = {
      status: stat,
      verification_uri: botLoginData[bot.id]?.verification_uri || null,
      user_code: botLoginData[bot.id]?.user_code || null
    };
  });
  res.json(status);
});

function cleanupBot(id) {
  if (activeBots[id]) {
    try {
      activeBots[id].removeAllListeners();
      activeBots[id].close();
    } catch (e) {}
    delete activeBots[id];
  }
  botSpawned[id] = false;
  delete botLoginData[id];
}

function startBot(botInfo, host, port) {
  const id = botInfo.id;
  cleanupBot(id);

  currentHost = host || currentHost;
  currentPort = parseInt(port, 10) || currentPort;

  botEnabled[id] = true;
  botSpawned[id] = false;
  botLoginData[id] = null;
  console.log(`🚀 Connecting Bot ${id} (${botInfo.username}) to ${currentHost}:${currentPort}...`);

  try {
    const client = bedrock.createClient({
      host: currentHost,
      port: currentPort,
      username: botInfo.username,
      offline: false,
      connectTimeout: 120000,
      profilesFolder: botInfo.folder,
      onMsaCode: (data) => {
        botLoginData[id] = data;
        console.log(`\n=== MICROSOFT LOGIN FOR BOT ${id} (${botInfo.username}) ===`);
        console.log(`🔗 Link: ${data.verification_uri}`);
        console.log(`🔢 Code: ${data.user_code}`);
        console.log('==================================================\n');
      }
    });

    activeBots[id] = client;

    const markOnline = () => {
      if (!botSpawned[id]) {
        console.log(`✅ Bot ${id} (${botInfo.username}) successfully entered the world!`);
        botSpawned[id] = true;
        botLoginData[id] = null;
      }
    };

    client.on('connect', markOnline);
    client.on('session', markOnline);
    client.on('spawn', markOnline);
    client.on('join', markOnline);
    client.on('packet', (packet) => {
      if (['play_status', 'start_game', 'set_time', 'chunk_radius_update'].includes(packet.name)) {
        markOnline();
      }
    });

    client.on('error', (err) => {
      if (!err.message.includes('Invalid tag') && !err.message.includes('Read error for undefined')) {
        console.error(`⚠️ Bot ${id} error:`, err.message);
      }
    });

    client.on('close', () => {
      console.log(`🔌 Bot ${id} disconnected.`);
      cleanupBot(id);
    });
  } catch (e) {
    console.error(`❌ Failed to start Bot ${id}:`, e.message);
    cleanupBot(id);
  }
}

// Sequential auto-reconnect loop across Bots 1 to 5
async function runAutoConnectLoop() {
  while (true) {
    for (let i = 0; i < botsConfig.length; i++) {
      const botInfo = botsConfig[i];
      const id = botInfo.id;

      if (botEnabled[id]) {
        if (!botSpawned[id] && !activeBots[id] && !botLoginData[id]) {
          console.log(`🔄 [Loop] Bot ${id} is offline. Reconnecting...`);
          startBot(botInfo, currentHost, currentPort);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 6000));
    }
  }
}

app.post('/bot/:id/:action', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const action = req.params.action;
  const { host, port } = req.body;
  const botInfo = botsConfig.find(b => b.id === id);

  if (!botInfo) return res.status(404).json({ error: 'Bot not found' });
  currentHost = host || currentHost;
  currentPort = parseInt(port, 10) || currentPort;

  if (action === 'connect') {
    botEnabled[id] = true;
    startBot(botInfo, currentHost, currentPort);
  } else if (action === 'disconnect') {
    botEnabled[id] = false;
    cleanupBot(id);
    console.log(`🛑 Bot ${id} manually disconnected.`);
  }

  res.json({ success: true });
});

app.post('/bots/:action', (req, res) => {
  const action = req.params.action;
  const { host, port } = req.body;

  currentHost = host || currentHost;
  currentPort = parseInt(port, 10) || currentPort;

  if (action === 'connect') {
    botsConfig.forEach(botInfo => {
      botEnabled[botInfo.id] = true;
    });
    console.log('🚀 Connect All triggered. Sequential loop handling connections.');
  } else if (action === 'disconnect') {
    botsConfig.forEach(botInfo => {
      const id = botInfo.id;
      botEnabled[id] = false;
      cleanupBot(id);
    });
    console.log('🛑 Disconnect All triggered. All bots disabled.');
  }

  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Dashboard running on port ${PORT}`);
  runAutoConnectLoop();
});
