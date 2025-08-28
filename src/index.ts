import express, { Request, Response } from 'express';

const app = express();
const PORT = 3000;

// Middleware para JSON
app.use(express.json());

// Rota de teste
app.get('/', (req: Request, res: Response) => {
    res.send('API funcionando com TypeScript!');
});

// Importando rotas
import userRoutes from './routes/userRoutes';
app.use('/users', userRoutes);

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
