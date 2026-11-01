import fs from 'node:fs';
import path from 'node:path';
import {Chess} from 'chess.js';
import {Stockfish} from './stockfish-uci.mjs';

const research=path.resolve('../opening-research'),entries=JSON.parse(fs.readFileSync(path.join(research,'verified-theory/entries.json'),'utf8'));
const personalRepertoires=JSON.parse(fs.readFileSync(path.join(research,'original-part1.json'),'utf8'));
const old=JSON.parse(fs.readFileSync(path.join(research,'original-part2.json'),'utf8'));
const nodes=Number(process.argv[2]||1000000),workers=4;
const priorCourses=nodes>1000000?JSON.parse(fs.readFileSync(path.join(research,'rebuilt-1000000.json'),'utf8')):[];
const key=fen=>fen.split(' ').slice(0,4).join(' '),cacheFile=path.join(research,`stockfish19-${nodes}.jsonl`),cache=new Map(),pending=new Map();
if(fs.existsSync(cacheFile))for(const line of fs.readFileSync(cacheFile,'utf8').split('\n').filter(Boolean)){const r=JSON.parse(line);cache.set(key(r.fen),r);}
const specs=[
 ['leon-white-slav',0,'Klasična Slavenka: središnja kontrola',/Slav Defense: Czech Variation, Classical System, Main Line$/,8],
 ['leon-white-slav',1,'Izmjenska Slavenka: razvoj bez gubitka materijala',/Slav Defense: Exchange Variation, Trifunovic Variation$/,8],
 ['leon-white-slav',2,'Meran: konkretna borba za centar',/Meran Variation, Rellstab Attack$/,16],
 ['leon-white-slav',4,'Poluslavenka: mirni razvoj i središnji proboj',/^Semi-Slav Defense: Chigorin Defense$/,12,13],
 ['leon-white-qgd',0,'Carlsbad: Nge2 i priprema centra',/Exchange Variation, Reshevsky Variation$/,15,20,'Nge2'],
 ['leon-white-qgd',1,'Carlsbad: Nf3 i aktivnost topova',/Exchange Variation, Reshevsky Variation$/,14,17,'Nf3'],
 ['leon-white-qgd',3,'Tarrasch: blokada i aktivnost figura',/Tarrasch Defense: Classical Variation, Chandler Variation$/,14],
 ['leon-white-qgd',4,'Polu-Tarrasch: središnja napetost',/Semi-Tarrasch Defense, Main Line$/,10],
 ['leon-white-qg-sidelines',1,'Prihvaćeni gambit: središnji sustav',/Accepted: Central Variation, Alekhine System$/,6],
 ['leon-white-qg-sidelines',3,'Protiv Albina: siguran fianchetto',/Albin Countergambit, Fianchetto Variation, Be6 Line$/,6],
 ['leon-white-qg-sidelines',4,'Protiv Albina: sustav s Nbd2',/Albin Countergambit, Krenosz Variation$/,6],
 ['leon-white-qg-sidelines',5,'Čigorin: razvoj i odgovor na pritisak',/^Queen's Gambit Declined: Chigorin Defense$/,6],
 ['leon-white-d4-others',0,'Englund: razvoj uz taktičku budnost',/^Englund Gambit: Main Line$/,4],
 ['leon-white-d4-others',2,'Nimzo-indijska: klasični Qc2',/Classical Variation, Keres Defense$/,8],
 ['leon-white-d4-others',3,'Kraljevoindijska: bajunetni sustav',/Bayonet Attack, Sokolov's Line$/,16],
 ['leon-white-d4-others',4,'Grünfeld: potpora i aktivnost centra',/Exchange Variation, Sokolsky Variation$/,14],
 ['leon-black-dragon',1,'Soltis: obrana i aktivna c-linija',/Dragon Variation, Yugoslav Attack, Soltis Variation$/,12],
 ['leon-black-dragon',2,'Dragon protiv 9.O-O-O: središnji odgovor',/Dragon Variation, Yugoslav Attack, Modern Line$/,12],
 ['leon-black-dragon',3,'Topalovljev Dragon: pravodoban protunapad',/Dragon Variation, Yugoslav Attack, Topalov Variation$/,12],
 ['leon-black-dragon',4,'Klasični Dragon: središnje razmjene',/Dragon Variation, Classical Variation, Bernard Defense$/,12],
 ['leon-black-anti-sicilian',0,'Alapin: pritisak na središte',/^Sicilian Defense: Alapin Variation, Smith-Morra Declined$/,8],
 ['leon-black-anti-sicilian',2,'Moskva: razvoj poslije izmjene lovaca',/Moscow Variation, Haag Gambit$/,8],
 ['leon-black-anti-sicilian',3,'Grand Prix: odgovor u centru',/Grand Prix Attack, Schofman Variation$/,10,10],
 ['leon-black-anti-sicilian',5,'Rani Bc4: razvoj bez automatskog fianchetta',/Sicilian Defense: Bowdler Attack$/,3],
 ['leon-black-e5',0,'Pianissimo: priprema središnjih proboja',/Giuoco Pianissimo, Main Line$/,10],
 ['leon-black-e5',3,'Španjolska: čigorinska središnja struktura',/Chigorin Defense, Panov System$/,22],
 ['leon-black-e5',1,'Otvorena talijanska: konkretna obrana',/Giuoco Piano, Krause Variation$/,12,14],
 ['leon-black-e5',5,'Škotska: koordinacija i sigurnost kralja',/Scotch Game: Gottschall Variation$/,12,12],
 ['leon-black-fianchetto',0,'Kraljevoindijska: zatvoreni centar',/Classical System, Kozul Gambit$/,18],
 ['leon-black-fianchetto',2,'Fianchetto: aktivnost prema centru',/Fianchetto Variation, Long Variation$/,14],
 ['leon-black-fianchetto',4,'London protiv fianchetta: razvoj i protunapad',/^London System, with Be2$/,10,10],
 ['leon-black-fianchetto',9,'Simetrična engleska: dvostruki fianchetto',/^English Opening: Symmetrical Variation, Double Fianchetto$/,8],
 ['leon-black-d5',0,'Albin: razvoj nakon prihvaćenog gambita',/Albin Countergambit, Fianchetto Variation, Be6 Line$/,6],
 ['leon-black-d5',1,'Albin: središnja nadoknada uz Nbd2',/Albin Countergambit, Krenosz Variation$/,6],
 ['leon-black-d5',3,'London protiv d5: aktivna obrana',/^Queen's Pawn Game: London System$/,8,11],
 ['leon-black-d5',4,'Colle: nadzor središnjeg proboja',/^Queen's Pawn Game: Colle System$/,6,7]
];
async function analyse(engine,fen){
 const k=key(fen);if(cache.has(k))return cache.get(k);if(pending.has(k))return pending.get(k);
 const p=engine.analyse(fen,{nodes}).then(r=>{cache.set(k,r);fs.appendFileSync(cacheFile,JSON.stringify(r)+'\n');pending.delete(k);return r;});pending.set(k,p);return p;
}
const uciMove=(chess,uci)=>chess.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});
function chooseSource(spec){
 const [, , ,re,,limit,contains]=spec;
 const candidates=entries.filter(e=>re.test(e.name)&&(!contains||e.sans.includes(contains)));
 if(!candidates.length)throw new Error('Missing theory: '+re);
 if(limit){const exact=candidates.find(e=>e.sans.length===limit);if(exact)return exact;}
 return candidates.sort((a,b)=>b.sans.length-a.sans.length)[0];
}
const results=[];let cursor=0;
await Promise.all(Array.from({length:workers},async()=>{
 const engine=new Stockfish(path.join(research,'stockfish19/stockfish/stockfish-windows-x86-64-universal.exe'));
 try{for(;;){const index=cursor++,spec=specs[index];if(!spec)break;
  const [baseId,baseIndex,title,,fixedPlies,limit]=spec,source=chooseSource(spec);
  const prior=priorCourses.find(c=>c.parentId===baseId)?.results.find(r=>r.baseIndex===baseIndex);
  const canonical=prior?prior.moves.map(m=>m.san):source.sans.slice(0,limit||source.sans.length),chess=new Chess(),moves=[],evidence=[],visited=new Set([key(chess.fen())]);
  let followingTheory=true,retained=0;
  for(let ply=0;ply<40&&!chess.isCheckmate()&&!chess.isStalemate();ply++){
   const before=chess.fen(),a=await analyse(engine,before);if(a.best==='0000')break;
   let intended=followingTheory?canonical[ply]:null,loss=0,chosen=a.best,kind='engine',comparison=null,restrictedAnalysis=null;
   if(intended){
    const probe=new Chess(before),m=probe.move(intended),b=await analyse(engine,probe.fen());
    const uci=m.from+m.to+(m.promotion||'');loss=a.best===uci?0:Math.max(0,a.cp+b.cp);comparison={afterCp:b.cp,afterDepth:b.depth,afterNodes:b.nodes};
    if(ply<fixedPlies||loss<=30){chosen=uci;kind=prior?'checked-continuation':'theory';retained=ply+1;}else followingTheory=false;
   }
   const proposed=new Chess(before);uciMove(proposed,chosen);
   if(visited.has(key(proposed.fen()))){
    const alternatives=chess.moves({verbose:true}).filter(m=>!visited.has(key(m.after))).map(m=>m.from+m.to+(m.promotion||''));
    if(!alternatives.length)break;
    const alternative=await engine.analyse(before,{nodes,searchmoves:alternatives});
    loss=Math.max(0,a.cp-alternative.cp);if(loss>30)break;
    chosen=alternative.best;kind='engine-alternative';followingTheory=false;restrictedAnalysis={best:alternative.best,cp:alternative.cp,depth:alternative.depth,nodes:alternative.nodes,allowedUci:alternatives};
   }
   const played=uciMove(chess,chosen);moves.push({...played,before,after:chess.fen()});visited.add(key(chess.fen()));
   evidence.push({ply:ply+1,san:played.san,uci:chosen,kind,committedRoot:ply<fixedPlies,lossCp:kind==='engine'?0:loss,fen:before,engineBest:a.best,depth:a.depth,nodes:a.nodes,cp:a.cp,comparison,restrictedAnalysis});
  }
  retained=0;while(source.sans[retained]&&source.sans[retained]===moves[retained]?.san)retained++;
  const reached=new Map(moves.map((m,i)=>[key(m.after),i+1]));
  const actualTheory=entries.filter(e=>e.sans.length>=2&&reached.has(e.positions.at(-1))).sort((a,b)=>reached.get(b.positions.at(-1))-reached.get(a.positions.at(-1))||b.sans.length-a.sans.length)[0];
  const prefixOnly=!actualTheory||retained>reached.get(actualTheory.positions.at(-1));
  const cited=prefixOnly?source:actualTheory,theoryPlies=prefixOnly?retained:reached.get(actualTheory.positions.at(-1));
  if(theoryPlies<2)throw new Error('No published opening prefix: '+title);
  const prefixBoard=new Chess();for(const san of source.sans.slice(0,retained))prefixBoard.move(san);
  const finalAnalysis=await analyse(engine,chess.fen());
  results[index]={baseId,baseIndex,title,fixedPlies,theory:{eco:cited.eco,name:cited.name,pgn:prefixOnly?prefixBoard.pgn():cited.pgn,sourcePgn:cited.pgn,prefixOnly,plies:theoryPlies,sourcePlies:cited.sans.length,transposition:!prefixOnly&&cited.sans.some((san,i)=>moves[i]?.san!==san),source:cited.source,commit:fs.readFileSync(path.join(research,'verified-theory/commit.txt'),'utf8').trim()},selectedSource:source.source,retainedCanonicalPlies:retained,moves,evidence,finalAnalysis};
  fs.writeFileSync(path.join(research,`rebuilt-${nodes}-partial.json`),JSON.stringify(results));
  console.log(JSON.stringify({done:results.filter(Boolean).length,total:specs.length,course:baseId,title,theoryPlies,end:moves.length}));
 }}finally{await engine.close();}
}));
const byCourse=new Map();
for(const r of results){if(!byCourse.has(r.baseId))byCourse.set(r.baseId,[]);byCourse.get(r.baseId).push(r);}
const output=personalRepertoires.filter(p=>byCourse.has(p.id)).map(parent=>({id:parent.id+'-part2',parentId:parent.id,color:parent.color,name:'Part 2 · '+parent.name,results:byCourse.get(parent.id),lines:byCourse.get(parent.id).map(r=>({name:r.title,startFen:new Chess().fen(),kind:'continuation',moves:r.moves}))}));
fs.writeFileSync(path.join(research,`rebuilt-${nodes}.json`),JSON.stringify(output,null,2));
console.log('Rebuilt '+results.length+' verified continuations.');
