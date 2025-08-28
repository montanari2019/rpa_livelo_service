import express, { Request, Response } from 'express';
import 'dotenv/config';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger';

const app = express();
const PORT = process.env.PORT || 3000;
import liveloRoutes from './routes/livelo';

// Middleware para JSON
app.use(express.json());

// Configuração do Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));

// Importando rotas
app.use('/livelo', liveloRoutes);

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});