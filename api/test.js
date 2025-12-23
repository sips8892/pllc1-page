// api/test.js - FIXED: No dynamic require, proper error handling
const xmlrpc = require('xmlrpc');

const ODOO_CONFIG = {
  url: 'https://activepieces-odoo.t4stfh.easypanel.host',
  db: 'Dbone',
  username: process.env.ODUSERNAME,
  password: process.env.ODPASSWORD
};

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // ✅ UI for browsers (detect by user-agent)
  const userAgent = req.headers['user-agent'] || '';
  if (req.method === 'GET' && !userAgent.includes('curl') && !userAgent.includes('Postman')) {
    return res.status(200).send(getHTML());
  }

  // ✅ API JSON response
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
      diagnostics: getDiagnostics(error)
    });
  }
};

function getHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Odoo Connection Test</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system,BlinkMacSystemFont,sans-serif; margin:0; padding:2rem; background:#f8f9fa; }
    .container { max-width:700px; margin:0 auto; }
    h1 { color:#333; }
    .status { padding:1.5rem; border-radius:12px; margin-bottom:1.5rem; font-size:1.1rem; }
    .connected { background:#d4edda; border:3px solid #28a745; color:#155724; }
    .disconnected { background:#f8d7da; border:3px solid #dc3545; color:#721c24; }
    .checking { background:#fff3cd; border:3px solid #ffc107; color:#856404; }
    .env-missing { background:#cce5ff; border:3px solid #0066cc; color:#004085; }
    pre { background:#fff; padding:1rem; border-radius:6px; overflow:auto; font-size:0.85rem; }
    button { padding:0.75rem 1.5rem; background:#0070f3; color:white; border:none; border-radius:6px; cursor:pointer; }
    button:disabled { background:#6c757d; cursor:not-allowed; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧪 Odoo Connection Test</h1>
    <div id="status" class="status checking">
      <div id="status-text">🔄 Checking...</div>
      <div id="error-text" style="display:none;"></div>
    </div>
    <details>
      <summary>🔍 Diagnostics</summary>
      <pre id="diagnostics">Loading...</pre>
    </details>
    <button id="refresh" onclick="checkStatus()">🔄 Refresh</button>
    <div style="opacity:0.7;font-size:0.9rem;margin-top:1rem;">Auto-refreshes every 5s</div>
  </div>
  <script>
    async function checkStatus(){
      document.getElementById('refresh').disabled=true;
      document.getElementById('status').className='status checking';
      document.getElementById('status-text').textContent='🔄 Testing...';
      try{
        const res=await fetch('/api/test');
        const data=await res.json();
        const statusEl=document.getElementById('status');
        if(data.success){
          statusEl.className='status connected';
          document.getElementById('status-text').innerHTML=\`✅ CONNECTED<br>UID: \${data.diagnostics.uid}<br>Version: \${data.diagnostics.version}\`;
        }else{
          statusEl.className=data.diagnostics?.env_vars_set!==false?'status disconnected':'status env-missing';
          document.getElementById('status-text').textContent='❌ '+data.error;
        }
        document.getElementById('diagnostics').textContent=JSON.stringify(data.diagnostics,null,2);
      }catch(e){
        document.getElementById('status').className='status disconnected';
        document.getElementById('status-text').textContent='❌ NETWORK ERROR';
        document.getElementById('diagnostics').textContent='Network error: '+e.message;
      }
      document.getElementById('refresh').disabled=false;
      document.getElementById('refresh').textContent='🔄 Refresh';
    }
    checkStatus(); setInterval(checkStatus,5000);
  </script>
</body></html>`;
}

async function testOdooConnection() {
  // ✅ FIX 1: TOP-LEVEL require('xmlrpc') - NO dynamic require
  return new Promise((resolve, reject) => {
    if (!ODOO_CONFIG.username || !ODOO_CONFIG.password) {
      return reject(new Error('Missing env vars: ODUSERNAME or ODPASSWORD'));
    }

    const client = xmlrpc.createClient({ 
      url: `${ODOO_CONFIG.url}/xmlrpc/2/common`,
      timeout: 10000,
      rejectUnauthorized: false, // ✅ SSL fix
      headers: { 'User-Agent': 'Vercel-Odoo-Test' }
    });

    client.methodCall('authenticate', [
      ODOO_CONFIG.db, 
      ODOO_CONFIG.username, 
      ODOO_CONFIG.password, 
      {}
    ], (err, uid) => {
      // ✅ FIX 2: Always drain to prevent leaks
      try { client.drain(); } catch(e) {}
      
      if (err) {
        return reject(new Error(`Auth failed: ${err.faultString || err.message || JSON.stringify(err)}`));
      }
      
      if (!uid || uid <= 0) {
        return reject(new Error(`Invalid credentials - UID: ${uid}`));
      }

      // Version check
      client.methodCall('version', [], (err2, version) => {
        try { client.drain(); } catch(e) {}
        if (err2) {
          return resolve({ uid, version: 'unknown', message: 'Auth OK' });
        }
        resolve({ 
          uid, 
          version: version?.server_version || 'unknown',
          server_version_info: version?.server_version_info,
          message: 'Fully connected'
        });
      });
    });

    // ✅ FIX 3: Timeout fallback
    setTimeout(() => {
      try { client.drain(); } catch(e) {}
      reject(new Error('Connection timeout'));
    }, 12000);
  });
}

function getDiagnostics(error) {
  return {
    url: `${ODOO_CONFIG.url}/xmlrpc/2/common`,
    db: ODOO_CONFIG.db,
    username: ODOO_CONFIG.username ? 'set' : 'MISSING',
    password: ODOO_CONFIG.password ? 'set' : 'MISSING',
    env_vars_set: !!(process.env.ODUSERNAME && process.env.ODPASSWORD),
    timestamp: new Date().toISOString(),
    error: error.message
  };
}
