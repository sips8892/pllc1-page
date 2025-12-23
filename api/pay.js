const axios = require('axios');

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
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Generating Payment Link</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.container { background: white; padding: 2rem; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
.spinner { width: 60px; height: 60px; border: 6px solid #f3f3f3; border-top: 6px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1.5rem; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.progress { width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; margin: 1.5rem 0; }
.progress-bar { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); width: 0%; transition: width 0.3s ease; animation: progress 12s linear infinite; }
@keyframes progress { 0% { width: 0%; } 100% { width: 100%; } }
h1 { color: #333; margin-bottom: 0.5rem; font-size: 1.4rem; }
p { color: #666; margin-bottom: 1rem; }
.order-id { font-family: monospace; color: #667eea; }
.refresh-btn { background: #667eea; color: white; border: none; padding: 0.75rem 2rem; border-radius: 50px; cursor: pointer; font-weight: 500; transition: all 0.2s; }
.refresh-btn:hover { background: #5a67d8; transform: translateY(-1px); }
</style>
</head>
<body>
<div class="container">
<div class="spinner"></div>
<div class="progress"><div class="progress-bar"></div></div>
<h1>Generating Secure Payment Link</h1>
<p>Order <span class="order-id">${orderId}</span></p>
<p id="status">Creating invoice from your order...<br><span id="countdown"></span></p>
<button class="refresh-btn" onclick="checkPayment()">Check Now</button>
</div>
<script>
let seconds = 5;
const orderId = '${orderId}';
const apiUrl = 'https://${host}/api/pay';

function updateCountdown() {
  document.getElementById('countdown').textContent = seconds + 's until next check';
  seconds--;
  if (seconds >= 0) setTimeout(updateCountdown, 1000);
}

async function checkPayment() {
  document.getElementById('status').innerHTML = 'Checking Odoo...<br>';
  try {
    const response = await fetch(apiUrl + '?order_id=' + orderId);
    if (response.redirected || response.status === 302) {
      window.location.href = response.url || response.headers.get('location');
      return;
    }
  } catch (e) {
    console.error('Check failed:', e);
  }
  seconds = 5;
  updateCountdown();
}

updateCountdown();
setTimeout(checkPayment, 5000);
setInterval(() => { checkPayment(); }, 5000);
</script>
</body>
</html>`;
}

async function searchOdooInvoice(orderId) {
  const jsonrpcUrl = `${ODOO_CONFIG.url}/jsonrpc`;
  
  console.log(`🔍 Searching Odoo for invoice: ${orderId}`);
  
  try {
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
      console.error('❌ Auth error:', authResponse.data.error);
      return null;
    }
    
    console.log('✅ Auth success, UID:', authResponse.data.result);
    const uid = authResponse.data.result;
    
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
      console.error('❌ Search error:', searchResponse.data.error);
      return null;
    }
    
    console.log('📋 Search result:', searchResponse.data.result?.length || 0, 'invoices');
    return searchResponse.data.result;
  } catch (error) {
    console.error('💥 Odoo API error:', error.message);
    return null;
  }
}

module.exports = async (req, res) => {
  console.log('📡 /api/pay hit:', req.method, req.url);
  
  const url = new URL(req.url, `http://${req.headers.host}`);
  const order_id = url.searchParams.get('order_id');
  
  console.log('🔑 Order ID:', order_id);
  
  if (!order_id) {
    return res.status(400).send('Missing order_id parameter');
  }
  
  const cachedUrl = await kv.get(`payment_${order_id}`);
  if (cachedUrl && cachedUrl !== 'not-found') {
    console.log('🚀 Cache hit, redirecting:', cachedUrl);
    return res.writeHead(302, { Location: cachedUrl }).end();
  }
  
  console.log('🔍 Searching Odoo for invoice...');
  const invoice = await searchOdooInvoice(order_id);
  
  if (invoice && invoice.length > 0) {
    console.log('✅ FOUND INVOICE, redirecting!');
    const invoiceData = invoice[0];
    const paymentUrl = `${ODOO_CONFIG.url}/my/invoices/${invoiceData.id}?access_token=${invoiceData.access_token}`;
    await kv.set(`payment_${order_id}`, paymentUrl, { ex: 1800 });
    return res.writeHead(302, { Location: paymentUrl }).end();
  }
  
  console.log('⏳ Invoice not ready, showing polling page');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(getPollingPage(order_id, req.headers.host));
};
