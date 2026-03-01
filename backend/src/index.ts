import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import leaderboardRouter from './routes/leaderboard.js';

const app = express();
const PORT = process.env.PORT ?? 3000;
const MONGO_URI = process.env['MONGO'] as string;

if (!MONGO_URI) {
	console.error('MONGO env variable is not set. Check your .env file.');
	process.exit(1);
}

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors());
app.use(express.json({limit: '16kb'}));

app.use('/leaderboard', leaderboardRouter);

app.get('/', (_req, res) => {
	res.json({status: 'ok', message: 'Khlawde leaderboard API'});
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
