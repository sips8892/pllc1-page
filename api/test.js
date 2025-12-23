// api/test.js - SINGLE FILE, NO vercel.json needed
// Access directly at /api/test - serves BOTH UI and API

const { createClient } = require('xmlrpc');

const ODOO_CONFIG = {
  url: 'https://activepieces-odoo.t4stfh.easypanel.host',
  db: 'Dbone',
  username: process.env.ODUSERNAME,
  password: process.env.ODPASSWORD
};

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Serve UI for browser requests
  if (req.method === 'GET' && !req.headers['user-agent']?.includes('curl')) {
    return res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
  <title>Odoo Connection Test</title>
  <meta name="viewport" content="width=device-device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
      margin: 0; padding: 2rem; 
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
    }
    .container { 
      max-width: 800px; 
      margin: 0 auto; 
      background: white; 
      border-radius: 16px; 
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header { 
      background: #6366f1; 
      color: white; 
      padding: 2rem; 
      text-align: center; 
    }
    .status { 
      padding: 2rem; 
      margin: 0 2rem 2rem; 
      border-radius: 12px; 
      font-size: 1.2rem; 
      font-weight: 600;
    }
    .connected { background: #dcfce7; border: 3px solid #22c55e; color: #166534; }
    .disconnected { background: #fee2e2; border: 3px solid #ef4444; color: #991b1b; }
    .checking { background: #fef3c7; border: 3px solid #eab308; color: #854d0e; }
    .env-missing { background: #dbeafe; border: 3px solid #3b82f6; color: #1e40af; }
    .diagnostics { 
      background: #f8fafc; 
      padding: 2rem; 
      margin: 0 2rem 2rem; 
      border-radius: 12px; 
      border-top: 4px solid #e2e8f0;
    }
    pre { 
      background: #1e293b; 
      color: #e2e8f0; 
      padding: 1.5rem; 
      border-radius: 8px; 
      overflow: auto; 
      font-size: 0.9rem; 
      line-height: 1.5;
      margin: 0;
    }
    .controls { 
      padding: 0 2rem 2rem; 
      text-align: center; 
      background: #f1f5f9;
    }
    button { 
      padding: 1rem 2rem; 
      background: #3b82f6; 
      color: white; 
      border: none; 
      border-radius: 8px; 
      cursor: pointer; 
      font-size: 1rem; 
      font-weight: 600;
      transition: all 0.2s;
    }
    button:hover:not(:disabled) { background: #2563eb; transform: translateY(-1px); }
    button:disabled { background: #9ca3af; cursor: not-allowed; }
    .footer { 
      text-align: center; 
      padding: 1rem 2rem; 
      background: #f8fafc; 
      color: #64748b; 
      font-size: 0.9rem; 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧪 Odoo Connection Test</h1>
      <div style="opacity: 0.9; font-size: 1.1rem;">https://activepieces-odoo.t4stfh.easypanel.host</div>
    </div>
    
    <div id="status" class="status checking">
      <div id="status-text">🔄 Checking connection...</div>
      <div id="error-text" style="display:none; margin-top: 0.5rem;"></div>
    </div>
    
    <div class="diagnostics">
      <strong>🔍 Diagnostics:</strong>
      <pre id="diagnostics">Loading...</pre>
    </div>
    
    <div class="controls">
      <button id="refresh" onclick="checkStatus()">🔄 Refresh Now</button>
      <div style="margin-top: 1rem; opacity: 0.8;">Auto-refreshes every 5 seconds</div>
    </div>
    
    <div class="footer">
      API Endpoint: <code>/api/test</code> | Direct JSON: <code>curl YOUR_URL/api/test</code>
    </div>
  </div>

  <script>
    let isRefreshing = false;
    
    async function checkStatus() {
      if (isRefreshing) return;
      isRefreshing = true;
      
      const statusEl = document.getElementById('status');
      const statusTextEl = document.getElementById('status-text');
      const errorTextEl = document.getElementById('error-text');
      const diagnosticsEl = document.getElementById('diagnostics');
      const refreshBtn = document.getElementById('refresh');
      
      statusEl.className = 'status checking';
      statusTextEl.textContent = '🔄 Testing connection...';
      errorTextEl.style.display = 'none';
      refreshBtn.disabled = true;
      refreshBtn.textContent = '🔄 Loading...';
      
      try {
        const res = await fetch('/api/test');
        const data = await res.json();
        
        if (data.success) {
          statusEl.className = 'status connected';
          statusTextEl.innerHTML = 
            \`✅ <strong>CONNECTED</strong><br>
             <span style="opacity:0.8">UID: \${data.diagnostics.uid}</span><br>
             <span style="opacity:0.8">Version: \${data.diagnostics.version}</span>\`;
        } else {
          const isEnvMissing = data.diagnostics?.env_vars_set === false;
          statusEl.className = isEnvMissing ? 'status env-missing' : 'status disconnected';
          statusTextEl.textContent = isEnvMissing ? '⚠️ ENV VARS MISSING' : '❌ DISCONNECTED';
          errorTextEl.textContent = data.error || 'Unknown error';
          errorTextEl.style.display = 'block';
        }
        
        diagnosticsEl.textContent = JSON.stringify(data.diagnostics, null, 2);
      } catch (err) {
        statusEl.className = 'status disconnected';
        statusTextEl.innerHTML = '❌ NETWORK ERROR';
        errorTextEl.textContent = 'Cannot reach API endpoint';
        errorTextEl.style.display = 'block';
        diagnosticsEl.textContent = \`Network Error: \${err.message}\`;
      } finally {
        isRefreshing = false;
        refreshBtn.disabled = false;
        refreshBtn.textContent = '🔄 Refresh Now';
      }
    }
    
    checkStatus();
    setInterval(checkStatus, 5000);
  </script>
</body>
</html>
    `);
  }

  // API endpoint - returns JSON
  try {
    const result = await testOdooConnection();
    res.status(200).json({ 
      success: true, 
      status: 'connected',
      diagnostics: result 
    });
  } catch (error) {
    console.error('Odoo Test Error:', error);
    res.status(500).json({ 
      success: false, 
      status: 'disconnected',
      error: error.message,
      diagnostics: {
        url: `${ODOO_CONFIG.url}/xmlrpc/2/common`,
        db: ODOO_CONFIG.db,
        username: ODOO_CONFIG.username ? 'configured' : 'missing',
        password: ODOO_CONFIG.password ? 'configured' : 'missing',
        env_vars_set: !!(process.env.ODUSERNAME && process.env.ODPASSWORD),
        timestamp: new Date().toISOString()
      }
    });
  }
};

async function testOdooConnection() {
  return new Promise((resolve, reject) => {
    const client = createClient({ 
      url: `${ODOO_CONFIG.url}/xmlrpc/2/common`,
      timeout: 15000,
      rejectUnauthorized: false,
      headers: { 'User-Agent': 'Vercel-Odoo-Test/1.0' }
    });

    if (!ODOO_CONFIG.username || !ODOO_CONFIG.password) {
      client.drain();
      return reject(new Error('Missing ODOO env vars: ODUSERNAME or ODPASSWORD'));
    }

    client.methodCall('authenticate', [
      ODOO_CONFIG.db, 
      ODOO_CONFIG.username, 
      ODOO_CONFIG.password, 
      {}
    ], (err, uid) => {
      client.drain();
      
      if (err) {
        return reject(new Error(`XML-RPC Error: ${err.faultString || err.message || err}`));
      }
      
      if (!uid || uid <= 0) {
        return reject(new Error(`Authentication failed - UID: ${uid}. Check DB name, username, password/API key`));
      }

      client.methodCall('version', [], (err2, version) => {
        client.drain();
        if (err2) {
          resolve({ 
            uid: uid, 
            version: 'unknown (version check failed)',
            message: 'Odoo auth successful'
          });
        } else {
          resolve({ 
            uid: uid, 
            version: version?.server_version || 'unknown',
            server_version_info: version?.server_version_info,
            message: 'Odoo connection fully successful'
          });
        }
      });
    });
  });
}
