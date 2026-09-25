import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base=new URL('rift-forge/',process.env.SITE);
const local=new URL('../../public/rift-forge/',import.meta.url);
const html=readFileSync(new URL('index.html',local),'utf8');
const release=JSON.parse(readFileSync(new URL('src/release.js',local),'utf8').split('window.RIFT_RELEASE = ')[1].replace(/;\s*$/,''));
const paths=['./?release='+release.version,...[...html.matchAll(/(?:src|href)="(\.\/[^\"]+)"/g)].map(m=>m[1]),...Object.values(release.sprites),release.floor];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
await Promise.all(paths.map(async path=>{
 const response=await fetch(new URL(path,base),{cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error(`Live asset ${path}: HTTP ${response.status}`);
 const file=path.split('?')[0]==='./'?'index.html':path.split('?')[0];
 if(digest(Buffer.from(await response.arrayBuffer()))!==digest(readFileSync(new URL(file,local))))throw new Error(`Published content differs: ${path}`);
}));
console.log(`LIVE_RIFT_ART_VERIFIED ${release.version}: entry, scripts, stylesheet and all five atlases and arena art match the release.`);
