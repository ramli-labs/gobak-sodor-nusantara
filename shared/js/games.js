import { supabaseApi } from "./supabase-api.js";

const catalog=document.querySelector("[data-game-catalog]");
const result=document.querySelector("[data-catalog-result]");
let games=[];let filter="all";let query="";
function escapeHtml(v=""){return String(v).replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function safePath(value,fallback="games.html"){const raw=String(value||"").trim();if(!raw||raw.startsWith("//")||raw.includes("\\")||raw.includes("..")||/^(?:javascript|data|vbscript):/i.test(raw))return fallback;try{const url=new URL(raw,location.href);if(url.origin!==location.origin)return fallback;return `${url.pathname}${url.search}${url.hash}`}catch{return fallback}}

async function load(){
  try{
    const res=await fetch("data/games.json");if(!res.ok)throw new Error(`HTTP ${res.status}`);
    games=(await res.json()).games||[];
    if(supabaseApi.configured){
      try{
        const remote=await supabaseApi.rest("games",{query:"select=slug,title,description,launch_path,icon,status&order=title",auth:false});
        const bySlug=new Map(remote.map(item=>[item.slug,item]));
        games=games.map(local=>{const r=bySlug.get(local.slug);if(!r)return local;return {...local,title:r.title||local.title,description:r.description||local.description,icon:r.icon||local.icon,status:r.status==='active'?'available':r.status==='coming_soon'?'soon':'hidden',statusLabel:r.status==='active'?'Tersedia':r.status==='coming_soon'?'Segera hadir':'Disembunyikan',playPath:r.launch_path||local.playPath,path:local.path}}).filter(g=>g.status!=="hidden");
      }catch(error){console.warn("Registry online tidak tersedia, memakai registry lokal:",error)}
    }
    render();
  }catch(error){catalog.innerHTML='<div class="empty-state"><span>⚠️</span><h2>Katalog gagal dimuat</h2><p>Jalankan website melalui server lokal atau GitHub Pages.</p></div>';result.textContent="Data tidak tersedia";console.error(error)}
}
function render(){
  const q=query.toLowerCase().trim();const visible=games.filter(g=>(filter==="all"||g.status===filter)&&(!q||[g.title,g.tagline,g.description,...(g.subjects||[]),...(g.skills||[])].join(" ").toLowerCase().includes(q)));
  result.textContent=`${visible.length} dari ${games.length} game`;
  catalog.innerHTML=visible.map(g=>`<article class="game-card ${g.status==='soon'?'soon':''}" data-color="${escapeHtml(g.color)}"><div class="game-card-art"><span>${escapeHtml(g.icon)}</span><span class="game-status">${escapeHtml(g.statusLabel)}</span></div><div class="game-card-body"><h2>${escapeHtml(g.title)}</h2><p>${escapeHtml(g.tagline)}</p><div class="game-meta"><span>👥 ${escapeHtml(g.players)}</span>${g.version?`<span>v${escapeHtml(g.version)}</span>`:""}</div><div class="subject-list">${(g.subjects||[]).map(x=>`<span>${escapeHtml(x)}</span>`).join("")}</div><div class="button-row">${g.status==='available'?`<a class="button primary" href="${escapeHtml(safePath(g.playPath))}">Mainkan</a><a class="button text" href="${escapeHtml(safePath(g.path))}">Detail</a>`:`<button class="button secondary" type="button" disabled>Dalam Pengembangan</button>`}</div></div></article>`).join("");
  if(!visible.length)catalog.innerHTML='<div class="empty-state"><span>🔎</span><h2>Tidak ditemukan</h2><p>Coba kata kunci atau filter lain.</p></div>';
}
document.querySelectorAll("[data-game-filter]").forEach(button=>button.addEventListener("click",()=>{document.querySelectorAll("[data-game-filter]").forEach(x=>x.classList.remove("active"));button.classList.add("active");filter=button.dataset.gameFilter;render()}));
document.querySelector("[data-game-search]")?.addEventListener("input",event=>{query=event.target.value;render()});
load();
