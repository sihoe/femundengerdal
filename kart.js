(function(){
'use strict';
const root=document.getElementById('fe-cycle-map');if(!root)return;
const D=window.FE_MAP_DATA,OFFLINE=!!window.FE_MAP_OFFLINE;
const $=id=>root.querySelector('#'+id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,d=1)=>Number(v).toLocaleString('nb-NO',{minimumFractionDigits:d,maximumFractionDigits:d});
const colors={asphalt:'#183f6e',gravel:'#7d4d1f',trail:'#579241',boat:'#b7dde0'},names={asphalt:'Asfalt',gravel:'Grus',trail:'Sti',boat:'Båt'};
let selected=null,profileHover=null,currentMode='topo';
const map=L.map($('fe-leaflet-map'),{preferCanvas:true,zoomControl:false,scrollWheelZoom:false,minZoom:6,maxZoom:17});L.control.zoom({position:'topright'}).addTo(map);L.control.scale({position:'bottomright',imperial:false}).addTo(map);
map.createPane('fe-routes');map.getPane('fe-routes').style.zIndex=410;
map.createPane('fe-pois');map.getPane('fe-pois').style.zIndex=430;
const routeLayers=L.layerGroup().addTo(map),poiLayers=L.layerGroup().addTo(map),startLayers=L.layerGroup().addTo(map),hoverLayers=L.layerGroup().addTo(map);
const normalTiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19});
let base;
if(OFFLINE){base=L.imageOverlay(D.basemap,D.basemapBounds,{opacity:1,attribution:'Kartverket · © OpenStreetMap'}).addTo(map);$('fe-basemap-control').hidden=true;map.setMaxBounds(D.basemapBounds);}else{
 const Hybrid=L.GridLayer.extend({createTile:function(coords,done){const tile=document.createElement('canvas');tile.width=tile.height=256;const ctx=tile.getContext('2d');const osm=new Image(),topo=new Image();let loaded=0;const paint=()=>{if(++loaded<2)return;try{if(osm.naturalWidth)ctx.drawImage(osm,0,0,256,256);else{ctx.fillStyle='#eee9e0';ctx.fillRect(0,0,256,256);}if(topo.naturalWidth&&D.norway.length){ctx.save();ctx.beginPath();for(const ring of D.norway){ring.forEach((p,i)=>{const s=256*Math.pow(2,coords.z),lat=p[1]*Math.PI/180;const x=(p[0]+180)/360*s-coords.x*256,y=(1-Math.asinh(Math.tan(lat))/Math.PI)/2*s-coords.y*256;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();}ctx.clip();ctx.drawImage(topo,0,0,256,256);ctx.restore();}done(null,tile);}catch(e){done(null,tile);}};osm.onload=paint;osm.onerror=paint;topo.onload=paint;topo.onerror=paint;osm.src=`https://tile.openstreetmap.org/${coords.z}/${coords.x}/${coords.y}.png`;topo.src=`https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/${coords.z}/${coords.y}/${coords.x}.png`;return tile;}});
 base=new Hybrid({attribution:'Kartverket · © OpenStreetMap',maxZoom:18}).addTo(map);
}
function iconFor(symbol){return D.icons[symbol]||null;}
const categoryNames={overnatting:'Overnatting',handel:'Handel',spisesteder:'Spisesteder',attraksjoner:'Attraksjoner',aktiviteter:'Aktiviteter',andre:'Andre'};
const enabledCategories=new Set(Object.keys(categoryNames));
function drawPOIs(){poiLayers.clearLayers();
const groups=new Map();for(const p of D.pois){if(!enabledCategories.has(p.category))continue;if(!p.latlng||!p.latlng.every(Number.isFinite))continue;const key=p.latlng.map(x=>x.toFixed(5)).join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}
for(const group of groups.values()){
 const iconHTML=group.map(p=>iconFor(p.symbol)?`<img alt="${esc(p.title)}" src="${iconFor(p.symbol)}">`:`<span class="fe-generic-pin" aria-label="${esc(p.title)}">•</span>`).join('');
 const cols=Math.min(3,group.length),width=cols*27+4,height=Math.ceil(group.length/3)*27+4;
 const marker=L.marker(group[0].latlng,{pane:'fe-pois',icon:L.divIcon({className:'fe-poi-marker',html:`<div class="fe-poi-group" style="max-width:${width}px">${iconHTML}</div>`,iconSize:[width,height],iconAnchor:[width/2,height/2]}),title:group.map(p=>p.title).join(' · '),keyboard:true});
 marker.bindPopup(group.map(p=>`<div class="fe-popup-item"><div class="fe-popup-title">${iconFor(p.symbol)?`<img alt="" src="${iconFor(p.symbol)}">`:''}${esc(p.title)}</div><div class="fe-popup-desc">${esc(p.description)}</div>${p.url?`<p style="margin:8px 0 0"><a href="${esc(p.url)}" target="_blank" rel="noopener">Les mer hos Femund Engerdal ↗</a></p>`:''}</div>`).join(''),{maxWidth:300,autoPan:false});
 marker.on('mouseover',()=>marker.openPopup());marker.addTo(poiLayers);
}
$('fe-poi-count').textContent=D.pois.filter(p=>enabledCategories.has(p.category)).length;
}
$('fe-service-filters').innerHTML=Object.entries(categoryNames).map(([key,label])=>`<label><input type="checkbox" data-category="${key}" checked>${label}</label>`).join('');
$('fe-service-filters').addEventListener('change',e=>{const k=e.target.dataset.category;if(!k)return;e.target.checked?enabledCategories.add(k):enabledCategories.delete(k);drawPOIs();});
drawPOIs();
const gradeColors={enkel:'#183f6e',middels:'#b5232d',krevende:'#151515'};
function gradeHTML(r){const label={enkel:'Enkel',middels:'Middels',krevende:'Krevende'}[r.difficulty];const color=gradeColors[r.difficulty];if(!D.icons.sykkel)return `<span class="fe-grade" style="color:${color}">${label}</span>`;let icon=atob(D.icons.sykkel.split(',')[1]);let first=true;icon=icon.replace(/fill="rgb\([^"]+\)"/g,()=>{const c=first?color:'#ffffff';first=false;return 'fill="'+c+'"';});return `<span class="fe-grade" title="Foreløpig gradering – må kvalitetssikres"><img alt="Sykkel" src="data:image/svg+xml;base64,${btoa(icon)}"><span style="color:${color}">${label}</span></span>`;}
function routeBounds(r){const pts=r.lines.flatMap(s=>s.coordinates.map(c=>[c[1],c[0]]));return L.latLngBounds(pts);}
function fitCurrent(){if(selected)map.fitBounds(routeBounds(selected),{padding:[35,35],maxZoom:12});else map.fitBounds(L.latLngBounds(D.routes.flatMap(r=>r.lines.flatMap(s=>s.coordinates.map(c=>[c[1],c[0]])))),{padding:[28,28]});}
function drawRoutes(){routeLayers.clearLayers();startLayers.clearLayers();hoverLayers.clearLayers();for(const r of D.routes){const active=selected?.id===r.id;for(const s of r.lines){if(s.surface==='boat'&&(!active||r.id!=='femund-rundt'))continue;const path=L.polyline(s.coordinates.map(c=>[c[1],c[0]]),{pane:'fe-routes',color:active?colors[s.surface]:(selected?'#887e7550':colors[s.surface]),weight:active?5:3,opacity:active?1:(selected ? 0.6 : 0.83),dashArray:s.surface==='boat'?'7 6':undefined,lineCap:'round'});path.bindTooltip(`${r.number?esc(r.number)+' · ':''}${esc(r.title)}${active?' · '+names[s.surface]:''}`,{sticky:true});path.on('click',()=>selectRoute(r.id));path.addTo(routeLayers);}
 if(active)for(const gap of (r.gapConnections||[])){L.polyline(gap.coordinates.map(c=>[c[1],c[0]]),{pane:'fe-routes',color:'#9c3b36',weight:3,dashArray:'3 7'}).bindTooltip('Spor mangler · '+num(gap.airDistanceKm)+' km i luftlinje',{sticky:true}).addTo(routeLayers);}
 if(active)L.marker(r.startLatLng,{icon:L.divIcon({className:'',html:'<div class="fe-start-marker">S</div>',iconSize:[26,26],iconAnchor:[13,13]})}).bindTooltip('Start: '+esc(r.start)).addTo(startLayers);}
}
function surfaceHTML(r){const total=r.stats.distanceKm;return `<div class="fe-surface"><div class="fe-surface-bar" aria-label="Fordeling av underlag">${['asphalt','gravel','trail'].filter(k=>r.surface[k]>.001).map(k=>`<div style="width:${100*r.surface[k]/total}%;background:${colors[k]}" aria-label="${names[k]} ${num(r.surface[k])} km"></div>`).join('')}</div><div class="fe-surface-labels">${['asphalt','gravel','trail'].filter(k=>r.surface[k]>.001).map(k=>`<span><i class="fe-dot" style="background:${colors[k]}"></i>${names[k]} ${num(r.surface[k])} km</span>`).join('')}</div></div>`;}
function detail(){const el=$('fe-route-detail');if(!selected){el.innerHTML=`<span class="fe-eyebrow">Finn din tur</span><h2 style="margin-top:8px">Finn din tur i villmarka.</h2><p class="fe-intro">Fra rolige skogsturer ved Kvemsjøen og Jyltingsmarka til bratte stigninger og stipartier i fjellet. De kortere rundturene gir god tid til pauser, mens Idre-runden, Sendsjørunden og Femund rundt passer for lengre sykkeldager eller turer over flere dager. Femund rundt kombinerer sykling med båt.</p><p class="fe-practical">Velg en tur for å se underlag, høydeprofil og opplevelser. Graderingene er foreløpige; les også om lengde og terreng.</p><div>${D.routes.map(r=>`<button class="fe-overview-item" type="button" data-route="${esc(r.id)}"><span><em>${esc(r.number||'↝')}</em><b>${esc(r.title)}</b>${gradeHTML(r)}</span><small>${num(r.stats.distanceKm)} km</small></button>`).join('')}</div>`;el.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',()=>selectRoute(b.dataset.route)));return;}
 const r=selected;el.innerHTML=`${r.number?`<span class="fe-number">${esc(r.number)}</span>`:'<span class="fe-eyebrow">Sykkel + båt</span>'}<h2>${esc(r.title)}</h2>${gradeHTML(r)}<p class="fe-intro">${esc(r.intro)}</p><div class="fe-metrics"><div class="fe-metric"><strong>${num(r.stats.distanceKm)}<span style="font-size:12px"> km</span></strong><span>sykling</span></div><div class="fe-metric"><strong>${num(r.stats.climbM,0)}</strong><span>høydemeter opp</span></div><div class="fe-metric"><strong>${num(r.stats.descentM,0)}</strong><span>høydemeter ned</span></div></div>${surfaceHTML(r)}${r.gapConnections?.length?`<div class="fe-boat-note" style="border-color:#9c3b36;background:#f4e2dc"><b>Spor må avklares</b><br>Et avbrudd på ca. ${num(r.gapConnections[0].airDistanceKm)} km i luftlinje er markert i kartet. Manglende strekning er ikke med i distansen.</div>`:''}<div class="fe-start">Start: ${esc(r.start)}</div>${r.stats.boatKm?`<div class="fe-boat-note"><b>+ ${num(r.stats.boatKm)} km med båt</b><br>Utenfor sykkelkilometer og høydeprofil.</div>`:''}<button class="fe-text-button fe-mobile-details" id="fe-mobile-more" type="button" style="display:none" aria-expanded="false">Opplevelser og praktisk informasjon</button><div class="fe-details-extra" id="fe-extra"><h3 class="fe-detail-heading">Få med deg</h3><ul class="fe-highlights">${r.experience.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h3 class="fe-detail-heading">Godt å vite</h3><p class="fe-practical">${esc(r.practical)}</p><p class="fe-practical" style="margin-top:9px;font-weight:600">${esc(r.technical)}</p></div>`;
 const more=$('fe-mobile-more');more.addEventListener('click',()=>{const x=$('fe-extra');x.classList.toggle('fe-expanded');more.setAttribute('aria-expanded',x.classList.contains('fe-expanded'));});}
function drawProfile(){
 const canvas=$('fe-elevation-chart'),ctx=canvas.getContext('2d'),w=Math.max(240,canvas.clientWidth),h=155,ratio=window.devicePixelRatio||1;
 canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx.scale(ratio,ratio);canvas.onpointermove=null;canvas.onclick=null;hoverLayers.clearLayers();
 if(!selected){$('fe-profile-title').textContent='Velg en tur for å se høydeprofilen';$('fe-profile-range').textContent='';$('fe-profile-info').textContent='Alle ti rutene vises i kartet. Velg en tur i listen eller kartet for å se høydeprofilen.';return;}
 const r=selected,pad={l:43,r:12,t:24,b:30},values=r.profiles.flatMap(s=>s.map(p=>p[1])),lo=Math.floor((Math.min(...values)-20)/50)*50,hi=Math.ceil((Math.max(...values)+20)/50)*50;
 const x=d=>pad.l+d/r.stats.distanceKm*(w-pad.l-pad.r),y=z=>h-pad.b-(z-lo)/(hi-lo)*(h-pad.t-pad.b);
 function paint(point){
 ctx.clearRect(0,0,w,h);ctx.font='11px Arial';ctx.lineWidth=1;
 for(let i=0;i<3;i++){const z=lo+(hi-lo)*i/2;ctx.strokeStyle='#42242618';ctx.beginPath();ctx.moveTo(pad.l,y(z));ctx.lineTo(w-pad.r,y(z));ctx.stroke();ctx.fillStyle='#775b51';ctx.textAlign='right';ctx.fillText(Math.round(z),pad.l-8,y(z)+4);}
 for(const series of r.profiles){if(series.length<2)continue;
 for(const section of r.lines){if(section.surface==='boat')continue;const from=Math.max(series[0][0],section.fromKm),to=Math.min(series.at(-1)[0],section.toKm);if(to<=from)continue;
 ctx.save();ctx.beginPath();ctx.rect(x(from),pad.t,x(to)-x(from),h-pad.b-pad.t);ctx.clip();ctx.beginPath();series.forEach((p,i)=>i?ctx.lineTo(x(p[0]),y(p[1])):ctx.moveTo(x(p[0]),y(p[1])));ctx.lineTo(x(series.at(-1)[0]),h-pad.b);ctx.lineTo(x(series[0][0]),h-pad.b);ctx.closePath();ctx.fillStyle=colors[section.surface];ctx.fill();ctx.restore();}
 }
 ctx.fillStyle='#775b51';const ticks=w<380?3:5;for(let i=0;i<ticks;i++){const d=r.stats.distanceKm*i/(ticks-1);ctx.textAlign=i===0?'left':i===ticks-1?'right':'center';ctx.fillText(num(d,0),x(d),h-9);}ctx.textAlign='left';ctx.fillText('moh.',2,13);ctx.textAlign='right';ctx.fillText('km sykling',w-pad.r,h-24);
 if(r.stats.boatKm){const b=r.lines.find(l=>l.surface==='boat');if(b){ctx.strokeStyle=colors.boat;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(x(b.fromKm),20);ctx.lineTo(x(b.fromKm),h-pad.b);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#183f6e';ctx.textAlign='left';ctx.fillText('Båt '+num(r.stats.boatKm)+' km',x(b.fromKm)+5,15);}}
 if(point){ctx.strokeStyle='#ca6b2a';ctx.beginPath();ctx.moveTo(x(point[0]),pad.t);ctx.lineTo(x(point[0]),h-pad.b);ctx.stroke();ctx.fillStyle='#ca6b2a';ctx.beginPath();ctx.arc(x(point[0]),y(point[1]),3.5,0,Math.PI*2);ctx.fill();}
 }
 paint();canvas.setAttribute('aria-label','Høydeprofil for '+r.title+', '+num(r.stats.distanceKm)+' km sykling');$('fe-profile-title').textContent='Høydeprofil · '+r.title;$('fe-profile-range').textContent=num(r.stats.minElevationM,0)+'–'+num(r.stats.maxElevationM,0)+' moh.';$('fe-profile-info').textContent='Pek på profilen for å følge turen i kartet.';
 function hover(e){const rect=canvas.getBoundingClientRect(),d=Math.max(0,Math.min(r.stats.distanceKm,((e.clientX-rect.left)*w/rect.width-pad.l)/(w-pad.l-pad.r)*r.stats.distanceKm));let best=null,delta=Infinity;for(const s of r.profiles)for(const p of s)if(Math.abs(p[0]-d)<delta){best=p;delta=Math.abs(p[0]-d);}if(!best)return;paint(best);$('fe-profile-info').textContent=num(best[0])+' km · '+num(best[1],0)+' moh.';hoverLayers.clearLayers();L.circleMarker([best[2],best[3]],{radius:6,color:'#fff',weight:2,fillColor:'#ca6b2a',fillOpacity:1}).addTo(hoverLayers);}
 canvas.onpointermove=hover;canvas.onclick=hover;
}
function selectRoute(id,fit=true){selected=D.routes.find(r=>r.id===id)||null;$('fe-route-select').value=selected?.id||'';$('fe-boat-legend').hidden=selected?.id!=='femund-rundt';drawRoutes();if(fit)fitCurrent();detail();drawProfile();$('fe-fit').textContent=selected?'Hele turen':'Alle rutene';if(fit)fitCurrent();}
$('fe-route-select').innerHTML='<option value="">Alle sykkelrutene</option>'+D.routes.map(r=>`<option value="${esc(r.id)}">${r.number?esc(r.number)+' · ':''}${esc(r.title)}</option>`).join('');
$('fe-route-select').addEventListener('change',e=>selectRoute(e.target.value));$('fe-all-routes').addEventListener('click',()=>selectRoute(''));$('fe-fit').addEventListener('click',fitCurrent);
$('fe-about').addEventListener('click',()=>{$('fe-source-info').hidden=!$('fe-source-info').hidden;});
$('fe-topo').addEventListener('click',()=>{if(OFFLINE)return;map.removeLayer(normalTiles);base.addTo(map);currentMode='topo';$('fe-topo').setAttribute('aria-pressed','true');$('fe-osm').setAttribute('aria-pressed','false');});
$('fe-osm').addEventListener('click',()=>{if(OFFLINE)return;map.removeLayer(base);normalTiles.addTo(map);currentMode='osm';$('fe-topo').setAttribute('aria-pressed','false');$('fe-osm').setAttribute('aria-pressed','true');});
new ResizeObserver(()=>{map.invalidateSize();drawProfile();}).observe($('fe-leaflet-map'));
selectRoute('');
window.FE_MAP_TEST={map,selectRoute,poiCount:D.pois.length,routeCount:D.routes.length,getSelected:()=>selected?.id,poiLayers};
})();
