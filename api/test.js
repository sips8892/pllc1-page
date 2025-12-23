const axios = require('axios');

const ODOO_CONFIG = {
  url: 'https://activepieces-odoo.t4stfh.easypanel.host',
  db: 'Dbone',
  username: process.env.ODUSERNAME,
  password: process.env.ODPASSWORD
};

module.exports = async (req, res) => {
  const jsonrpcUrl = `${ODOO_CONFIG.url}/jsonrpc`;
  
  try {
    // 1. List databases first
    const dbListResponse = await axios.post(jsonrpcUrl, {
      jsonrpc: '2.0',
      method: 'call',
      params: { service: 'db', method: 'list' },
      id: 0
    });
    
    const databases = dbListResponse.data.result || [];
    const hasDbone = databases.includes('Dbone');
    
    // 2. Test auth with exact error
    const authResponse = await axios.post(jsonrpcUrl, {
      jsonrpc
