(function(){
'use strict';
const mount=document.getElementById('femund-sykkelkart');if(!mount||mount.dataset.loading==='true'||mount.querySelector('#fe-cycle-map'))return;
const currentScript=document.currentScript;const base=new URL(mount.dataset.base||(currentScript?.src?'.':'https://cdn.jsdelivr.net/gh/sihoe/femundengerdal@main/sykkelkart/'),currentScript?.src||document.baseURI).href;
const poiUrl=mount.dataset.poisUrl||'https://raw.githubusercontent.com/sihoe/femundengerdal/main/poi/pois_femundengerdal.json';
const selectionUrl=mount.dataset.poiSelectionUrl||'https://raw.githubusercontent.com/sihoe/femundengerdal/main/poi/pois_femundengerdal_utvalg_sykkel.json';
const version='2026-11-13.4';mount.dataset.loading='true';mount.textContent='Laster sykkelrutene …';
function css(url){if([...document.querySelectorAll('link[rel="stylesheet"]')].some(x=>x.href===url))return;const e=document.createElement('link');e.rel='stylesheet';e.href=url;document.head.appendChild(e);}
function script(url){return new Promise((resolve,reject)=>{const e=document.createElement('script');e.src=url;e.onload=resolve;e.onerror=()=>reject(new Error('Kunne ikke laste kartkode.'));document.head.appendChild(e);});}
async function get(url,json){const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error('Kunne ikke hente '+new URL(url,document.baseURI).pathname+' ('+response.status+').');return json?response.json():response.text();}
(async()=>{try{
 css('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css');css(base+'kart.css?v='+version);
 const [data,markup,master,selection]=await Promise.all([get(base+'app-data.json?v='+version,true),get(base+'kart.html?v='+version,false),get(poiUrl,true),get(selectionUrl,true),script(base+'poi-model.js?v='+version),window.L?Promise.resolve():script('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'),script(base+'poi-adapter.js?v='+version)]);
 const config={...(data.mapConfig||{})};if(mount.dataset.season)config.season=mount.dataset.season;if(mount.dataset.categories)config.categories=mount.dataset.categories.split(',').map(x=>x.trim()).filter(Boolean);
 data.pois=window.FE_selectPois(window.FE_POI_MODEL.applySelection(master,selection),config);
 // Only runtime objects are selected; no second POI file is generated or saved.
 for(const p of data.pois){if(p.symbol==='marker')continue;if(!data.icons[p.symbol]){const file=p.symbol==='symbols_hundekjoering'?'symbols_hundekjoering.svg':'symbols-'+p.symbol+'.svg';data.icons[p.symbol]='https://cdn.jsdelivr.net/gh/sihoe/femundengerdal@main/symbols/'+encodeURIComponent(file);}}
 window.FE_MAP_DATA=data;window.FE_MAP_OFFLINE=false;mount.innerHTML=markup;await script(base+'kart.js?v='+version);
}catch(error){mount.textContent='Kartet kunne ikke lastes. '+error.message;mount.setAttribute('role','alert');mount.dataset.loading='false';console.error('Femund sykkelkart:',error);}})();
})();
