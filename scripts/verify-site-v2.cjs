const { chromium } = require(process.env.DECKY_PLAYWRIGHT_PATH || 'playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve('site');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.webp':'image/webp', '.ttf':'font/ttf' };
const server = http.createServer((request,response)=>{
  const url = new URL(request.url,'http://localhost');
  if (!url.pathname.startsWith('/Decky/')) { response.writeHead(404); response.end(); return; }
  const filename = path.resolve(root,decodeURIComponent(url.pathname.slice('/Decky/'.length)) || 'index.html');
  if (!filename.startsWith(`${root}${path.sep}`) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) {response.writeHead(404);response.end();return;}
  response.writeHead(200,{'content-type':mime[path.extname(filename)] || 'application/octet-stream','cache-control':'no-store'});
  fs.createReadStream(filename).pipe(response);
});
const release = { schemaVersion:1,platform:'android',version:'2.0.0',buildNumber:42,
  downloadUrl:'https://github.com/rbrecci/Decky/releases/download/qa-local/decky.apk',publishedAt:'2026-10-23T12:00:00.000Z' };
(async()=>{
  await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}/Decky/`;
  const browser = await chromium.launch({channel:'msedge',headless:true});
  const errors=[];
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    page.on('pageerror',(error)=>errors.push(error.message));
    const failures=[];
    page.on('response',(response)=>{if(response.url().startsWith(base) && response.status()>=400)failures.push(response.url());});
    await page.route('**/version.json',(route)=>route.fulfill({contentType:'application/json',body:'{}'}));
    await page.goto(base);
    await page.getByText('Download Android temporariamente indisponível.',{exact:true}).waitFor();
    assert.equal(await page.locator('[data-download][href]').count(),0);
    await page.route('**/version.json',(route)=>route.fulfill({contentType:'application/json',body:JSON.stringify(release)}));
    await page.reload();
    await page.getByText('Android 2.0.0 · build 42',{exact:true}).waitFor();
    const links=await page.locator('[data-download]').evaluateAll((items)=>items.map((item)=>item.href));
    assert.deepEqual(links,[release.downloadUrl,release.downloadUrl]);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Ir ao conteúdo');
    for (const dimensions of [[320,568],[1366,768]]) {
      await page.setViewportSize({width:dimensions[0],height:dimensions[1]});
      await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Fonte 200% precisa caber em ${dimensions[0]}px`);
      await page.evaluate(()=>{document.documentElement.style.fontSize='';});
    }
    for (const image of await page.locator('img[loading=lazy]').all()) {await image.scrollIntoViewIfNeeded();await image.evaluate((item)=>item.decode());}
    for (const name of ['privacidade.html','termos.html','suporte.html']) {await page.goto(`${base}${name}`);assert.ok(await page.locator('h1').innerText());}
    const ios=await browser.newPage({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1'});
    await ios.goto(base);
    assert.equal(await ios.locator('body.ios').count(),1);
    assert.equal(await ios.locator('.hero .web').evaluate((item)=>getComputedStyle(item).order),'-1');
    const plain=await browser.newPage({javaScriptEnabled:false});
    await plain.goto(base);
    assert.equal(await plain.getByRole('link',{name:'Jogar no navegador',exact:true}).count(),2);
    assert.deepEqual(failures,[],'Recursos locais precisam respeitar /Decky/');
    assert.deepEqual(errors,[]);
    const report={prefix:'/Decky/',invalidManifest:true,sharedDownloadLinks:links.length,font200PercentWidths:[320,1366],keyboardSkipLink:true,
      iosCtaUserAgentSimulation:true,noJavaScriptWebAccess:true,resourceFailures:failures,pageErrors:errors};
    fs.mkdirSync(path.resolve('.expo/validation-v2/public'),{recursive:true});
    fs.writeFileSync(path.resolve('.expo/validation-v2/public/site-web.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report));
  } finally {await browser.close();await new Promise((resolve)=>server.close(resolve));}
})().catch((error)=>{console.error(error);process.exitCode=1;server.close();});
