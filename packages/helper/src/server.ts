import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.TRANSCRIPT_PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '../../../'); // repo root
const transcriptsDir = path.join(rootDir, 'transcripts');

// Serve transcripts as static files
app.use('/transcripts', express.static(transcriptsDir));

app.listen(PORT, () => {
	console.log(`Transcript server running at http://localhost:${PORT}`);
});
