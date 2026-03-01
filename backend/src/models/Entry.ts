import mongoose from 'mongoose';

const entrySchema = new mongoose.Schema(
	{
		username: {
			type: String,
			required: true,
			minlength: 1,
			maxlength: 32,
			match: /^[a-zA-Z0-9_]+$/,
		},
		tokens: {
			type: Number,
			required: true,
			min: 0,
		},
		asciiImage: {
			type: String,
			required: true,
			maxlength: 5000,
		},
		ip: {
			type: String,
			required: true,
			select: false,
		},
	},
	{timestamps: true},
);

export default mongoose.model('Entry', entrySchema);
