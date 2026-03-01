import dotenv from 'dotenv';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import leaderboardRouter from './routes/leaderboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from backend/ first, then fall back to root
dotenv.config();
dotenv.config({path: path.resolve(__dirname, '../../.env')});

const app = express();
const PORT = process.env.PORT ?? 3000;
const MONGO_URI = process.env['MONGO'] as string;

if (!MONGO_URI) {
	console.error('MONGO env variable is not set. Check your .env file.');
	process.exit(1);
}

app.set('trust proxy', 1);
app.use(helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
			styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
			fontSrc: ["'self'", "https://fonts.gstatic.com"],
			connectSrc: ["'self'", "https://khlawde.notaroomba.dev"],
			imgSrc: ["'self'", "data:"],
		},
	},
}));
app.use(cors());
app.use(express.json({limit: '16kb'}));

app.use('/leaderboard', leaderboardRouter);

// Serve frontend static files
const frontendPath = path.resolve(__dirname, '../../frontend');
app.use(express.static(frontendPath));

app.get('/', (_req, res) => {
	res.sendFile(path.join(frontendPath, 'index.html'));
});

async function start() {
	await mongoose.connect(MONGO_URI);
	console.log('Connected to MongoDB');

	app.listen(PORT, () => {
		console.log(`Server running on http://localhost:${PORT}`);
	});
}

start().catch((err) => {
	console.error('Failed to start:', err);
	process.exit(1);
});
