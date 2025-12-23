const axios = require('axios');

const ODOO_CONFIG = {
  url: 'https://activepieces-odoo.t4stfh.easypanel.host/',
  db: 'Dbone',
  username: process.env.ODUSERNAME,
  password: process.env.ODPASSWORD
};

async function testOdooConnection() {
  const jsonrpcUrl = `${ODOO_CONFIG.url}/jsonrpc`;
  
  try {
    // Test 1: Authentication
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
      return { auth: `❌ FAILED: ${authResponse.data.error.message}` };
    }
    
    const uid = authResponse.data.result;
    
    // Test 2: Search invoices (use test order_id)
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
          [['name', '=', '8335827457']], // Test order_id
          { fields: ['id', 'name'] }
        ]
      },
      id: 2
    });
    
    const invoices = searchResponse.data.result || [];
    
    return {
      auth: `✅ SUCCESS (UID: ${uid})`,
      search: invoices.length > 0 
        ? `✅ FOUND ${invoices.length} invoice(s): ${invoices.map(i => i.name).join(', ')}`
        : '✅ SUCCESS (no matching invoices - normal)',
      sample_payment_url: invoices[0] 
        ? `${ODOO_CONFIG.url}/my/invoices/${invoices[0].id}?access_token=test`
        : 'N/A'
    };
  } catch (error) {
    return {
      auth: `❌ ERROR: ${error.message}`,
      search: 'Failed',
      sample_payment_url: 'N/A'
    };
  }
}

module.exports = async (req, res) => {
  const envStatus = {
    ODUSERNAME: process.env.ODUSERNAME ? '✅ SET' : '❌ MISSING',
    ODPASSWORD: process.env.ODPASSWORD ? '✅ SET' : '❌ MISSING',
    timestamp: new Date().toISOString()
  };
  
  const odooTest = await testOdooConnection();
  
  res.json({
    environment: envStatus,
    odoo_connection: odooTest,
    ready_for_zoho: envStatus.ODUSERNAME === '✅ SET' && envStatus.ODPASSWORD === '✅ SET' && odooTest.auth.startsWith('✅'),
    test_notes: "Create invoice with name='8335827457' in Odoo to see search results"
  });
};
