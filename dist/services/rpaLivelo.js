"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTotalPagesTransactions = getTotalPagesTransactions;
exports.extractAllTransactions = extractAllTransactions;
exports.runLiveloRpa = runLiveloRpa;
const puppteer_1 = require("../helpers/puppteer");
const crypto_1 = require("../helpers/crypto");
/**
 * Passo 1: acessar página inicial e limpar cookies/localStorage
 */
async function accessingHomePage(page, logs, orderCounter) {
    try {
        logs.push({
            order: orderCounter++,
            message: 'Acessando página inicial do Livelo',
        });
        // Limpar cookies e localStorage antes de cada tentativa
        const client = await page.createCDPSession();
        await client.send('Network.enable');
        await client.send('Network.clearBrowserCookies');
        await client.send('Network.clearBrowserCache');
        await (0, puppteer_1.goToPuppeter)(page, 'https://www.livelo.com.br/');
        logs.push({
            order: orderCounter++,
            message: 'Página inicial carregada com sucesso',
        });
    }
    catch (error) {
        logs.push({
            order: orderCounter++,
            message: `Erro ao acessar página inicial: ${error}`,
        });
        throw error;
    }
    return orderCounter;
}
/**'
 * Passo 2: login
 */
async function typeHuman(page, selector, text) {
    await page.click(selector);
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Delete');
    for (const char of text) {
        await page.keyboard.type(char);
        const delay = 80 + Math.random() * 120;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}
async function performLogin(page, credentials, logs, orderCounter) {
    try {
        const { userName, password } = credentials;
        logs.push({
            order: orderCounter++,
            message: 'Iniciando processo de login',
        });
        const buttonSelector = await page.waitForSelector('#l-header__button_login', {
            visible: true,
            timeout: 30000,
        });
        if (!buttonSelector) {
            throw new Error('Botão de login não encontrado');
        }
        await buttonSelector.click();
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        await page.waitForSelector('#username', { visible: true, timeout: 30000 });
        await typeHuman(page, '#username', userName);
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 300));
        await page.waitForSelector('#password', { visible: true, timeout: 30000 });
        await typeHuman(page, '#password', password);
        await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 400));
        const buttonLogin = await page.waitForSelector('#btn-submit', {
            visible: true,
            timeout: 30000,
        });
        if (!buttonLogin) {
            throw new Error('Botão de Submit login não encontrado');
        }
        await buttonLogin.click();
        logs.push({
            order: orderCounter++,
            message: 'Login realizado com sucesso',
        });
    }
    catch (error) {
        logs.push({
            order: orderCounter++,
            message: `Erro ao realizar login: ${error}`,
        });
        throw error;
    }
    return orderCounter;
}
/**
 * Passo 3: acessar extrato navegando como usuário real e capturar saldo
 * Navega até a página de extrato via menus
 */
async function navigateToExtract(page, logs, orderCounter) {
    await new Promise(timer => setTimeout(timer, 10200 + Math.random() * 800));
    try {
        logs.push({
            order: orderCounter++,
            message: 'Navegando para página de extrato',
        });
        const perfil = await page.waitForSelector('.l-header__user-profile', {
            visible: true,
        });
        if (!perfil) {
            throw new Error('Perfil não encontrado');
        }
        await perfil.click({ delay: 60 });
        const extratoLink = await page.waitForSelector('a.l-header__dropdown-menu-list-item[href="https://www.livelo.com.br/extrato"]', {
            visible: true,
            timeout: 20000,
        });
        if (!extratoLink) {
            throw new Error('Link de extrato não encontrado');
        }
        await extratoLink.click({ delay: 60 });
        await new Promise(timer => setTimeout(timer, 1200 + Math.random() * 800));
        logs.push({
            order: orderCounter++,
            message: 'Página de extrato carregada com sucesso',
        });
        return { success: true, newOrderCounter: orderCounter };
    }
    catch (error) {
        logs.push({
            order: orderCounter++,
            message: `Erro ao navegar para extrato: ${error}`,
        });
        return { success: false, newOrderCounter: orderCounter };
    }
}
/**
  * Passo 3: Coleta o saldo da página de extrato já carregada
 */
async function collectExtractBalance(page, logs, orderCounter) {
    let balancePoints = 0;
    try {
        logs.push({
            order: orderCounter++,
            message: 'Coletando saldo da conta',
        });
        const elementBalancePoints = await page.waitForSelector('#balancePoints', { visible: true, timeout: 60000 });
        if (!elementBalancePoints) {
            throw new Error('Elemento de saldo não encontrado');
        }
        const anyBalancePoints = await elementBalancePoints.evaluate((el) => el.textContent?.trim() ?? '');
        if (!anyBalancePoints) {
            throw new Error('Saldo não encontrado');
        }
        balancePoints = Number(anyBalancePoints.replace(/\./g, '').replace(',', '.'));
        logs.push({
            order: orderCounter++,
            message: `Saldo coletado: ${balancePoints} pontos`,
        });
    }
    catch (error) {
        logs.push({
            order: orderCounter++,
            message: `Erro ao coletar saldo: ${error}`,
        });
        return { balancePoints: 0, newOrderCounter: orderCounter };
    }
    return { balancePoints, newOrderCounter: orderCounter };
}
/**
  * Função para normalizar nomes dos camposition (ex: "Observações" -> "observacoes")
 */
function normalizeFieldName(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9]/g, '');
}
/**
 * Captura o total de páginas exibidas na paginação.
 * Retorna o maior número encontrado nos botões de página.
 */
async function getTotalPagesTransactions(page, logs, orderCounter) {
    try {
        const elementTotalPages = await page.waitForSelector('[data-testid="div_Pagination"]', { visible: true, timeout: 10000 });
        if (!elementTotalPages) {
            throw new Error('Elemento de paginação não encontrado');
        }
        const totalPages = await elementTotalPages.evaluate((paginationElement) => {
            const pageNumberElements = paginationElement.querySelectorAll('[data-testid^="button_Pagination_Page_"] div[data-testid="Text_Typography"]');
            const numbers = Array.from(pageNumberElements)
                .map((element) => Number(element.textContent?.trim()))
                .filter(num => !isNaN(num));
            return numbers.length > 0 ? Math.max(...numbers) : 1;
        });
        logs.push({
            order: orderCounter++,
            message: `Total de páginas identificadas: ${totalPages}`,
        });
        return { totalPages, newOrderCounter: orderCounter };
    }
    catch (error) {
        logs.push({
            order: orderCounter++,
            message: `Erro ao capturar total de páginas: ${error}`,
        });
        return { totalPages: 0, newOrderCounter: orderCounter };
    }
}
/**
  * Passo 5: Função para extrair todas as transações da tabela de extrato (com paginação)
 */
async function extractAllTransactions(page, logs, orderCounter) {
    const allTransactions = [];
    try {
        logs.push({
            order: orderCounter++,
            message: 'Iniciando extração de transações',
        });
        let pageIndex = 1;
        const totalPagesResult = await getTotalPagesTransactions(page, logs, orderCounter);
        const { totalPages } = totalPagesResult;
        orderCounter = totalPagesResult.newOrderCounter;
        do {
            const isEmpty = await page.$('[data-testid="emptyState"]');
            if (isEmpty) {
                logs.push({
                    order: orderCounter++,
                    message: 'Nenhuma transação encontrada - extrato vazio',
                });
                break;
            }
            const transactionRows = await page.$$('[data-testid^="div_Grid_Row"].table_transactions');
            logs.push({
                order: orderCounter++,
                message: `Extraindo página ${pageIndex} - ${transactionRows.length} transações encontradas`,
            });
            for (let i = (pageIndex === 1 ? 1 : 0); i < transactionRows.length; i++) {
                const indexItem = i - (pageIndex === 1 ? 1 : 0);
                const elementCache = {};
                let transaction = {
                    data: '',
                    operacao: '',
                    parceiros: '',
                    pontos: 0,
                    observacoes: '',
                };
                for (const [field, header] of [
                    ['Date', 'Data'],
                    ['Operation', 'Operacao'],
                    ['Partners', 'Parceiros'],
                    ['Points', 'Pontos'],
                    ['Observation', 'Observacoes'],
                ]) {
                    const dataTestId = `transaction${field}${indexItem}`;
                    if (elementCache[dataTestId] !== undefined) {
                        transaction[normalizeFieldName(header)] = elementCache[dataTestId];
                        continue;
                    }
                    const elementHandle = await page.$(`[data-testid='${dataTestId}']`);
                    let value = '';
                    if (elementHandle) {
                        value = await page.evaluate(element => element.textContent?.trim() || '', elementHandle);
                    }
                    if (normalizeFieldName(header) === 'pontos') {
                        const match = value.match(/^[+-]\s*([\d\.]+)(,\d+)?/);
                        if (match) {
                            let numStr = match[0].replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
                            transaction[normalizeFieldName(header)] = (Number(numStr));
                        }
                        else {
                            transaction[normalizeFieldName(header)] = 0;
                        }
                    }
                    else {
                        transaction[normalizeFieldName(header)] = value;
                    }
                }
                if (transaction.data) {
                    allTransactions.push(transaction);
                }
            }
            const nextButton = await page.$('[data-testid="div_Pagination_NextPage"] button:not([disabled])');
            if (nextButton) {
                await nextButton.click();
                await new Promise(timer => setTimeout(timer, 1200 + Math.random() * 800));
                pageIndex++;
            }
            else {
                logs.push({
                    order: orderCounter++,
                    message: 'Última página atingida - finalizando extração',
                });
                break;
            }
        } while (pageIndex <= totalPages && pageIndex < 20);
        logs.push({
            order: orderCounter++,
            message: `Extração concluída: ${allTransactions.length} transações coletadas`,
        });
    }
    catch (error) {
        logs.push({
            order: orderCounter++,
            message: `Erro ao extrair transações: ${error}`,
        });
    }
    return { extrato: allTransactions, newOrderCounter: orderCounter };
}
/**
  * Função para executar o RPA completo: acessar a página,
  * fazer login, navegar para extrato e coletar saldo e transações
 */
async function runLiveloRpa(credentials, startOrder) {
    const { browser, page } = await (0, puppteer_1.initPuppeteer)();
    const logs = [];
    let orderCounter = startOrder;
    const newCredential = {
        userName: credentials.userName,
        password: (0, crypto_1.decryptPassword)(credentials.password),
    };
    try {
        orderCounter = await accessingHomePage(page, logs, orderCounter);
        orderCounter = await performLogin(page, newCredential, logs, orderCounter);
        let balancePoints = 0;
        let extrato = [];
        const { newOrderCounter: navigateOrderCounter, success: navigateResult, } = await navigateToExtract(page, logs, orderCounter);
        orderCounter = navigateOrderCounter;
        if (navigateResult) {
            const { balancePoints: balanceResult, newOrderCounter: balanceOrderCounter, } = await collectExtractBalance(page, logs, orderCounter);
            balancePoints = balanceResult;
            orderCounter = balanceOrderCounter;
            if (balancePoints > 0) {
                const { extrato: extractResult, newOrderCounter: extractOrderCounter, } = await extractAllTransactions(page, logs, orderCounter);
                extrato = extractResult;
                orderCounter = extractOrderCounter;
            }
            else {
                logs.push({
                    order: orderCounter++,
                    message: 'Saldo zero ou inválido - pulando extração de transações',
                });
            }
        }
        await (0, puppteer_1.finishPuppeteer)(browser, page);
        return {
            balancePoints,
            extrato,
            logs,
            finalOrder: orderCounter,
        };
    }
    catch (error) {
        logs.push({
            order: orderCounter++,
            message: `ERRO CRÍTICO: ${error}`,
        });
        await (0, puppteer_1.finishPuppeteer)(browser, page);
        return {
            balancePoints: null,
            extrato: [],
            logs,
            finalOrder: orderCounter,
        };
    }
}
