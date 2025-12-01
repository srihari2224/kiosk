const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/create-order', async (req, res) => {
  try {
    // Check if credentials exist
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('Missing Razorpay credentials');
      return res.status(500).json({ 
        error: 'Razorpay credentials not configured',
        debug: {
          hasKeyId: !!process.env.RAZORPAY_KEY_ID,
          hasSecret: !!process.env.RAZORPAY_KEY_SECRET
        }
      });
    }

    // Initialize Razorpay (do this INSIDE the route, not outside)
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const { amount, currency, receipt, notes } = req.body;

    // Validate input
    if (!amount || !currency || !receipt) {
      return res.status(400).json({ error: 'Missing required fields: amount, currency, receipt' });
    }

    const order = await razorpay.orders.create({
      amount: amount,
      currency: currency,
      receipt: receipt,
      notes: notes || {},
      payment_capture: 1  // AUTO-CAPTURE ENABLED
    });

    console.log('✅ Order created successfully:', order.id);
    res.json(order);

  } catch (error) {
    console.error('❌ Order creation failed:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.error || 'Order creation failed'
    });
  }
});

app.get('/', (req, res) => {
  res.json({ 
    status: 'Razorpay API is running',
    timestamp: new Date().toISOString(),
    hasCredentials: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;