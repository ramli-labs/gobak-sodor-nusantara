import { PortalStore, GSN_KEYS, JELAJAH_RESULTS_KEY } from "./store.js";
import { supabaseApi } from "./supabase-api.js";
import { authManager } from "./auth.js";
import { escapeHtml, formatDate } from "./dashboard-common.js";

const store=new PortalStore();
let filter="all";
let remoteRows=[];
const q=s=>document.querySelector(s);
const medal=i=>i===0?"🥇 1":i===1?"🥈 2":i===2?"🥉 3":String(i+1);

async function loadRemote(){
  if(!supabaseApi.configured){remoteRows=[];return;}
  try{remoteRows=await supabaseApi.rpc("get_portal_leaderboard",{p_game_slug:filter==='all'?null:filter,p_limit:50},{auth:false});}
  catch(error){console.warn("Leaderboard online gagal:",error);remoteRows=[];}
}
function localRows(){
  const profile=store.getProfile();
  const gobak=store.getGobakData().leaderboard.map(x=>({display_name:x.name||profile.displayName||"Tanpa nama",avatar:"🏃",game_title:"Gobak Sodor Nusantara",game_slug:"gobak-sodor",score:Number(x.score)||0,accuracy:Number(x.accuracy)||0,mode:x.mode||"Solo",difficulty:x.difficulty||"Normal",level_id:x.level||"Jawa",completed_at:x.date,verified:false,local:true}));
  const jelajah=store.getJelajahData().results.map(x=>({display_name:profile.displayName||"Pemain lokal",avatar:"🧭",game_title:"Jelajah Nusantara",game_slug:"jelajah-nusantara",score:Number(x.score)||0,accuracy:Number(x.accuracy)||0,mode:"Solo",difficulty:"Normal",level_id:"Nusantara",completed_at:x.date,verified:false,local:true}));
  return [...gobak,...jelajah];
}
function render(){
  const portalStats=store.getPortalStats();let rows=remoteRows.length?remoteRows:localRows();
  if(filter!=="all")rows=rows.filter(x=>x.game_slug===filter);
  rows=rows.slice().sort((a,b)=>Number(b.score)-Number(a.score)||new Date(a.completed_at)-new Date(b.completed_at));
  const best=rows.length?Math.max(...rows.map(x=>Number(x.score)||0)):0;
  const avg=rows.length?Math.round(rows.reduce((sum,x)=>sum+(Number(x.accuracy)||0),0)/rows.length):0;
  q("[data-lb-rounds]").textContent=rows.length;
  q("[data-lb-best]").textContent=best.toLocaleString("id-ID");
  q("[data-lb-accuracy]").textContent=`${avg}%`;
  q("[data-lb-xp]").textContent=portalStats.xp.toLocaleString("id-ID");
  q("[data-lb-source]").textContent=remoteRows.length?"Peringkat online terverifikasi":"Peringkat lokal perangkat";
  q("[data-lb-empty]").hidden=rows.length>0;q(".table-shell").hidden=rows.length===0;
  q("[data-portal-leaderboard]").innerHTML=rows.map((x,i)=>`<tr><td class="rank-medal">${medal(i)}</td><td class="player-cell"><strong>${escapeHtml(x.avatar||'👤')} ${escapeHtml(x.display_name||'Pemain')}</strong><small>${formatDate(x.completed_at)}</small></td><td>${escapeHtml(x.game_title||x.game_slug)}</td><td><strong>${Number(x.score).toLocaleString('id-ID')}</strong></td><td class="detail-cell"><strong>${escapeHtml(x.level_id||'—')} · ${escapeHtml(x.mode||'Solo')}</strong><small>${escapeHtml(x.difficulty||'Normal')} · Akurasi ${Number(x.accuracy)||0}% ${x.local?'· lokal':'· terverifikasi'}</small></td></tr>`).join("");
}
async function applyFilter(next){filter=next;document.querySelectorAll('[data-lb-filter]').forEach(b=>b.classList.toggle('active',b.dataset.lbFilter===filter));await loadRemote();render();}
document.addEventListener('DOMContentLoaded',async()=>{await authManager.init();document.querySelectorAll('[data-lb-filter]').forEach(b=>b.addEventListener('click',()=>applyFilter(b.dataset.lbFilter)));q('[data-clear-local-scores]').addEventListener('click',()=>{const count=localRows().length;if(!count)return;if(!confirm(`Hapus ${count} skor lokal pada perangkat ini?`))return;localStorage.removeItem(GSN_KEYS.leaderboard);localStorage.removeItem(JELAJAH_RESULTS_KEY);render()});await loadRemote();render();});
