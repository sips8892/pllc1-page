const axios = require('axios');

// In-memory cache
const cache = new Map();
const kv = {
  get: async (key) => cache.get(key),
  set: async (key, value, options) => {
    cache.set(key, value);
    if (options?.ex) {
      setTimeout(() => cache.delete(key), options.ex * 1000);
    }
  }
};

const ODOO_CONFIG = {
  url: 'https://activepieces-odoo.t4stfh.easypanel.host:8069',
  db: 'Dbone',
  username: process.env.ODUSERNAME,
  password: process.env.ODPASSWORD
};

function getPollingPage(orderId, host) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generating Payment Link</title>
  <style>/* YOUR EXISTING CSS */</style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <div class="progress"><div class="progress-bar" id="progress"></div></div>
    <h1>Generating Secure Payment Link</h1>
    <p>Order <span class="order-id">${orderId}</span></p>
    <p id="status">Waiting for invoice creation (Zoho → n8n → Odoo)...<br><span id="countdown"></span></p>
    <button class="refresh-btn" onclick="checkPayment()">Check Now</button>
  </div>
  <script>
    let seconds = 15;
    const orderId = '${orderId}';
    const apiUrl = 'https://${host}/api/pay';
    
    function updateCountdown() {
      document.getElementById('countdown').textContent = \`(Auto-check in \${seconds}s)\`;
      seconds--;
      if (seconds >= 0) setTimeout(updateCountdown, 1000);
    }
    
    async function checkPayment() {
      document.getElementById('status').textContent = 'Checking Odoo...';
      try {
        const response = await fetch(\`\${apiUrl}?order_id=\${orderId}\`);
        if (response.redirected) {
          window.location.href = response.url;
          return;
        }
        document.getElementById('status').textContent = 'Invoice not ready yet...';
      } catch (e) {
        document.getElementById('status').textContent = 'Check failed, retrying...';
      }
      seconds = 15;
      updateCountdown();
    }
    
    updateCountdown();
    setTimeout(checkPayment, 15000); // First check after 15s
  </script>
</body>
</html>`;
}

async function searchOdooInvoice(orderId) {
  const jsonrpcUrl = `${ODOO_CONFIG.url}/jsonrpc`;
  
  console.log(`🔍 Searching Odoo for invoice: ${orderId}`);
  
  try {
    // Step 1: Authenticate
    const authResponse = await axios.post(jsonrpcUrl, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        db: ODOO_CONFIG.db,
        login: ODOO_CONFIG.username,
        password: ODOO_CONFIG.password
      },
      id: 1
    });
    
    console.log('✅ Auth success, UID:', authResponse.data.result);
    
    if (authResponse.data.error) {
      console.error('❌ Auth error:', authResponse.data.error);
      return null;
    }
    
    const uid = authResponse.data.result;
    
    // Step 2: Search invoices
    const searchResponse = await axios.post(jsonrpcUrl, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          ODOO_CONFIG.db,
          uid,
          ODOO_CONFIG.password,
          'account.move',
          'search_read',
          [['name', '=', orderId]],
          { fields: ['id', 'name', 'state', 'amount_total', 'access_token'] }
        ]
      },
      id: 2
    });
    
    console.log('📋 Search result:', searchResponse.data.result?.length || 0, 'invoices');
    
    if (searchResponse.data.error) {
      console.error('❌ Search error:', searchResponse.data.error);
      return null;
    }
    
    return searchResponse.data.result;
  } catch (error) {
    console.error('💥 Odoo API error:', error.message);
    console.error('Full error:', error.response?.data);
    return null;
  }
}

// FIXED: Correct Vercel routing for api/pay.js
module.exports = async (req, res) => {
  console.log('📡 /api/pay hit:', req.method, req.url);
  
  const url = new URL(req.url, `http://${req.headers.host}`);
  const order_id = url.searchParams.get('order_id');
  
  console.log('🔑 Order ID:', order_id);
  
  if (!order_id) {
    return res.status(400).send('Missing order_id parameter');
  }
  
  // Check cache first (instant redirect)
  const cachedUrl = await kv.get(`payment_${order_id}`);
  if (cachedUrl && cachedUrl !== 'not-found') {
    console.log('🚀 Cache hit, redirecting:', cachedUrl);
    return res.writeHead(302, { Location: cachedUrl }).end();
  }
  
  // Send POLLING loading page
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(getPollingPage(order_id, req.headers.host));
};
};
