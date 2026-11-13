(function(global){
'use strict';
const allowedCategories=new Set(['overnatting','handel','spisesteder','attraksjoner','aktiviteter','andre']);
function normalizeSymbol(s){return String(s||'marker').replace(/\.svg$/i,'').replace(/^symbols-/,'');}
function selectPois(records,config){
 if(!Array.isArray(records))throw new Error('Felles POI-database må være en liste.');
 const categories=new Set(config.categories||[...allowedCategories]);const excluded=new Set(config.excludeServiceTypes||[]);const out=[];
 for(const record of records){
  if(record.active===false)continue;
  const title=record.texts?.no?.title||record.title||'';
  const services=Array.isArray(record.services)?record.services:[];
  const eligible=services.filter(s=>s.active!==false&&allowedCategories.has(s.category)&&categories.has(s.category)&&!excluded.has(s.type)&&Array.isArray(s.seasons)&&(s.seasons.includes(config.season)||s.seasons.includes('all')));
  const locations=Array.isArray(record.locations)&&record.locations.length?record.locations.map(l=>Array.isArray(l)?{latlng:l}:l):[{latlng:record.latlng}];
  const seen=new Set();
  for(const service of eligible)for(const location of locations){
   const latlng=location.latlng;if(!Array.isArray(latlng)||latlng.length!==2||!latlng.every(Number.isFinite)||Math.abs(latlng[0])>90||Math.abs(latlng[1])>180)continue;
   const symbol=normalizeSymbol(service.symbolType||record.symbolType);const key=JSON.stringify([latlng,service.category,symbol]);if(seen.has(key))continue;seen.add(key);
   const text=service.shortDescription??record.shortDescription??record.texts?.no?.description??'';
   const description=String(text).replace(/\s+/g,' ').trim();
   out.push({id:record.id,sourcePoiId:record.id,title:location.title||title,description:description.length>280?description.slice(0,277).replace(/\s+\S*$/,'')+'…':description,latlng,symbol,category:service.category,serviceType:service.type,url:service.url||record.url||'',image:record.imageUrl||null});
  }
 }
 return out;
}
global.FE_selectPois=selectPois;
})(typeof window!=='undefined'?window:globalThis);
