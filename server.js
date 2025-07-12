import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());

// APIプロキシ用のルートを先に定義
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
            stream: false,
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

// --- 本番環境用の設定 ---
// NODE_ENVが'production'の場合のみ、静的ファイル配信とフォールバックルートを有効にする
if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'dist');

    // 1. 静的ファイルを提供
    app.use(express.static(distPath));

    // 2. API以外のすべてのGETリクエストに対してindex.htmlを返す (フォールバック)
    // /apiで始まらないすべてのパスにマッチする正規表現を使用し、より安全にフォールバックを実装
    app.get(/^(?!\/api).*/, (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

app.listen(port, () => {
    if (process.env.NODE_ENV === 'production') {
        console.log(`Server listening on port ${port}`);
    } else {
        console.log(`Proxy server for local development listening on port ${port}`);
    }
});
