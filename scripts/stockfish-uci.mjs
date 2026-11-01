import {spawn} from 'node:child_process';
import readline from 'node:readline';

export class Stockfish {
 constructor(path,{threads=1,hash=128}={}){
  this.name='';this.pending=null;this.lines=[];
  this.process=spawn(path,[],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  readline.createInterface({input:this.process.stdout}).on('line',line=>{
   if(line.startsWith('id name '))this.name=line.slice(8);
   if(this.pending){this.lines.push(line);if(this.pending.match(line)){const p=this.pending;this.pending=null;clearTimeout(p.timer);p.resolve(this.lines);}}
  });
  this.process.on('error',error=>this.pending?.reject(error));
  this.process.on('exit',code=>{if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(new Error('Stockfish exited '+code));this.pending=null;}});
  this.ready=(async()=>{await this.command('uci',l=>l==='uciok');this.send(`setoption name Threads value ${threads}`);this.send(`setoption name Hash value ${hash}`);this.send('setoption name UCI_AnalyseMode value true');this.send('setoption name UCI_ShowWDL value true');await this.command('isready',l=>l==='readyok');})();
 }
 send(text){this.process.stdin.write(text+'\n');}
 command(text,match){return new Promise((resolve,reject)=>{if(this.pending)return reject(new Error('Concurrent UCI command'));this.lines=[];this.pending={resolve,reject,match,timer:setTimeout(()=>{this.send('stop');reject(new Error('UCI timeout'));},120000)};this.send(text);});}
 async analyse(fen,{nodes=1000000,depth,searchmoves}={}){
  await this.ready;this.send('ucinewgame');await this.command('isready',l=>l==='readyok');this.send('position fen '+fen);
  const lines=await this.command(`go ${depth?'depth '+depth:'nodes '+nodes}${searchmoves?' searchmoves '+searchmoves.join(' '):''}`,l=>l.startsWith('bestmove '));
  const info=lines.filter(l=>l.startsWith('info depth ')&&l.includes(' score ')).at(-1);
  if(!info)throw new Error('Missing score from Stockfish: '+lines.slice(-3).join('\n'));
  const score=info.match(/score (cp|mate) (-?\d+)/),pv=info.includes(' pv ')?info.split(' pv ')[1].trim().split(' '):[];
  return {engine:this.name,fen,depth:Number(info.match(/\bdepth (\d+)/)?.[1]),seldepth:Number(info.match(/\bseldepth (\d+)/)?.[1]),nodes:Number(info.match(/\bnodes (\d+)/)?.[1]),timeMs:Number(info.match(/\btime (\d+)/)?.[1]),score:{type:score[1],value:Number(score[2])},cp:score[1]==='cp'?Number(score[2]):(Number(score[2])===0?-100000:Math.sign(Number(score[2]))*(100000-Math.abs(Number(score[2])))),pv,best:lines.at(-1).split(' ')[1]};
 }
 async close(){await this.ready;this.send('quit');this.process.stdin.end();}
}
