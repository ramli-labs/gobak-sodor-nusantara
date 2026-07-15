import { PortalStore } from "./store.js";
import { authManager } from "./auth.js";
import { supabaseApi } from "./supabase-api.js";
import { escapeHtml, formatDate } from "./dashboard-common.js";

const store=new PortalStore();const avatars=["🌟","🧭","🏃","📚","🦅","🐯","🦋","🌺","🚀","🎒"];let selected="🌟";let remoteSessions=[];let remoteAchievements=[];
const q=s=>document.querySelector(s);

function combinedProfile(){
  const local=store.getProfile();const remote=authManager.profile;
  return {displayName:remote?.full_name||local.displayName,className:remote?.class_label||local.className,avatar:remote?.avatar||local.avatar,schoolName:remote?.school_name||""};
}
function render(){
  const stats=store.getPortalStats();const p=combinedProfile();selected=p.avatar||"🌟";
  const totalXp=stats.xp+(authManager.authenticated?(Number(authManager.profile?.xp)||0):0);
  const level=Math.max(1,Math.floor(Math.sqrt(totalXp/250))+1);const currentFloor=250*Math.pow(level-1,2);const nextFloor=250*Math.pow(level,2);const progress=Math.max(0,Math.min(100,Math.round((totalXp-currentFloor)/(nextFloor-currentFloor)*100)));
  q("[data-profile-avatar]").textContent=selected;q("[data-profile-name]").textContent=p.displayName||"Penjelajah Baru";q("[data-profile-class]").textContent=p.className||"Belum mengisi kelas";
  q("[data-profile-level]").textContent=level;q("[data-xp-track]").style.width=`${progress}%`;q("[data-xp-caption]").textContent=`${(totalXp-currentFloor).toLocaleString('id-ID')} / ${(nextFloor-currentFloor).toLocaleString('id-ID')} XP menuju level berikutnya`;
  q('[name="displayName"]').value=p.displayName||'';q('[name="className"]').value=p.className||'';q('[name="schoolName"]').value=p.schoolName||'';renderAvatars();
  const verifiedSessions=remoteSessions.filter(x=>x.verified);const winsRemote=verifiedSessions.filter(x=>x.result==='won').length;const correctRemote=verifiedSessions.reduce((s,x)=>s+(Number(x.correct_count)||0),0);
  q("[data-stat-wins]").textContent=stats.totalWins+winsRemote;q("[data-stat-correct]").textContent=stats.totalCorrect+correctRemote;q("[data-stat-islands]").textContent=`${stats.gobak.completedLevels.length}/5`;q("[data-stat-streak]").textContent=stats.gobak.streak;
  const localAchievements=stats.achievements.map(a=>({...a,source:'Lokal'}));const serverAchievements=remoteAchievements.map(row=>({...(row.achievements||{}),unlocked:true,source:'Akun'}));const allAchievements=[...localAchievements,...serverAchievements];
  q("[data-achievement-count]").textContent=`${allAchievements.filter(a=>a.unlocked).length} terbuka`;q("[data-portal-achievements]").innerHTML=allAchievements.map(a=>`<article class="portal-achievement ${a.unlocked?'':'locked'}"><span>${a.icon||'🏅'}</span><div><strong>${escapeHtml(a.name||'Achievement')}</strong><small>${escapeHtml(a.description||'')} · ${a.source}</small></div><span>${a.unlocked?'✓':'🔒'}</span></article>`).join('');
  const localActs=store.getRecentActivity().map(a=>({title:a.gameTitle,detail:`${a.name} · ${Number(a.score).toLocaleString('id-ID')} poin · ${a.accuracy||0}%`,date:a.date,icon:a.result==='Menang'?'🏆':'🏁'}));
  const remoteActs=remoteSessions.map(a=>({title:a.games?.title||'Permainan',detail:`${Number(a.score).toLocaleString('id-ID')} poin · ${Number(a.accuracy).toFixed(0)}% · ${a.verified?'terverifikasi':'client'}`,date:a.completed_at,icon:a.games?.icon||'🎮'}));
  const acts=[...remoteActs,...localActs].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8);
  q("[data-recent-activity]").innerHTML=acts.length?acts.map(a=>`<article class="activity-item"><span>${escapeHtml(a.icon)}</span><div><strong>${escapeHtml(a.title)}</strong><small>${escapeHtml(a.detail)}</small></div><time>${formatDate(a.date)}</time></article>`).join(''):'<div class="empty-state"><span>🎮</span><h3>Belum ada aktivitas</h3><p>Mainkan salah satu game portal.</p></div>';
  q('[data-profile-storage]').textContent=authManager.authenticated?'Tersinkron akun':'Tersimpan lokal';q('[data-profile-sync]').textContent=authManager.authenticated?'Supabase aktif':'Belum login';
}
function renderAvatars(){q("[data-avatar-options]").innerHTML=avatars.map(a=>`<button type="button" class="avatar-option ${a===selected?'selected':''}" data-avatar="${a}" aria-label="Pilih avatar ${a}">${a}</button>`).join('')}
async function loadRemote(){if(!authManager.authenticated)return;[remoteSessions,remoteAchievements]=await Promise.all([supabaseApi.select('game_sessions',`select=id,score,accuracy,result,verified,correct_count,completed_at,games(title,icon)&user_id=eq.${authManager.user.id}&result=neq.abandoned&order=completed_at.desc&limit=20`),supabaseApi.select('user_achievements',`select=achievement_id,unlocked_at,achievements(name,description,icon,xp_reward)&user_id=eq.${authManager.user.id}&order=unlocked_at.desc`)])}
async function init(){
  await authManager.init();await loadRemote().catch(console.warn);
  q("[data-avatar-options]").addEventListener("click",e=>{const b=e.target.closest("[data-avatar]");if(!b)return;selected=b.dataset.avatar;renderAvatars()});
  q("[data-profile-form]").addEventListener("submit",async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const name=String(fd.get('displayName')||'').trim().replace(/\s+/g,' ').slice(0,80);if(name.length<2){q('[data-profile-feedback]').textContent='Nama minimal dua karakter.';return}const local={displayName:name,className:String(fd.get('className')||'').trim().slice(0,40),avatar:selected};store.saveProfile(local);try{if(authManager.authenticated)await authManager.updateProfile({full_name:name,class_label:local.className,school_name:String(fd.get('schoolName')||'').trim().slice(0,120),avatar:selected});q('[data-profile-feedback]').textContent=authManager.authenticated?'Profil lokal dan akun berhasil diperbarui.':'Profil berhasil disimpan pada perangkat ini.';render()}catch(error){q('[data-profile-feedback]').textContent=`Profil lokal tersimpan, sinkronisasi gagal: ${error.message}`;}});
  q("[data-reset-profile]").addEventListener("click",()=>{if(!confirm('Reset profil lokal? Profil akun Supabase tidak dihapus.'))return;store.resetProfile();selected='🌟';q('[data-profile-feedback]').textContent='Profil lokal direset. Data akun tetap aman.';render()});render();
}
document.addEventListener('DOMContentLoaded',()=>init().catch(console.error));
