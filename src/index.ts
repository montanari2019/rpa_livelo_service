import express, { Request, Response } from 'express';
import cors from 'cors';
import 'dotenv/config';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger';

const app = express();
const PORT = process.env.PORT || 3000;
import liveloRoutes from './routes/livelo';

// Configuração do CORS - Permite acesso de qualquer origem
app.use(cors({
    origin: '*', // Permite todas as origens
    credentials: false, // Não precisa de credenciais para requisições CORS simples
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['*'], // Permite todos os headers
    exposedHeaders: ['*'] // Expõe todos os headers
}));

// Middleware adicional para tratar requisições preflight
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.header('Access-Control-Allow-Headers', '*');
        res.header('Access-Control-Max-Age', '86400'); // 24 horas
        return res.status(200).end();
    }
    next();
});

// Middleware para JSON
app.use(express.json());

// Configuração do Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));

// Rota de teste
app.get('/', (req: Request, res: Response) => {
    res.send('API funcionando com TypeScript!');
});

// Importando rotas
app.use('/livelo', liveloRoutes);

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});