(function(g){'use strict';
const norm=s=>String(s||'marker').replace(/\.svg$/i,'').replace(/^symbols[-_]/,'');
const types={seng:['overnatting','accommodation'],hytte:['overnatting','accommodation'],telt:['overnatting','camping'],bobil:['overnatting','camping'],glamping:['overnatting','accommodation'],bestikk:['spisesteder','food'],kaffe:['spisesteder','food'],butikk:['handel','shop'],handlekurv:['handel','shop'],lokalmat:['handel','shop'],bygg:['andre','construction'],hundekjoering:['aktiviteter','dogsledding'],ski:['aktiviteter','ski'],snoscooter:['aktiviteter','snowmobile'],ri:['aktiviteter','horse_riding'],taxi:['andre','taxi'],buss:['andre','transport'],'anlop-femund':['aktiviteter','boat_trip'],rein:['attraksjoner','reindeer'],kultur:['attraksjoner','culture'],severdighet:['attraksjoner','attraction'],kirke:['attraksjoner','culture'],seter:['attraksjoner','culture']};
const activity=new Set(['bade','badstue','baatutleie','kano','fiske','sykkel','vandre','stamp','teleskop']);
function derived(symbol){const s=norm(symbol),pair=types[s]||(activity.has(s)?['aktiviteter',s]:['andre',s]);return {category:pair[0],type:pair[1],seasons:['ski','snoscooter','hundekjoering'].includes(s)?['winter']:['summer','winter'],symbolType:s};}
function reconcile(record,symbols){const old=record.services||[];return [...new Set(symbols.map(norm))].flatMap(s=>{const matches=old.filter(x=>norm(x.symbolType||record.symbolType)===s);return matches.length?matches.map(x=>({...x})): [derived(s)];});}
function applySelection(master,selection){
 if(!Array.isArray(master))throw Error('POI-basen må være en liste.');
 if(!selection||selection.format!=='femundengerdal-poi-selection-v2'||!Array.isArray(selection.items))throw Error('Utvalgsfilen må ha format femundengerdal-poi-selection-v2.');
 const byId=new Map(master.map(p=>[p.id,p])),seen=new Set(),out=[];
 for(const item of selection.items){if(!item||typeof item.id!=='string'||seen.has(item.id))throw Error('Ugyldig eller duplisert ID i kartutvalg.');seen.add(item.id);const p=byId.get(item.id);if(!p)throw Error('Sted mangler i POI-basen: '+item.id);
 const available=[norm(p.symbolType),...(p.secondarySymbols||[]).map(norm),...(p.services||[]).map(s=>norm(s.symbolType||p.symbolType))];
 const symbols=Array.isArray(item.symbols)?item.symbols.map(norm):[...new Set(available)];if(symbols.some(s=>!available.includes(s)))throw Error('Valgt symbol finnes ikke lenger i basen for '+item.id+'. Oppdater kartutvalget.');
 const services=reconcile(p,symbols);out.push({...p,services});}
 return out;
}
g.FE_POI_MODEL={norm,derived,reconcile,applySelection};
})(typeof window!=='undefined'?window:globalThis);
