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
  url: 'https://activepieces-odoo.t4stfh.easypanel.host',
  db: 'Dbone',
  username: process.env.ODUSERNAME,
  password: process.env.ODPASSWORD
};

function getLoadingPage(orderId) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generating Payment Link</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh; 
      display: flex; 
      align-items: center; 
      justify-content: center;
    }
    .container { 
      background: white; 
      padding: 2rem; 
      border-radius: 20px; 
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      text-align: center; 
      max-width: 400px;
    }
    .spinner { 
      width: 60px; 
      height: 60px; 
      border: 6px solid #f3f3f3; 
      border-top: 6px solid #667eea; 
      border-radius: 50%;
      animation: spin 1s linear infinite; 
      margin: 0 auto 1.5rem;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .progress { 
      width: 100%; 
      height: 8px; 
      background: #e0e0e0; 
      border-radius: 4px; 
      overflow: hidden; 
      margin: 1.5rem 0;
    }
    .progress-bar { 
      height: 100%; 
      background: linear-gradient(90deg, #667eea, #764ba2);
      width: 0%; 
      transition: width 0.3s ease;
      animation: progress 12s linear infinite;
    }
    @keyframes progress { 0% { width: 0%; } 100% { width: 100%; } }
    h1 { color: #333; margin-bottom: 0.5rem; font-size: 1.4rem; }
    p { color: #666; margin-bottom: 1rem; }
    .order-id { font-family: monospace; color: #667eea; }
    .refresh-btn { 
      background: #667eea; 
      color: white; 
      border: none; 
      padding: 0.75rem 2rem; 
      border-radius: 50px; 
      cursor: pointer; 
      font-weight: 500;
      transition: all 0.2s;
    }
    .refresh-btn:hover { background: #5a67d8; transform: translateY(-1px); }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <div class="progress"><div class="progress-bar"></div></div>
    <h1>Generating Secure Payment Link</h1>
    <p>Order <span class="order-id">${orderId}</span></p>
    <p>Don't close or refresh this page. You are being redirected to the payment page.</p>
    <button class="refresh-btn" onclick="location.reload()">Refresh Status</button>
  </div>
</body>
</html>`;
}

async function searchOdooInvoice(orderId) {
  const jsonrpcUrl = `${ODOO_CONFIG.url}/jsonrpc`;
  
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
    
    if (authResponse.data.error) {
      console.error('Auth error:', authResponse.data.error);
      return null;
    }
    
    const uid = authResponse.data.result;
    
    // Step 2: Search invoices where name = orderId
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
    
    if (searchResponse.data.error) {
      console.error('Search error:', searchResponse.data.error);
      return null;
    }
    
    return searchResponse.data.result;
  } catch (error) {
    console.error('Odoo API error:', error.message);
    return null;
  }
}

// Main handler - handles all /api routes
module.exports = async (req, res) => {
  const method = req.method;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  
  // GET /api/pay?order_id=xxx
  if (method === 'GET' && pathname === '/') {
    const order_id = url.searchParams.get('order_id');
    
    if (!order_id) {
      return res.status(400).send('Missing order_id parameter');
    }
    
    // Check cache first
    const cachedUrl = await kv.get(`payment_${order_id}`);
    if (cachedUrl) {
      return res.writeHead(302, { Location: cachedUrl }).end();
    }
    
    // Send loading page
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(getLoadingPage(order_id));
    
    // Background: Wait 10s + search Odoo
    setImmediate(async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        const invoice = await searchOdooInvoice(order_id);
        if (!invoice || invoice.length === 0) {
          console.log(`No invoice found for ${order_id}`);
          return;
        }
        
        const invoiceData = invoice[0];
        const paymentUrl = `${ODOO_CONFIG.url}/my/invoices/${invoiceData.id}?access_token=${invoiceData.access_token}`;
        
        await kv.set(`payment_${order_id}`, paymentUrl, { ex: 1800 });
        console.log(`Payment URL cached for ${order_id}`);
      } catch (error) {
        console.error('Background search failed:', error);
      }
    });
    
    return;
  }
  
  // POST /api/webhook (Zoho)
  if (method === 'POST' && pathname === '/') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const formData = JSON.parse(body);
        console.log('Zoho webhook:', formData);
      } catch (e) {
        console.log('Webhook body:', body);
      }
      res.status(200).send('OK');
    });
    return;
  }
  
  // 404
  res.status(404).send('Not found');
};

