(function(){
'use strict';
const mount=document.getElementById('femund-sykkelkart');if(!mount||mount.dataset.loading==='true'||mount.querySelector('#fe-cycle-map'))return;
mount.dataset.loading='true';const base=mount.dataset.base||'https://cdn.jsdelivr.net/gh/sihoe/femundengerdal@main/sykkelkart/v1/';
function css(url){if([...document.querySelectorAll('link[rel="stylesheet"]')].some(x=>x.href===url))return;const e=document.createElement('link');e.rel='stylesheet';e.href=url;document.head.appendChild(e);}
function script(url){return new Promise((resolve,reject)=>{const e=document.createElement('script');e.src=url;e.onload=resolve;e.onerror=()=>reject(new Error('Kunne ikke laste kartkode.'));document.head.appendChild(e);});}
async function get(name,type){const response=await fetch(base+name+'?v=2026-11-12.1',{cache:'no-store'});if(!response.ok)throw new Error('Kunne ikke laste '+name+' ('+response.status+').');return type==='json'?response.json():response.text();}
mount.textContent='Laster sykkelrutene …';
(async()=>{try{
css('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css');css(base+'kart.css?v=2026-11-12.1');
const values=await Promise.all([get('app-data.json','json'),get('kart.html','text'),window.L?Promise.resolve():script('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js')]);
window.FE_MAP_DATA=values[0];window.FE_MAP_OFFLINE=false;mount.innerHTML=values[1];await script(base+'kart.js?v=2026-11-12.1');
}catch(error){mount.textContent='Kartet kunne ikke lastes. '+error.message;mount.setAttribute('role','alert');mount.dataset.loading='false';console.error('Femund sykkelkart:',error);}})();
})();
