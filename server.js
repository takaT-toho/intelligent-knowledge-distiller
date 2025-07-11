import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());

// Health check endpoint
app.get('/', (req, res) => {
    res.status(200).send('Proxy server is running!');
});

app.post('/api/openai/chat/completions', async (req, res) => {
    const { baseURL, apiKey, model, messages, response_format } = req.body;

    if (!baseURL || !apiKey || !model || !messages) {
        return res.status(400).json({ error: 'Missing required parameters: baseURL, apiKey, model, messages' });
    }

    try {
        const response = await axios.post(baseURL, {
            messages,
            model,
            response_format,
            stream: false, // Not supporting streaming for now
        }, {
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey,
                'Cache-Control': 'no-cache',
            }
        });

        res.json(response.data);

    } catch (error) {
        console.error('Error proxying request:', error.response ? error.response.data : error.message);
        res.status(error.response ? error.response.status : 500).json({ 
            error: 'Failed to proxy request',
            details: error.response ? error.response.data : error.message 
        });
    }
});

app.listen(port, () => {
    console.log(`Proxy server listening at http://localhost:${port}`);
});
