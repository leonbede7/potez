import fs from 'node:fs';
import path from 'node:path';
import {Stockfish} from './stockfish-uci.mjs';

const research=path.resolve('../opening-research');
const snapshot=process.argv[2]||path.join(research,'original-part2.json');
const nodes=Number(process.argv[3]||1000000),workers=Number(process.argv[4]||4);
if(!fs.existsSync(snapshot)){
 const {advancedRepertoires}=await import('../src/advanced-repertoires.js');
 const {studyCoursePgn}=await import('../src/personal-repertoires.js');
 const {parseRepertoire}=await import('../src/model.js');
 fs.writeFileSync(snapshot,JSON.stringify(advancedRepertoires.map(c=>({...c,lines:parseRepertoire(studyCoursePgn(c))})),null,2));
}
const courses=JSON.parse(fs.readFileSync(snapshot,'utf8'));
const cacheFile=path.join(research,`stockfish19-${nodes}.jsonl`),cache=new Map();
const key=fen=>fen.split(' ').slice(0,4).join(' ');
if(fs.existsSync(cacheFile))for(const line of fs.readFileSync(cacheFile,'utf8').split('\n').filter(Boolean)){const r=JSON.parse(line);cache.set(key(r.fen),r);}
const positions=new Map();for(const c of courses)for(const l of c.lines)for(const m of l.moves){positions.set(key(m.before),m.before);positions.set(key(m.after),m.after);}
const tasks=[...positions.entries()].filter(([k])=>!cache.has(k));let done=0,cursor=0;const started=Date.now();
console.log(JSON.stringify({snapshot:path.basename(snapshot),uniquePositions:positions.size,cached:positions.size-tasks.length,tasks:tasks.length,nodes,workers}));
await Promise.all(Array.from({length:workers},async()=>{
 const engine=new Stockfish(path.join(research,'stockfish19/stockfish/stockfish-windows-x86-64-universal.exe'));
 try{for(;;){const task=tasks[cursor++];if(!task)break;const [k,fen]=task;const r=await engine.analyse(fen,{nodes});cache.set(k,r);fs.appendFileSync(cacheFile,JSON.stringify(r)+'\n');done++;if(done%25===0){const progress={done,total:tasks.length,elapsedSeconds:Math.round((Date.now()-started)/1000)};fs.writeFileSync(path.join(research,'audit-progress.json'),JSON.stringify(progress));console.log(JSON.stringify(progress));}}}finally{await engine.close();}
}));
const rows=[];
for(const c of courses)for(const [li,l]of c.lines.entries()){
 if(l.kind==='decision')continue;
 for(const [ply,m]of l.moves.entries()){
  const before=cache.get(key(m.before)),after=cache.get(key(m.after));
  const uci=m.from+m.to+(m.promotion||'');
  rows.push({courseId:c.id,chapter:li+1,title:l.name,ply:ply+1,moveNumber:m.before.split(' ')[5],color:m.color,own:m.color===c.color,san:m.san,uci,beforeFen:m.before,afterFen:m.after,lossCp:before.best===uci?0:Math.max(0,before.cp+after.cp),best:before.best,beforeCp:before.cp,afterCp:-after.cp,depth:before.depth,afterDepth:after.depth,nodes:before.nodes});
 }
}
const report={engine:'Stockfish 19',nodes,positions:positions.size,rows};
const reportFile=snapshot.replace(/\.json$/,`-audit-${nodes}.json`);fs.writeFileSync(reportFile,JSON.stringify(report,null,2));
console.log(JSON.stringify({report:reportFile,ownOver50:rows.filter(r=>r.own&&r.lossCp>50).length,allOver100:rows.filter(r=>r.lossCp>100).length,worst:rows.filter(r=>r.own).sort((a,b)=>b.lossCp-a.lossCp).slice(0,12).map(({courseId,chapter,moveNumber,san,lossCp,best})=>({courseId,chapter,moveNumber,san,lossCp,best}))}));
