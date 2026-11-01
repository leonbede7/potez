import fs from 'node:fs';
import crypto from 'node:crypto';
import {Chess} from 'chess.js';

const research='../opening-research/',input=research+'rebuilt-3000000.json';
const courses=JSON.parse(fs.readFileSync(input,'utf8')),parents=JSON.parse(fs.readFileSync(research+'original-part1.json','utf8'));
const notes=[
 ['D-linija i razvoj podupiru središnji proboj. Nakon ...c5 ponovno prebroji napadače i branitelje prije uzimanja pješaka.','Pritisak na b7 uskladi s obranom c3 i sigurnošću kralja. Ne postavljaj top na dijagonalu protivnikova lovca bez računanja.','Meranska struktura zahtijeva konkretan račun uz središnje proboje i žrtve. Šahovi i povrat materijala imaju prednost pred općim pravilima.','Kad se centar otvori, razvoj i aktivne linije važniji su od unaprijed zamišljenog napada na krilu.'],
 ['Raspored s Nge2 daje drukčije mogućnosti od ranog Nf3. Pripremu e4/f3 uskladi s razmjenama i sigurnošću kralja.','U sustavu s Nf3 najprije procijeni aktivnost figura i središte. Manjinski napad nije automatski plan u svakoj poziciji.','Kontroliraj d5 i prati kako razmjene mijenjaju izoliranog pješaka u povezani pješački par. Ne zanemari aktivnost crnih figura.','Razvoj topova i kontrola središnjih polja prethode novom proboju. Poslije središnjih izmjena ponovno procijeni strukturu.'],
 ['Središnji prostor mora imati potporu figura. Nakon povrata c4-pješaka kontroliraj d4 i dovrši razvoj.','Bijeli može dopustiti povrat gambitnog pješaka radi razvoja i sigurnosti. Napredni d4-pješak procijeni kao ograničenje i moguću metu.','Raspored skakača odgovara ograničenju koje stvara d4. Konkretne izmjene u centru važnije su od čuvanja svakog pješaka.','Najprije osiguraj centar pa otvaraj linije. Aktivni lovci i topovi moraju podupirati središnje razmjene.'],
 ['Protiv rane dame traži razvoj s tempom i provjeri svako uzimanje. Ne preskači taktičke mogućnosti radi mehaničke rokade.','Qc2 je dio klasičnog sustava; na ...d5 reagiraj prema napetosti u centru. Par lovaca nije jedini cilj.','U bajunetnom sustavu b4 traži odgovor na ...a5, a ...f5 mijenja središnju napetost. Ne provodi pješački napad bez podrške figura.','Široki centar zahtijeva aktivne figure i točno računanje. Materijalna žrtva dopuštena je samo u konkretno provjerenom slijedu.'],
 ['...h5 pripada odabranoj Soltisovoj strukturi. Protiv napada na kralja računaj tempo, c-liniju i konkretne razmjene.','Protiv duge rokade bez Bc4 središnji proboj mijenja cijeli položaj. Ne kopiraj slijepo plan bočnog pješačkog napada.','Poslije ...Nxd4 i Bxd4 traži aktivan protunapad, a ne spor razvoj bez računanja. Posebno provjeri mogućnosti na daminom krilu.','Kada su rokade kratke, središnje razmjene imaju drukčiji smisao. Provjeri redoslijed izmjene skakača prije proboja.'],
 ['Razvoj ...e6 i ...Be7 te pritisak na d4 mogu biti prikladniji od automatskog fianchetta.','Nakon razmjene lovaca izračunaj središnje prijetnje prije mirnog razvoja. Uzimanje e4 mora biti konkretno opravdano.','Na napad na kralja odgovori pravodobnom igrom u centru. Svako otvaranje e- ili d-linije mijenja procjenu.','Rani Bc4 ne nalaže raspored Dragona. Biraj razvoj i središnju reakciju prema stvarnoj poziciji.'],
 ['U mirnoj talijanskoj koordinacija figura priprema ...d5. Poslije otvaranja centra ponovno procijeni aktivnost svih figura.','Čigorinski raspored traži razumijevanje središnje napetosti i manevriranja skakača, bez automatskog guranja rubnih pješaka.','Na središnji napad bijelog odgovori konkretnim računanjem. Provjeri mogućnost ...Nxe4 prije rutinske izmjene lovaca.','Pritisak dame mora pratiti razvoj i sigurnost kralja. Tematski ...d5 ne igraj bez provjere taktike.'],
 ['Zatvoreni centar dopušta igru na krilu, ali bijeli c5 zahtijeva konkretan odgovor. Napad se mora uskladiti s obranom daminog krila.','U fianchetto sustavu aktivnost u centru i polja skakača važniji su od kopiranja napada iz zatvorenog centra.','Protiv Londona prvo poveži razvoj s pravodobnim ...e5 ili ...c5. Dama ne mora rano loviti pješake.','U simetričnoj engleskoj dvostruki fianchetto traži pozornost prema d4 i središnjim izmjenama. Isti lovac na g7 ne znači isti plan kao u Dragonu.'],
 ['Albin je svjestan rizičniji gambit. Poslije prihvaćanja prioritet su razvoj i aktivnost, a ne neprovjeren napad rubnim pješacima.','Protiv Nbd2 traži središnju nadoknadu i aktivna polja. Gambit ne jamči jednakost i ne smije ovisiti o zamci.','Protiv Londona bori se za centar i aktivnost lovaca. Svaki ...f6 ili ...g6 mijenja sigurnost kralja.','Prije bijelog e4 izgradi aktivan raspored i pripremi središnje razmjene. Topove poveži s otvorenim linijama.']
];
const format=moves=>moves.map((m,i)=>`${m.color==='w'||i===0?m.before.split(' ')[5]+(m.color==='w'?'. ':'... '):''}${m.san}${m.comment?' {'+m.comment.replace(/[{}]/g,'')+'}':''}`).join(' ');
const question=move=>move.san.includes('+')?'Kako iskoristiti tempo šaha u ovom položaju?':({n:'Koji skakačev manevar odgovara ovoj poziciji u provjerenoj grani?',b:'Kako aktivirati ili sačuvati lovca u ovoj poziciji?',r:'Kako topom iskoristiti aktivnu liniju ili konkretnu razmjenu?',q:'Gdje dama može poduprijeti aktivnost bez zanemarivanja prijetnji?',p:'Koja promjena pješačke strukture odgovara ovoj poziciji?',k:'Kako riješiti položaj kralja nakon promjene centra?'})[move.piece];
const positions=new Set(),allEvidence=[],patches={},packageCourses=[];
let minDepth=Infinity,maxDepth=0;
for(const [ci,c]of courses.entries()){
 const parent=parents.find(p=>p.id===c.parentId),lessons=[],chapterSources=[];patches[parent.id]={};
 for(const [i,r]of c.results.entries()){
  if(r.evidence.length!==r.moves.length)throw new Error('Missing move evidence');
  if(r.evidence.some(e=>!e.committedRoot&&e.lossCp>30))throw new Error('Unacceptable non-root move '+r.title);
  if(r.evidence.some(e=>e.nodes<3000000)||!r.finalAnalysis)throw new Error('Insufficient engine evidence '+r.title);
  const ds=r.evidence.map(e=>e.depth).concat(r.finalAnalysis.depth),range=[Math.min(...ds),Math.max(...ds)];
  minDepth=Math.min(minDepth,...ds);maxDepth=Math.max(maxDepth,...ds);
  for(const m of r.moves){positions.add(m.before.split(' ').slice(0,4).join(' '));positions.add(m.after.split(' ').slice(0,4).join(' '));}
  const moves=r.moves.map(m=>({...m,comment:''}));
  moves[Math.min(r.theory.plies-1,moves.length-1)].comment=`Teorijska osnova ${r.theory.eco}: ${r.theory.plies} polupoteza iz javnog zapisa ili isti položaj drugim redoslijedom. Slijedi nastavak provjeren Stockfishom 19.`;
  const teaching=moves.findIndex((m,ply)=>ply>=r.theory.plies&&m.color===parent.color);
  if(teaching>=0)moves[teaching].comment=notes[ci][i];
  const title=`0${i+1} · ${r.title}`,source={title,eco:r.theory.eco,source:r.theory.source,theoryPlies:r.theory.plies,minDepth:range[0],maxDepth:range[1],kind:'continuation',committedPlies:r.fixedPlies};
  lessons.push({title,moves:format(moves),plan:notes[ci][i],kind:'continuation',origin:`${r.theory.eco} · revidirana teorijska grana`,baseIndex:r.baseIndex,source:r.theory.source,verification:'Stockfish 19; 3000000 nodes per position; revision 2'});chapterSources.push(source);
  const basic=moves.slice(0,24);patches[parent.id][r.baseIndex]={title:`${String(r.baseIndex+1).padStart(2,'0')} · ${r.title} — osnova`,moves:format(basic),plan:notes[ci][i],source:r.theory.source};
  allEvidence.push({courseId:c.id,chapter:i+1,title:r.title,theory:r.theory,committedPlies:r.fixedPlies,finalAnalysis:r.finalAnalysis,moves:r.evidence});
 }
 for(let i=0;i<2;i++){
  const r=c.results[i],start=Math.min(Math.max(r.theory.plies,24),r.moves.length-8);
  let cut=start;if(r.moves[cut].color!==parent.color)cut++;
  const selected=r.moves.slice(cut,cut+8).map(m=>({...m,comment:''}));selected[0].comment=notes[ci][i];
  const title=`0${i+5} · Odluka: ${r.title}`,evidence=r.evidence.slice(cut,cut+8),ds=evidence.map(e=>e.depth);
  lessons.push({title,moves:format(selected),fen:selected[0].before,kind:'decision',prompt:question(selected[0]),origin:`${r.theory.eco} · provjereni nastavak poglavlja 0${i+1}`,plan:notes[ci][i],source:r.theory.source,verification:'Stockfish 19; 3000000 nodes per position; revision 2'});
  chapterSources.push({title,kind:'decision',eco:r.theory.eco,source:r.theory.source,theoryPlies:r.theory.plies,minDepth:Math.min(...ds),maxDepth:Math.max(...ds)});
 }
 const ds=chapterSources.flatMap(s=>[s.minDepth,s.maxDepth]);
 packageCourses.push({id:c.id,parentId:parent.id,lessons,chapterSources,sources:[...new Set(c.results.map(r=>r.theory.source))],'verification':{revision:2,engine:'Stockfish 19',nodes:3000000,minDepth:Math.min(...ds),maxDepth:Math.max(...ds),maxLossCp:30,branches:4,drills:2}});
}
const oldAudit=JSON.parse(fs.readFileSync(research+'original-part2-audit-1000000.json','utf8'));
const example=oldAudit.rows.find(r=>r.courseId==='leon-white-slav-part2'&&r.chapter===2&&r.moveNumber==='16'&&r.san==='Rc2');
const report={revision:2,engine:'Stockfish 19',engineRelease:'https://github.com/official-stockfish/Stockfish/releases/tag/sf_19',binarySha256:'3c8bf1f9ea66a09350a40df4f632288285ac206d99f33ab5842c408fc30b48a7',nodesPerPosition:3000000,depthRange:[minDepth,maxDepth],checkedBranches:36,checkedDrills:18,uniqueFinalPositions:positions.size,originalScreening:{positions:oldAudit.positions,nodes:oldAudit.nodes,candidateOwnMovesOver50Cp:oldAudit.rows.filter(r=>r.own&&r.lossCp>50).length,confirmedExample:example},method:'Every final move has an actual Stockfish evaluation. Opening commitments are explicit and excluded from a claim of globally optimal opening choice. Outside those commitments, generated best moves or checked alternatives lose at most 30 centipawns under the stated search. This is a finite engine check, not a proof of absolute optimality. Theory prefixes or transposed positions link to a pinned CC0 source. The master database required OAuth and was not used.',branches:allEvidence};
fs.writeFileSync('src/verified-opening-data.json',JSON.stringify({revision:2,courses:packageCourses,part1Patches:patches,summary:{engine:report.engine,nodes:report.nodesPerPosition,positions:report.uniqueFinalPositions,minDepth,maxDepth}},null,2)+'\n');
fs.writeFileSync('public/repertoires/opening-verification.json',JSON.stringify(report,null,2)+'\n');
const md=`# Provjera i ispravak otvaranja — revizija 2

Prethodni Part 2 sadržavao je izvorne ilustrativne nastavke provjerene samo kao legalne. To nije bila dovoljna provjera kvalitete. Primjer stvarne greške: 16.Rc2 u izmjenskoj Slavenki dopušta ...Bxc2 i gubi topa. Stare nepouzdane grane zamijenjene su.

## Provedena provjera

- Stara verzija: ${oldAudit.positions} jedinstvenih pozicija, početni pregled s 1.000.000 Stockfish čvorova po poziciji. Označeno je 66 vlastitih poteza s procijenjenim padom većim od 0,50; to su kandidati za provjeru, a ne 66 dokazanih grubih grešaka.
- Nova verzija: 36 grana i 18 izvedenih vježbi; ${positions.size} jedinstvenih pozicija.
- Motor: **Stockfish 19**, službeno izdanje sf_19. Najmanje 3.000.000 čvorova po neterminalnoj poziciji. Dubina glavnih pretraga: **${minDepth}–${maxDepth}**. Jedna dretva, Hash 128 MB po procesu, UCI_AnalyseMode, ponovno postavljanje hasha prije nove pozicije.
- Nakon odabranog teorijskog polazišta: najviše 0,30 gubitka motoričke procjene prema najboljem izračunatom nastavku. Alternativni nastavci bez beskorisnog ponavljanja dodatno su izračunati ograničenom pretragom.
- Prvi potezi određuju željeno otvaranje. Posebno: Albin je rizičniji izbor; provjera njegova nastavka ne znači da je 2...e5 bolji izbor od ...e6 ili ...c6.
- Teorija: službena CC0 baza lichess-org/chess-openings, točno verzionirana u svakoj poveznici. Naveden je teorijski početak ili ista pozicija nastala drugim redoslijedom. To nije tvrdnja da je cijeli nastavak preuzet iz majstorske partije.
- Lichess Masters API zahtijevao je OAuth i nije korišten; izvještaj ne izmišlja broj majstorskih partija.

Ovo je konačna računalna provjera na navedenim postavkama, ne matematički dokaz apsolutno najboljih poteza. Motor nije ugrađen u trening; trening prihvaća poteze iz repertoara.

## Izvori i poglavlja

${allEvidence.map(b=>`### ${b.courseId} · ${b.chapter}. ${b.title}\n\n- Teorijski zapis: [${b.theory.eco} · ${b.theory.name}](${b.theory.source})\n- Doseg teorijske osnove: ${b.theory.plies} polupoteza${b.theory.prefixOnly?' (početni dio javnog zapisa)':b.theory.transposition?' (isti položaj, drugi redoslijed)':''}.\n- Odabrano početno polazište: prvih ${b.committedPlies} polupoteza; nije tvrdnja da je odabrana obrana globalno najbolja.\n- Motorički zapis svih poteza: u priloženom opening-verification.json.\n`).join('\n')}

## Sigurna nadogradnja

Povezani uvodi u Partu 1 ispravljeni su. To ne predstavlja motoričku potvrdu svih preostalih Part 1 poglavlja. Stari ugrađeni PGN-i i promijenjeni zapisi napretka spremaju se lokalno u studyContentBackups. Nepromijenjeni potezi zadržavaju napredak. Nazivi, odabrana boja, arhiva, vlastiti PGN-i i bilješke ostaju sačuvani.

Službeni motor: https://stockfishchess.org/download/ . SHA-256 preuzetog službenog paketa: ${report.binarySha256}.
`;
fs.writeFileSync('public/repertoires/opening-verification.md',md);
console.log(JSON.stringify({courses:packageCourses.length,branches:36,drills:18,positions:positions.size,minDepth,maxDepth,dataSha256:crypto.createHash('sha256').update(fs.readFileSync('src/verified-opening-data.json')).digest('hex')}));
