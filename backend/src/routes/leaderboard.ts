import {Router, type Request, type Response} from 'express';
import rateLimit from 'express-rate-limit';
import Entry from '../models/Entry.js';

const router = Router();

const postLimiter = rateLimit({
	windowMs: 2 * 60 * 1000, // 2 minutes
	max: 1,
	keyGenerator: (req: Request) => req.ip ?? 'unknown',
	message: {error: 'Too many submissions. Try again in 2 minutes.'},
	standardHeaders: true,
	legacyHeaders: false,
});

// GET /leaderboard — top 50 entries by tokens (ascending, lower is better)
router.get('/', async (_req: Request, res: Response) => {
	const entries = await Entry.find()
		.sort({tokens: 1})
		.limit(50)
		.select('-ip');
	res.json(entries);
});

// POST /leaderboard — add a new entry
router.post('/', postLimiter, async (req: Request, res: Response) => {
	const {username, tokens, asciiImage} = req.body;

	if (
		typeof username !== 'string' ||
		typeof tokens !== 'number' ||
		typeof asciiImage !== 'string'
	) {
		res.status(400).json({error: 'Missing or invalid fields: username (string), tokens (number), asciiImage (string).'});
		return;
	}

	if (!/^[a-zA-Z0-9_]{1,32}$/.test(username)) {
		res.status(400).json({error: 'Username must be 1-32 alphanumeric characters or underscores.'});
		return;
	}

	if (tokens < 0 || !Number.isFinite(tokens)) {
		res.status(400).json({error: 'Tokens must be a non-negative number.'});
		return;
	}

	if (asciiImage.length > 5000) {
		res.status(400).json({error: 'ASCII image must be 5000 characters or fewer.'});
		return;
	}

	const entry = await Entry.create({
		username,
		tokens,
		asciiImage,
		ip: req.ip ?? 'unknown',
	});

	res.status(201).json({
		_id: entry._id,
		username: entry.username,
		tokens: entry.tokens,
		asciiImage: entry.asciiImage,
		createdAt: entry.createdAt,
	});
});

export default router;
