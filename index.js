import express from 'express';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Webhook receiver endpoint
app.post('/webhook/netspy', (req, res) => {
	const signature = req.headers['x-netspy-signature'];
	const body = JSON.stringify(req.body);

	// Verify HMAC signature
	const secret = process.env.NETSPY_WEBHOOK_SECRET || 'your-webhook-secret';
	const hash = crypto
		.createHmac('sha256', secret)
		.update(body)
		.digest('hex');

	if (signature !== hash) {
		console.error('Invalid signature');
		return res.status(401).json({ error: 'Unauthorized' });
	}

	// Log the webhook payload
	console.log('✅ Webhook received:', {
		type: req.body.type,
		caseId: req.body.data?.caseId,
		timestamp: new Date().toISOString()
	});

	// TODO: Process the webhook (update database, trigger recovery flow, etc.)

	res.json({ success: true, message: 'Webhook processed' });
});

// Health check endpoint
app.get('/health', (req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
	console.log(`🚀 Webhook receiver listening on port ${PORT}`);
	console.log(`📡 Webhook endpoint: /webhook/netspy`);
});
