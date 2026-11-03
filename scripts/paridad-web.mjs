// Capturas web de la comparativa (spec 066): mismo viewport que el emulador, por rol y tema.
// Uso: node scripts/paridad-web.mjs <Pxx-slug> <ruta> [rol=admin] [--click=nombre,...] [--scroll=px,...] [--sin-sesion]
// --click toca, en orden, botones, enlaces, pestañas o textos por su nombre (abrir el menú, un dialog, una pestaña);
// con el prefijo sel: usa un selector de Playwright.
// Playwright no es dependencia del repo: se toma de PLAYWRIGHT_DIR (node_modules que lo contenga).
import { chmod, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const [id, route, rolArg, ...flags] = process.argv.slice(2);
if (!id || !route) throw new Error('Uso: node scripts/paridad-web.mjs <Pxx-slug> <ruta> [rol] [--scroll=px,...] [--sin-sesion]');
const rol = rolArg && !rolArg.startsWith('--') ? rolArg : 'admin';
const allFlags = [rolArg, ...flags].filter((f) => f?.startsWith('--'));
const scrolls = allFlags.find((f) => f.startsWith('--scroll='))?.slice(9).split(',').map(Number) ?? [];
const clicks = allFlags.find((f) => f.startsWith('--click='))?.slice(8).split(',') ?? [];
const sinSesion = allFlags.includes('--sin-sesion');

const base = `http://localhost:${process.env.CONDUCTOR_PORT ?? 3010}`;
const [width, height, dpr] = (process.env.PARIDAD_VIEWPORT ?? '390x844x3').split('x').map(Number);
const out = path.resolve(process.env.PARIDAD_DIR ?? '.context/paridad-visual/antes');
const names = { admin: 'Admin de prueba', miembro: 'Miembro de prueba', lector: 'Lector de prueba (TV)', cliente: 'Cliente de prueba' };
const { chromium } = createRequire(path.join(process.env.PLAYWRIGHT_DIR ?? '', 'noop.js'))('playwright');
await mkdir(out, { recursive: true });

// Chrome del sistema: no depende de que los navegadores de Playwright coincidan con su versión.
const browser = await chromium.launch({ channel: 'chrome' });
const authFile = path.resolve(`.context/paridad-visual/auth-${rol}.json`);
try {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({
      viewport: { width, height }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true,
      colorScheme: theme, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires',
      storageState: !sinSesion && existsSync(authFile) ? authFile : undefined,
    });
    await context.addInitScript((t) => localStorage.setItem('gw:theme', t), theme);
    const page = await context.newPage();
    if (!sinSesion && !existsSync(authFile)) {
      await page.goto(`${base}/login`);
      await page.getByRole('button', { name: `Entrar como ${names[rol]}` }).click();
      await page.waitForURL((u) => !u.pathname.startsWith('/login'));
      await context.storageState({ path: authFile });
      await chmod(authFile, 0o600);
    }
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    // El indicador de Next en desarrollo no es parte de la interfaz.
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    for (const name of clicks) {
      if (name.startsWith('sel:')) {
        await page.locator(name.slice(4)).first().click();
        await page.waitForTimeout(400);
        continue;
      }
      await page.getByRole('button', { name }).or(page.getByRole('link', { name })).or(page.getByRole('tab', { name })).or(page.getByRole('menuitem', { name }))
        .or(page.getByText(name, { exact: true })).first().click();
      await page.waitForTimeout(400);
    }
    await page.evaluate(() => document.fonts.ready);
    const file = (suffix = '') => path.join(out, `${id}-${rol}-${theme}-${width}${suffix}-web.png`);
    await page.screenshot({ path: file(), animations: 'disabled' });
    for (const [i, y] of scrolls.entries()) {
      await page.evaluate((top) => (document.scrollingElement ?? document.body).scrollTo(0, top), y);
      await page.waitForTimeout(300);
      await page.screenshot({ path: file(`-s${i + 2}`), animations: 'disabled' });
    }
    console.log(file());
    await context.close();
  }
} finally {
  await browser.close();
}
