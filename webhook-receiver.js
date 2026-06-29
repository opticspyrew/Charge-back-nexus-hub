// webhook-receiver.js
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

// Webhook secret from Manus
const WEBHOOK_SECRET = process.env.NETSPY_WEBHOOK_SECRET;

// Verify webhook signature
function verifyWebhookSignature(req) {
	const signature = req.headers['x-netspy-signature'];
	const timestamp = req.headers['x-netspy-timestamp'];

	if (!signature || !timestamp) {
		return false;
	}

	// Check timestamp is within 5 minutes
	const now = Date.now();
	const requestTime = parseInt(timestamp);
	if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
		return false;
	}

	// Verify signature
	const message = `<LaTex>${timestamp}.$</LaTex>{JSON.stringify(req.body)}`;
	const expectedSignature = crypto
		.createHmac('sha256', WEBHOOK_SECRET)
		.update(message)
		.digest('hex');

	return crypto.timingSafeEqual(
		Buffer.from(signature),
		Buffer.from(expectedSignature)
	);
}

// Webhook endpoint
app.post('/api/public/refunds/webhooks/netspy-events', (req, res) => {
	// Verify signature
	if (!verifyWebhookSignature(req)) {
		return res.status(401).json({ error: 'Invalid signature' });
	}

	const event = req.body;
	console.log('Received webhook event:', event.type);

	// Handle different event types
	switch (event.type) {
		case 'case.created':
			handleCaseCreated(event);
			break;
		case 'case.statusUpdated':
			handleCaseStatusUpdated(event);
			break;
		case 'blockchain.traceCompleted':
			handleBlockchainTraceCompleted(event);
			break;
		case 'vault.created':
			handleVaultCreated(event);
			break;
		default:
			console.log('Unknown event type:', event.type);
	}

	res.json({ success: true });
});

function handleCaseCreated(event) {
	console.log('New case created:', event.data.caseId);
	// Add your logic here
}

function handleCaseStatusUpdated(event) {
	console.log('Case status updated:', event.data.status);
	// Add your logic here
}

function handleBlockchainTraceCompleted(event) {
	console.log('Blockchain trace completed');
	// Add your logic here
}

function handleVaultCreated(event) {
	console.log('Recovery vault created:', event.data.vaultId);
	// Add your logic here
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Webhook receiver listening on port ${PORT}`);
});
