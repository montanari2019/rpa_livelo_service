import express, { Request, Response } from 'express';
import cors from 'cors';
import 'dotenv/config';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger';

const app = express();
const PORT = process.env.PORT || 3000;
import liveloRoutes from './routes/livelo';

// Configuração do CORS
app.use(cors({
    origin: true, // Permite todas as origens em desenvolvimento
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

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