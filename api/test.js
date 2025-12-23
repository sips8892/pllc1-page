// api/test.js - FIXED for Vercel + HTTPS SSL issues
import { createClient } from 'xmlrpc';

const ODOO_CONFIG = {
  url: 'https://activepieces-odoo.t4stfh.easypanel.host',
  db: 'Dbone',
  username: process.env.ODUSERNAME,
  password: process.env.ODPASSWORD
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
}

async function testOdooConnection() {
  return new Promise((resolve, reject) => {
    // ✅ CRITICAL: Proper HTTPS client config for Vercel + self-signed certs
    const client = createClient({ 
      url: `${ODOO_CONFIG.url}/xmlrpc/2/common`,
      timeout: 15000, // Increased for Vercel cold starts
      // ✅ FIX 1: Handle HTTPS SSL issues common on Vercel/Odoo
      rejectUnauthorized: false, // Accept self-signed certs
      headers: {
        'User-Agent': 'Vercel-Odoo-Test/1.0'
      }
    });

    // ✅ FIX 2: Validate env vars first
    if (!ODOO_CONFIG.username || !ODOO_CONFIG.password) {
      return reject(new Error('Missing ODOO env vars: ODUSERNAME or ODPASSWORD'));
    }

    client.methodCall('authenticate', [
      ODOO_CONFIG.db, 
      ODOO_CONFIG.username, 
      ODOO_CONFIG.password, 
      {}
    ], (err, uid) => {
      client.drain(); // ✅ FIX 3: Always drain client to prevent leaks
      
      if (err) {
        return reject(new Error(`XML-RPC Error: ${err.faultString || err.message || err}`));
      }
      
      if (!uid || uid <= 0) {
        return reject(new Error(`Authentication failed - UID: ${uid}. Check DB name, username, password/API key`));
      }

      // Version check (optional but good diagnostic)
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
