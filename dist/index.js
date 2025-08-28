"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("dotenv/config");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./config/swagger");
const app = (0, express_1.default)();
const PORT = 3000;
const livelo_1 = __importDefault(require("./routes/livelo"));
// Middleware para JSON
app.use(express_1.default.json());
// Configuração do Swagger
app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.specs));
// Importando rotas
app.use('/livelo', livelo_1.default);
app.listen(PORT);
