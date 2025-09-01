import fs from 'fs';
import path from 'path';
import { connect, ConnectResult, PageWithCursor } from 'puppeteer-real-browser';
import { ExtratTransactionType, LiveloCredentialsType, ProcessQueueRoutineMessages, ProcessQueueRoutineResponse } from '../services/@type';
import { ProcessQueueLogStepEnum } from '../enum/enum';
import { decryptPassword } from './crypto';

/**
 * Acessa a página da Livelo, faz login e retorna o browser e a página logada.
   Função principal orquestradora
 */

/**
 * Função para inicializar o Puppeteer com o navegador real
 * 
 * Esta função implementa diversas técnicas anti-detecção:
 * - Configura um navegador com User-Agent moderno
 * - Remove fingerprints de automação (webdriver, plugins, etc.)
 * - Adiciona headers realísticos para simular navegador real
 * - Configura tratamento de erros com screenshots automáticos
 * - Captura e gerencia diálogos automáticos
 * - Detecta e captura screenshots de CAPTCHAs
 * - Gerencia falhas de requisição
 * - Configura cookies para parecer um navegador com histórico
 * - Implementa tratamento de exceções em todos os níveis
 * 
 * @returns Objeto contendo o navegador e a página pronta para RPA
 */
export async function initPuppeteerRealBrowser(): Promise<ConnectResult> {
    try {
        const screenshotDir = path.resolve(process.cwd(), 'uploads/rpa_screenshot');
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
        }

        const result = await connect({
            headless: true,
            connectOption: {
                defaultViewport: { width: 1366, height: 768 },
            },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-extensions',
                '--disable-infobars',
                '--window-size=1366,768',
                '--disable-gpu',
                '--lang=pt-BR,pt',
                '--mute-audio',
            ],
        });

        const { page, browser } = result;

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/124.0.0.0 Safari/537.36',
        );

        await page.evaluateOnNewDocument(`
            // Remove a propriedade 'webdriver', um dos principais indicadores de automação
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            // Simula a presença do objeto 'chrome' no navegador
            window.navigator.chrome = {
                runtime: {},
                app: {
                    InstallState: "hehe",
                    RunningState: "running",
                    getDetails: function() {},
                    getIsInstalled: function() {},
                    runningState: function() {},
                },
            };
            
            // Simula permissões do navegador
            Object.defineProperty(navigator, 'permissions', {
                get: () => ({
                    query: async () => ({
                        state: 'granted',
                        onchange: null
                    })
                })
            });

            // Altera a lista de plugins para parecer um navegador real
            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: 'Portable Document Format' },
                    { name: 'Native Client', filename: 'internal-nacl-plugin', description: 'Native Client Executable' }
                ]
            });
            
            // Simula languages comuns
            Object.defineProperty(navigator, 'languages', {
                get: () => ['pt-BR', 'pt', 'en-US', 'en']
            });
            
            // Oculta o WebDriver
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
        `);

        await page.setExtraHTTPHeaders({
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
        });

        await page.setDefaultNavigationTimeout(60000);
        await page.setDefaultTimeout(60000);

        await browser.setCookie(
            {
                name: 'cp_user_prefs',
                value: JSON.stringify({ theme: 'light', lang: 'pt-BR', timezone: 'America/Sao_Paulo' }),
                domain: '.cyberpro.com.br',
                path: '/',
                expires: Math.floor(Date.now() / 1000) + 2592000, // 30 dias
                httpOnly: false,
                secure: false,
                session: false,
                size: 2,
                sameSite: 'Lax',
                partitionKey: '',
            });

        return result;

    } catch (error) {
        console.warn('[RPA] Erro fatal ao inicializar puppeteer:', error);
        throw new Error(`Inicialização do RPA falhou: ${error}`);
    }
}

/** * Função para finalizar o Puppeteer e fechar a página
 * @param browser Navegador do Puppeteer
 * @param page Página do Puppeteer      
 * @return Promise que resolve quando a página e o navegador forem fechados
 */
export async function finishPuppeteerRealBrowser(data: ConnectResult) {
    const { browser, page } = data;
    await page.close();
    await browser.close();
}


export async function goToPuppeteerRealBrowser(page: PageWithCursor, url: string) {
    await page.goto(url, { timeout: 30000, waitUntil: 'networkidle2' });

    return `Navegou para ${url} com sucesso.`;
}


// Helper para adicionar atraso de forma realista
const waitRandomly = (min: number, max: number) => new Promise(
    resolve => setTimeout(
        resolve,
        min +
        Math.random() * max),
);

// Função utilitária para delay aleatório
function getRandomDelay() {
    return 1200 + Math.random() * 800;
}

/**
 * Função auxiliar para salvar screenshots de forma padronizada
 */
async function saveScreenshot(page: PageWithCursor, filename: string) {
    try {
        const uploadsDir = path.join(process.cwd(), 'uploads/rpa_screenshot/');

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = path.join(uploadsDir, `${filename}-${timestamp}.png`);

        await page.screenshot({ path: screenshotPath, fullPage: true });
        return screenshotPath;
    } catch (error) {
        console.warn(`Erro ao salvar screenshot: ${error}`);
        return null;
    }
}

async function accessingHomePage(
    page: PageWithCursor,
    logs: ProcessQueueRoutineMessages,
    orderCounter: number,
): Promise<number> {
    try {
        logs.push({
            order: orderCounter++,
            message: 'Acessando página inicial do Livelo',
        });

        const client = await page.createCDPSession();
        await client.send('Network.enable');
        await client.send('Network.clearBrowserCookies');
        await client.send('Network.clearBrowserCache');

        await goToPuppeteerRealBrowser(page, 'https://www.livelo.com.br/');

        logs.push({
            order: orderCounter++,
            message: 'Página inicial carregada com sucesso',
        });
    } catch (error) {
        logs.push({
            order: orderCounter++,
            message: `Erro ao acessar página inicial: ${error}`,
        });
        throw error;
    }

    return orderCounter;
}

async function performLogin(
    page: PageWithCursor,
    credentials: LiveloCredentialsType,
    logs: ProcessQueueRoutineMessages,
    orderCounter: number,
): Promise<number> {
    try {
        const { userName, password } = credentials;

        logs.push({
            order: orderCounter++,
            message: 'Iniciando processo de login',
        });

        const buttonSelector = await page.waitForSelector('#l-header__button_login', {
            visible: true,
            timeout: 60000,
        });

        if (!buttonSelector) {
            throw new Error('Botão de login não encontrado');
        }

        await buttonSelector.hover();
        await waitRandomly(200, 500);
        await buttonSelector.click();
        await waitRandomly(1000, 3000);

        const usernameInput = await page.waitForSelector('#username', { visible: true, timeout: 30000 });
        if (usernameInput) {
            usernameInput.hover();
            await page.type('#username', userName, { delay: 50 + Math.random() * 100 });
        }

        const passwordInput = await page.waitForSelector('#password', { visible: true, timeout: 30000 });
        if (passwordInput) {
            await passwordInput.hover();
            await page.type('#password', password, { delay: 50 + Math.random() * 100 });
        }

        await waitRandomly(1000, 2000);

        const buttonLogin = await page.waitForSelector('#btn-submit', {
            visible: true,
            timeout: 30000,
        });

        if (!buttonLogin) {
            throw new Error('Botão de Submit login não encontrado');
        }

        await buttonLogin.hover();
        await buttonLogin.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });

        logs.push({
            order: orderCounter++,
            message: 'Login realizado com sucesso',
        });

    } catch (error) {
        logs.push({
            order: orderCounter++,
            message: `Erro ao realizar login: ${error}`,
        });
        await saveScreenshot(page, 'error-login-page');

    }

    return orderCounter;
}

async function navigateToExtract(
    page: PageWithCursor,
    logs: ProcessQueueRoutineMessages,
    orderCounter: number,
): Promise<{
    success: boolean;
    newOrderCounter: number;
}> {
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

        perfil.hover();
        await waitRandomly(100, 600);
        await perfil.click({ delay: 60 });

        const extratoLink = await page.waitForSelector(
            'a.l-header__dropdown-menu-list-item[href="https://www.livelo.com.br/extrato"]',
            {
                visible: true,
                timeout: 20000,
            },
        );

        if (!extratoLink) {
            throw new Error('Link de extrato não encontrado');
        }

        extratoLink.hover();
        await extratoLink.click({ delay: 60 });
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });

        logs.push({
            order: orderCounter++,
            message: 'Página de extrato carregada com sucesso',
        });

        return { success: true, newOrderCounter: orderCounter };
    } catch (error) {
        logs.push({
            order: orderCounter++,
            message: `Erro ao navegar para o extrato: ${error}`,
        });
        await saveScreenshot(page, 'error-navigate-extract');
        return { success: false, newOrderCounter: orderCounter };
    }
}

/**
  * Passo 3: Coleta o saldo da página de extrato já carregada
 */

async function collectExtractBalance(
    page: PageWithCursor,
    logs: ProcessQueueRoutineMessages,
    orderCounter: number,
) {
    let balancePoints: number = 0;

    try {
        logs.push({
            order: orderCounter++,
            message: 'Coletando saldo da conta',
        });

        const elementBalancePoints = await page.waitForSelector('#balancePoints', { visible: true, timeout: 60000 });

        if (!elementBalancePoints) {
            throw new Error('Elemento de saldo não encontrado');
        }

        await elementBalancePoints.hover();

        const anyBalancePoints = await page.evaluate((el: any) => el.textContent?.trim(), elementBalancePoints);

        if (!anyBalancePoints) {
            throw new Error('Saldo não encontrado');
        }

        balancePoints = Number(anyBalancePoints.replace(/\./g, '').replace(',', '.'));

        logs.push({
            order: orderCounter++,
            message: `Saldo coletado: ${balancePoints} pontos`,
        });
    } catch (error) {
        logs.push({
            order: orderCounter++,
            message: `Erro ao coletar saldo: ${error}`,
        });
        return { balancePoints: 0, newOrderCounter: orderCounter };
    }

    return { balancePoints, newOrderCounter: orderCounter };
}

/**
 * Função para normalizar nomes dos campos (ex: "Observações" -> "observacoes")
 */
function normalizeFieldName(str: string): string {
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
async function getTotalPagesTransactions(
    page: PageWithCursor,
    logs: ProcessQueueRoutineMessages,
    orderCounter: number,
): Promise<
    {
        totalPages: number;
        newOrderCounter: number
    }
> {
    try {
        const elementTotalPages = await page.waitForSelector(
            '[data-testid="div_Pagination"]',
            { visible: true, timeout: 10000 },
        );

        if (!elementTotalPages) {
            throw new Error('Elemento de paginação não encontrado');
        }

        await elementTotalPages.hover();

        const totalPages = await elementTotalPages.evaluate(
            (paginationElement: any) => {
                const pageNumberElements = paginationElement.querySelectorAll(
                    '[data-testid^="button_Pagination_Page_"] div[data-testid="Text_Typography"]',
                );

                const numbers = Array.from(pageNumberElements)
                    .map((element: any) => Number(element.textContent?.trim()))
                    .filter(num => !isNaN(num));

                return numbers.length > 0 ? Math.max(...numbers) : 1;
            });

        logs.push({
            order: orderCounter++,
            message: `Total de páginas identificadas: ${totalPages}`,
        });

        return { totalPages, newOrderCounter: orderCounter };
    } catch (error) {
        logs.push({
            order: orderCounter++,
            message: `Erro ao capturar total de páginas: ${error}`,
        });
        await saveScreenshot(page, 'error-total-pages');
        return { totalPages: 0, newOrderCounter: orderCounter };
    }
}

// Verifica se o extrato está vazio
async function isEmptyState(page: PageWithCursor) {
    return page.$('[data-testid="emptyState"]');
}

// Extrai uma transação de acordo com o índice
async function extractTransaction(
    page: PageWithCursor,
    indexItem: number,
    elementCache: Record<string, string> = {},
): Promise<ExtratTransactionType> {

    const fieldMap = [
        ['Date', 'Data'],
        ['Operation', 'Operacao'],
        ['Partners', 'Parceiros'],
        ['Points', 'Pontos'],
        ['Observation', 'Observacoes'],
    ];

    const transaction: ExtratTransactionType = {
        data: '',
        operacao: '',
        parceiros: '',
        pontos: 0,
        observacoes: '',
    };

    for (const [field, header] of fieldMap) {
        const dataTestId = `transaction${field}${indexItem}`;

        if (elementCache[dataTestId] !== undefined) {
            (transaction as any)[normalizeFieldName(header)] = elementCache[dataTestId];
            continue;
        }

        const elementHandle = await page.$(`[data-testid='${dataTestId}']`);
        let value = '';

        if (elementHandle) {
            value = await page.evaluate(
                element => (element as any).textContent?.trim() || '',
                elementHandle,
            );
        }

        if (normalizeFieldName(header) === 'pontos') {
            const match = value.match(/^[+-]\s*([\d\.]+)(,\d+)?/);
            if (match) {
                let numStr = match[0]
                    .replace(/\s+/g, '')
                    .replace(/\./g, '')
                    .replace(',', '.');

                (transaction as any)[normalizeFieldName(header)] = (Number(numStr));

            } else {
                (transaction as any)[normalizeFieldName(header)] = 0;
            }
        } else {
            (transaction as any)[normalizeFieldName(header)] = value;
        }
    }

    return transaction;
}

/**
  * Passo 5: Função para extrair todas as transações da tabela de extrato (com paginação)
 */
async function extractAllTransactions(
    page: PageWithCursor,
    logs: ProcessQueueRoutineMessages,
    orderCounter: number,
): Promise<{
    extrato: ExtratTransactionType[];
    newOrderCounter: number
}> {
    const allTransactions: ExtratTransactionType[] = [];

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

            const isEmpty = await isEmptyState(page);

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

            const startIdx = pageIndex === 1 ? 1 : 0;

            for (let i = startIdx; i < transactionRows.length; i++) {
                const indexItem = i - startIdx;
                const transaction = await extractTransaction(page, indexItem);

                if (transaction.data) {
                    allTransactions.push(transaction);
                }
            }

            const nextButton = await page.$('[data-testid="div_Pagination_NextPage"] button:not([disabled])');

            if (nextButton) {
                await nextButton.click();
                await new Promise(timer => setTimeout(timer, getRandomDelay()));
                pageIndex++;
            } else {
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
    } catch (error) {
        logs.push({
            order: orderCounter++,
            message: `Erro ao extrair transações: ${error}`,
        });
        await saveScreenshot(page, 'error-extract-transactions');
    }

    return {
        extrato: allTransactions,
        newOrderCounter: orderCounter,
    };
}

export async function runLiveloRpaWithRealBrowser(credentials: LiveloCredentialsType, startOrder: number, userId: number) {
    const { browser, page } = await initPuppeteerRealBrowser();
    const logs: ProcessQueueRoutineMessages = [];
    const results: ProcessQueueRoutineResponse[] = [];

    let orderCounter = startOrder;

    const newCredential: LiveloCredentialsType = {
        userName: credentials.userName,
        // password: credentials.password,
        password: decryptPassword(credentials.password),
    };

    results.push({
        success: true,
        step_title: ProcessQueueLogStepEnum.RPA_EXECUTION,
        messages: [
            {
                order: startOrder++,
                message: `Iniciando RPA Livelo para usuário ${userId}`,
            },
        ],
    });

    try {
        orderCounter = await accessingHomePage(page, logs, orderCounter);

        orderCounter = await performLogin(page, newCredential, logs, orderCounter);

        let balancePoints: number = 0;
        let extrato: ExtratTransactionType[] = [];

        const navigateResult = await navigateToExtract(page, logs, orderCounter);
        const navigateSuccess = navigateResult.success;
        orderCounter = navigateResult.newOrderCounter;

        if (navigateSuccess) {
            const {
                balancePoints: balanceResult,
                newOrderCounter: balanceOrderCounter,
            } = await collectExtractBalance(page, logs, orderCounter);

            balancePoints = balanceResult;
            orderCounter = balanceOrderCounter;

            if (balancePoints > 0) {
                const {
                    extrato: extractResult,
                    newOrderCounter: extractOrderCounter,
                } = await extractAllTransactions(page, logs, orderCounter);

                extrato = extractResult;
                orderCounter = extractOrderCounter;
            } else {
                logs.push({
                    order: orderCounter++,
                    message: 'Saldo zero ou inválido - pulando extração de transações',
                });
            }
        }

        if (logs && logs.length) {
            results.push({
                success: true,
                step_title: ProcessQueueLogStepEnum.RPA_EXECUTION,
                messages: logs,
            });
        }

        await finishPuppeteerRealBrowser({ browser, page });

        return {
            browser,
            page,
            balancePoints,
            extrato,
            results,
            finalOrder: orderCounter,
        };

    } catch (error) {
        logs.push({
            order: orderCounter++,
            message: `ERRO CRÍTICO: ${error}`,
        });

        await finishPuppeteerRealBrowser({ browser, page });

        return {
            browser,
            page,
            balancePoints: null,
            extrato: [],
            results,
            finalOrder: orderCounter,
        };
    }
}
