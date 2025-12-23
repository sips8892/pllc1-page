const kv = require('@vercel/kv');

module.exports = async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  
  // /api/pay?order_id=123 → redirect to Odoo payment
  if (pathname === '/api/pay') {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const order_id = url.searchParams.get('order_id');
    
    const paymentUrl = await kv.get(`payment_${order_id}`);
    
    if (!paymentUrl) {
      res.setHeader('Refresh', '3');
      return res.send('Processing your payment link...');
    }
    
    return res.writeHead(302, { Location: paymentUrl }).end();
  }
  
  // /api/webhook → receives Zoho data, creates Odoo invoice
  if (pathname === '/api/webhook' && req.method === 'POST') {
    const formData = req.body;
    // TODO: Call Odoo API, store payment URL
    await kv.set(`payment_${formData.order_id}`, 'https://odoo.com/invoice/123');
    res.status(200).send('OK');
  }
  
  res.statusCode = 404;
  res.end('Not found');
};
