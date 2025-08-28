"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rpaLivelo_1 = require("../services/rpaLivelo");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Rota de teste
 *     description: Retorna uma mensagem de confirmação de que a API está funcionando
 *     responses:
 *       200:
 *         description: API funcionando
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/', (req, res) => {
    res.send('API funcionando! Bem-vindo à rota de usuários.');
});
/**
 * @swagger
 * /users/execute-rpa-livelo:
 *   post:
 *     summary: Executa RPA do Livelo
 *     description: Executa o processo automatizado para extrair dados do Livelo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExecuteRpaRequest'
 *     responses:
 *       200:
 *         description: RPA executado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExecuteRpaResponse'
 *       400:
 *         description: Parâmetros obrigatórios não fornecidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/execute-rpa-livelo', async (req, res) => {
    try {
        const { userName, passwordCrypto, startOrder } = req.body;
        if (!userName || !passwordCrypto || startOrder === undefined) {
            return res.status(400).json({
                error: 'Parâmetros obrigatórios: userName, passwordCrypto, startOrder'
            });
        }
        const credentials = {
            userName,
            password: passwordCrypto
        };
        // Executar o RPA do Livelo
        const result = await (0, rpaLivelo_1.runLiveloRpa)(credentials, startOrder);
        // Retornar o resultado
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Erro ao executar RPA Livelo:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor ao executar RPA'
        });
    }
});
exports.default = router;
