import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
    res.send('API funcionando! Bem-vindo à rota de usuários.');
});

export default router;
