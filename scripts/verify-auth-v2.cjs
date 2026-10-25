// QA local de URLs sensíveis, sem tráfego real de autenticação.
const { chromium } = require(process.env.DECKY_PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = process.env.DECKY_WEB_URL || 'http://localhost:8081';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => {
      const replace = window.history.replaceState.bind(window.history);
      window.__deckyHistory = [];
      window.history.replaceState = (...args) => {
        window.__deckyHistory.push(String(args[2]));
        return replace(...args);
      };
    });
    const calls = [];
    await context.route('https://*.supabase.co/**', async (route) => {
      const headers = {
        'access-control-allow-origin': app, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
        'access-control-expose-headers': 'x-supabase-api-version', 'x-supabase-api-version': '2024-01-01',
      };
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers });
        return;
      }
      calls.push(new URL(route.request().url()).pathname);
      await route.fulfill({ status: 403, headers, contentType: 'application/json', body: JSON.stringify({ code: 'otp_expired', message: 'Token inválido para QA local' }) });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    for (const [route, title] of [
      ['/auth/recovery#token_hash=invalid-demo', 'Nova senha'],
      ['/auth/confirm#token_hash=invalid-demo', 'Confirme seu e-mail'],
      ['/auth/recovery?token_hash=invalid-demo', 'Nova senha'],
      ['/auth/confirm?token_hash=invalid-demo', 'Confirme seu e-mail'],
    ]) {
      const before = calls.length;
      await page.goto(`${app}${route}`, { waitUntil: 'domcontentloaded' });
      await page.getByText(title, { exact: true }).waitFor();
      assert.equal(calls.length, before, 'Montar a página não pode consumir o token');
      try {
        await page.waitForFunction(() => !window.location.hash && !window.location.search, null, { timeout: 5000 });
      } catch (error) {
        console.error(await page.evaluate(() => ({ pathname: location.pathname, replacedPaths: window.__deckyHistory })), errors);
        throw error;
      }
      assert.equal(new URL(page.url()).hash, '', 'Fragmento precisa sair do histórico e da barra');
      assert.equal(new URL(page.url()).search, '', 'Parâmetros sensíveis precisam sair do histórico e da barra');
      if (route.includes('recovery')) {
        assert.equal(await page.locator('#new-password').count(), 1, 'Token precisa sobreviver em memória à limpeza da URL');
      } else {
        assert.equal(await page.getByRole('button', { name: 'Confirmar e-mail', exact: true }).count(), 1);
      }
      assert.equal(calls.length, before, 'Limpar URL não pode validar token automaticamente');
    }

    await page.getByRole('button', { name: 'Confirmar e-mail', exact: true }).click();
    try {
      await page.getByText('Este link não está mais disponível. Solicite um novo link.', { exact: false }).waitFor({ timeout: 5000 });
    } catch (error) {
      console.error({ calls, alerts: await page.getByRole('alert').allTextContents() });
      throw error;
    }
    assert.equal(calls.filter((entry) => entry.endsWith('/verify')).length, 1, 'Só a ação explícita deve chamar verifyOtp');

    await page.goto(`${app}/login`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Entrar com Google', exact: true }).waitFor();
    await page.waitForFunction(() => Array.from(document.images).length >= 2
      && Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0));
    const images = await page.locator('img').evaluateAll((items) => items.map((image) => ({ width: image.naturalWidth, height: image.naturalHeight })));
    assert.ok(images.every((image) => image.width > 0 && image.height > 0), 'Logo Decky e Google precisam decodificar');
    assert.equal(await page.locator('#current-password').getAttribute('autocomplete'), 'current-password');
    assert.deepEqual(errors, [], 'Nenhum erro JS no fluxo');
    const report = {
      checkedAt: new Date().toISOString(), environment: 'Edge headless local com Auth simulado, sem validação de produção',
      sensitiveRoutes: 4, automaticVerifications: 0, explicitVerifications: 1, images, pageErrors: errors,
    };
    fs.mkdirSync(path.resolve('.expo/validation-v2/public'), { recursive: true });
    fs.writeFileSync(path.resolve('.expo/validation-v2/public/auth-web.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
