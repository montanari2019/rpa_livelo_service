"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initPuppeteer = initPuppeteer;
exports.finishPuppeteer = finishPuppeteer;
exports.goToPuppeter = goToPuppeter;
const puppeteer_1 = __importDefault(require("puppeteer"));
/**
 * Acessa a página da Livelo, faz login e retorna o browser e a página logada.
   Função principal orquestradora
 */
async function initPuppeteer() {
    const browser = await puppeteer_1.default.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
        ],
        timeout: 60000,
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.evaluateOnNewDocument(`
        // Remover WebDriver
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });
        
        // Simular Chrome normal
        window.navigator.chrome = {
            runtime: {}
        };
        
        // Remover outras propriedades de automação
        Object.defineProperty(navigator, 'plugins', {
            get: () => [
                { name: 'Chrome PDF Plugin' },
                { name: 'Chrome PDF Viewer' },
                { name: 'Native Client' }
            ]
        });
    `);
    await page.setDefaultNavigationTimeout(60000);
    await page.setDefaultTimeout(60000);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
    });
    return {
        browser,
        page,
    };
}
/**
 * Função utilitária para finalizar o Puppeteer
 * Fecha a página e o navegador
 */
async function finishPuppeteer(browser, page) {
    await page.close();
    await browser.close();
}
/**
 * Função para navegar para uma URL específica usando Puppeteer
 * @param page Página do Puppeteer
 * @param url URL para navegar
 * @returns Mensagem de sucesso ou erro
 */
async function goToPuppeter(page, url) {
    await page.goto(url, { timeout: 30000, waitUntil: 'networkidle2' });
    return `Navegou para ${url} com sucesso.`;
}
