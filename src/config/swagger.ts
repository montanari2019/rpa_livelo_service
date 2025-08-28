import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'RPA Livelo Service API',
            version: '1.0.0',
            description: 'API para automatização de processos do Livelo usando RPA',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Servidor de desenvolvimento',
            },
        ],
        components: {
            schemas: {
                ExecuteRpaRequest: {
                    type: 'object',
                    required: ['userName', 'passwordCrypto', 'startOrder'],
                    properties: {
                        userName: {
                            type: 'string',
                            description: 'Nome de usuário para login no Livelo',
                            example: 'usuario@email.com'
                        },
                        passwordCrypto: {
                            type: 'string',
                            description: 'Senha criptografada do usuário',
                            example: 'abc123def456'
                        },
                        startOrder: {
                            type: 'integer',
                            description: 'Número inicial para ordenação dos logs',
                            example: 1
                        }
                    }
                },
                ExecuteRpaResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            description: 'Indica se a operação foi bem-sucedida'
                        },
                        data: {
                            type: 'object',
                            properties: {
                                balancePoints: {
                                    type: 'number',
                                    description: 'Saldo de pontos do usuário'
                                },
                                extrato: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            data: { type: 'string' },
                                            operacao: { type: 'string' },
                                            parceiros: { type: 'string' },
                                            pontos: { type: 'number' },
                                            observacoes: { type: 'string' }
                                        }
                                    }
                                },
                                logs: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            order: { type: 'number' },
                                            message: { type: 'string' }
                                        }
                                    }
                                },
                                finalOrder: {
                                    type: 'number',
                                    description: 'Número final da ordenação dos logs'
                                }
                            }
                        }
                    }
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        error: {
                            type: 'string',
                            description: 'Mensagem de erro'
                        }
                    }
                }
            }
        }
    },
    apis: ['./src/routes/*.ts'], // caminho para os arquivos de rota
};

export const specs = swaggerJsdoc(options);
