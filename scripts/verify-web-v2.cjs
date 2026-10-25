// QA local com respostas simuladas. Nenhuma requisição de conta ou jogo chega ao Supabase.
const { chromium } = require(process.env.DECKY_PLAYWRIGHT_PATH || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const APP = process.env.DECKY_WEB_URL || 'http://localhost:8081';
const SITE = process.env.DECKY_SITE_URL || 'http://localhost:4173/site/';
const output = path.resolve('.expo/validation-v2/public');
const matrix = [[320,568],[375,667],[390,844],[667,375],[768,1024],[1024,768],[1366,768],[1920,1080]];
const uid = '00000000-0000-4000-8000-000000000001';
const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'demo@example.test',
  email_confirmed_at: '2026-10-23T00:00:00Z', user_metadata: { display_name: 'Ana Demo' }, app_metadata: { provider: 'email' } };
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: uid, exp: 4102444800, role: 'authenticated', aud: 'authenticated' })}.qa-local`;
const session = { access_token: token, refresh_token: 'qa-local', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user };
const match = (index) => ({ id: `00000000-0000-4000-8000-${String(100 + index).padStart(12,'0')}`, status: 'finished',
  score_a: 12, score_b: 8, winner_team: 'A', my_team: 'A', started_at: '2026-10-23T18:00:00Z', ended_at: '2026-10-23T18:20:00Z',
  game_mode: '1v1', ranked: true, points_before: 600, points_delta: 10, points_after: 610, rating_rule: 'decky-v2-5',
  players: [{ seat: 1, team:'A', user_id: uid, display_name: 'Ana Demo' }, { seat: 2, team:'B', user_id:'demo2', display_name:'Bia Demo' }] });
const apiCalls = [];
const pageErrors = [];
const findings = [];

async function mockBackend(context) {
  await context.route('https://*.supabase.co/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = { 'access-control-allow-origin':'*', 'access-control-allow-headers':'authorization,apikey,x-client-info,content-type',
      'access-control-allow-methods':'GET,POST,PUT,DELETE,OPTIONS' };
    if (request.method()==='OPTIONS') { await route.fulfill({status:204,headers}); return; }
    apiCalls.push(url.pathname);
    let data = [];
    if (url.pathname === '/auth/v1/user') data = user;
    else if (url.pathname.endsWith('/get_public_rooms')) data = [
      { id:'r1', code:'K7M2QX', host_name:'Sala de Bia Demo', game_mode:'1v1', player_count:1, capacity:2 },
      { id:'r2', code:'ABCDEF', host_name:'Sala de Caio Demo', game_mode:'2v2', player_count:4, capacity:4 },
    ];
    else if (url.pathname.endsWith('/get_rankings')) {
      const entries = [
        { position:1,user_id:'demo2',display_name:'Bia Demo',points:1705,played:150,wins:90,losses:60 },
        { position:2,user_id:uid,display_name:'Ana Demo',points:934,played:60,wins:44,losses:16 },
        { position:3,user_id:'demo3',display_name:'Caio Demo',points:605,played:24,wins:15,losses:9 },
      ];
      data = { entries, myEntry: entries[1] };
    } else if (url.pathname.endsWith('/get_my_match_history')) data = Array.from({ length:6 }, (_,i) => match(i));
    else if (url.pathname.endsWith('/get_my_notes_page')) data = [{ id:'note-demo',match_id:match(9).id,title:'Aquela virada',
      notes:'Boa parceria e um truco na hora certa.', created_at:'2026-10-23T19:00:00Z',updated_at:'2026-10-23T19:00:00Z',match:match(9) }];
    await route.fulfill({ status:200,headers,contentType:'application/json',body:JSON.stringify(data) });
  });
  if (context.routeWebSocket) await context.routeWebSocket('**/realtime/**', (socket) => socket.close());
}

async function ready(page) {
  await page.locator('body').evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).filter((img)=>img.loading!=='lazy').map((img)=>img.decode().catch(() => {})));
  });
  await page.waitForTimeout(450);
}

async function measure(page, screen, width, height) {
  const sizes = await page.evaluate(() => ({ width:innerWidth, scroll:document.documentElement.scrollWidth,
    body:document.body.scrollWidth, controls:Array.from(document.querySelectorAll('button,[role=button],input,a[href]')).length }));
  assert.ok(sizes.scroll <= width + 1 && sizes.body <= width + 1, `${screen}: overflow ${JSON.stringify(sizes)}`);
  findings.push({ screen,width,height,...sizes });
}

(async () => {
  fs.mkdirSync(output,{recursive:true});
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
  const context = await browser.newContext({ reducedMotion:'reduce',deviceScaleFactor:2 });
  await mockBackend(context);
  const page = await context.newPage();
  page.on('pageerror',(error)=>pageErrors.push(error.message));
  for (const route of ['/login','/register','/forgot-password','/auth/recovery#token_hash=invalid-demo','/auth/confirm#token_hash=invalid-demo']) {
    await page.goto(`${APP}${route}`,{waitUntil:'domcontentloaded'});
    await page.locator('input,[role=button]').first().waitFor();
    await ready(page);
    if (route.includes('token_hash')) {
      await page.waitForFunction(()=>!window.location.hash,null,{timeout:5000});
      assert.equal(new URL(page.url()).hash,'','Token precisa sair da barra de endereço');
      assert.equal(apiCalls.filter((entry)=>entry.endsWith('/verify')).length,0,'GET não pode consumir token');
    }
    for (const [width,height] of matrix) {
      await page.setViewportSize({width,height});
      await measure(page,route,width,height);
    }
    await page.setViewportSize({width:390,height:844});
    await ready(page);
    await page.screenshot({path:path.join(output,`${route.split('#')[0].replaceAll('/','-').slice(1)}-390.png`)});
  }
  await context.addInitScript((value) => localStorage.setItem('sb-yfijjtibyblzuplhtxbd-auth-token',JSON.stringify(value)),session);
  for (const route of ['/','/room/create','/room/join','/ranking','/history']) {
    await page.goto(`${APP}${route}`,{waitUntil:'domcontentloaded'});
    await page.getByText(route==='/ranking'?'Ranking':route==='/history'?'Histórico':route==='/room/join'?'Salas públicas':route==='/room/create'?'Criar sala':'Olá, Ana Demo',{exact:false}).first().waitFor();
    await ready(page);
    for (const [width,height] of matrix) {
      await page.setViewportSize({width,height});
      await measure(page,route,width,height);
    }
    await page.setViewportSize({width:390,height:844});
    await ready(page);
    const name = route==='/room/join'?'salas':route==='/history'?'historico':route==='/ranking'?'ranking':route==='/room/create'?'criar':'inicio';
    await page.screenshot({path:path.join(output,`${name}-390.png`),fullPage:false});
    if (route==='/history') {
      const back=page.getByRole('button',{name:'Voltar',exact:true});
      const before=await back.boundingBox();
      await page.mouse.move(200,600);
      await page.mouse.wheel(0,5000);
      await page.waitForTimeout(200);
      const after=await back.boundingBox();
      assert.ok(before && after && Math.abs(before.y-after.y)<1,'Voltar precisa permanecer fixo ao rolar');
      const matches=page.getByLabel('Paginação de partidas',{exact:true});
      await matches.getByRole('button',{name:'Próxima',exact:true}).click();
      await matches.getByText('Página 2',{exact:true}).waitFor();
      await page.getByLabel('Paginação de notas',{exact:true}).getByText('Página 1',{exact:true}).waitFor();
    }
  }
  await page.goto(SITE,{waitUntil:'domcontentloaded'});
  await ready(page);
  assert.equal(await page.locator('[data-download][href]').count(),0,'Sem release validada não pode oferecer download');
  for (const [width,height] of matrix) {
    await page.setViewportSize({width,height});
    await measure(page,'landing',width,height);
  }
  await page.setViewportSize({width:390,height:844});
  for (const image of await page.locator('img[loading=lazy]').all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((element)=>element.decode());
  }
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:path.join(output,'landing-390.png'),fullPage:true});
  const report = { source:'Edge headless, backend simulado local, sem validação de produção', findings,pageErrors,
    tokenAutoConsumption:apiCalls.filter((entry)=>entry.endsWith('/verify')).length };
  fs.writeFileSync(path.join(output,'web-matrix.json'),JSON.stringify(report,null,2)+'\n');
  assert.deepEqual(pageErrors,[],'Erros JS na revisão');
  console.log(JSON.stringify({checks:findings.length,pageErrors,tokenAutoConsumption:report.tokenAutoConsumption}));
  } finally { await browser.close(); }
})().catch((error)=>{console.error(error);process.exitCode=1});
