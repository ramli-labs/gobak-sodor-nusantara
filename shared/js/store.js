export const PROFILE_KEY = "ppnProfileV1";
export const THEME_KEY = "ppnThemeV1";
export const JELAJAH_RESULTS_KEY = "ppnJelajahResultsV1";
export const GSN_KEYS = Object.freeze({
  leaderboard: "gsnLeaderboardV1",
  gamification: "gsnGamificationV1",
  map: "gsnMapProgressV1",
  learning: "gsnLearningProfileV1"
});

export const PORTAL_ACHIEVEMENTS = Object.freeze([
  { id:"profil-pertama", icon:"👤", name:"Identitas Penjelajah", description:"Simpan profil portal pertamamu." },
  { id:"langkah-pertama", icon:"🎮", name:"Langkah Pertama", description:"Selesaikan sedikitnya satu ronde permainan." },
  { id:"juara-pulau", icon:"🗺️", name:"Juara Pulau", description:"Menangkan satu pulau di Gobak Sodor." },
  { id:"cerdas-nusantara", icon:"🧠", name:"Cerdas Nusantara", description:"Jawab sedikitnya 20 soal dengan benar." },
  { id:"gotong-royong", icon:"🤝", name:"Gotong Royong", description:"Buka achievement Co-op Gobak Sodor." },
  { id:"rajin-menjelajah", icon:"🔥", name:"Rajin Menjelajah", description:"Pertahankan streak minimal tiga hari." }
]);

export function safeParse(value, fallback){try{return JSON.parse(value) ?? fallback}catch{return fallback}}
function list(value){return Array.isArray(value)?value:[]}

export class PortalStore{
  constructor(storage=window.localStorage){this.storage=storage}
  getProfile(){const raw=safeParse(this.storage.getItem(PROFILE_KEY),{});return {displayName:typeof raw.displayName==="string"?raw.displayName:"",className:typeof raw.className==="string"?raw.className:"",avatar:typeof raw.avatar==="string"?raw.avatar:"🌟",createdAt:raw.createdAt||"",updatedAt:raw.updatedAt||""}}
  saveProfile(profile){const old=this.getProfile();const now=new Date().toISOString();const next={...old,...profile,createdAt:old.createdAt||now,updatedAt:now};this.storage.setItem(PROFILE_KEY,JSON.stringify(next));return next}
  resetProfile(){this.storage.removeItem(PROFILE_KEY)}
  getGobakData(){
    const leaderboard=list(safeParse(this.storage.getItem(GSN_KEYS.leaderboard),[])).filter(x=>x&&Number.isFinite(Number(x.score)));
    const gamification=safeParse(this.storage.getItem(GSN_KEYS.gamification),{});
    const map=safeParse(this.storage.getItem(GSN_KEYS.map),{});
    const learning=safeParse(this.storage.getItem(GSN_KEYS.learning),{});
    const completedLevels=list(gamification.completedLevels?.length?gamification.completedLevels:map.completed);
    const unlocked=list(gamification.unlocked);
    const totalCorrect=Math.max(0,Number(gamification.totalCorrect)||this.sumLearning(learning,"correct"));
    const totalQuestions=Math.max(0,Number(gamification.totalQuestions)||this.sumLearning(learning,"total"));
    const wins=Math.max(Number(gamification.wins)||0,leaderboard.filter(x=>x.result==="Menang").length);
    const streak=Math.max(0,Number(gamification.streak)||0);
    const bestScore=leaderboard.length?Math.max(...leaderboard.map(x=>Number(x.score)||0)):0;
    const accuracy=totalQuestions?Math.round(totalCorrect/totalQuestions*100):0;
    return {leaderboard,gamification,map,learning,completedLevels:[...new Set(completedLevels)],unlocked:[...new Set(unlocked)],totalCorrect,totalQuestions,wins,streak,bestScore,accuracy};
  }
  getJelajahData(){
    const results=list(safeParse(this.storage.getItem(JELAJAH_RESULTS_KEY),[])).filter(item=>item&&Number.isFinite(Number(item.score))).slice(-100);
    const totalCorrect=results.reduce((sum,item)=>sum+(Number(item.correct)||0),0);
    const totalQuestions=results.reduce((sum,item)=>sum+(Number(item.total)||0),0);
    const wins=results.filter(item=>item.result==="won").length;
    const bestScore=results.length?Math.max(...results.map(item=>Number(item.score)||0)):0;
    return {results,totalCorrect,totalQuestions,wins,bestScore,accuracy:totalQuestions?Math.round(totalCorrect/totalQuestions*100):0};
  }
  saveJelajahResult(result){
    const rows=this.getJelajahData().results;
    const next={
      id:String(result.id||crypto.randomUUID()),
      score:Math.max(0,Number(result.score)||0),
      correct:Math.max(0,Number(result.correct)||0),
      total:Math.max(0,Number(result.total)||0),
      accuracy:Math.max(0,Math.min(100,Number(result.accuracy)||0)),
      result:result.result==="won"?"won":"lost",
      durationSeconds:Math.max(0,Number(result.durationSeconds)||0),
      date:result.date||new Date().toISOString()
    };
    this.storage.setItem(JELAJAH_RESULTS_KEY,JSON.stringify([...rows,next].slice(-100)));
    return next;
  }
  sumLearning(learning,field){return Object.values(learning?.categories||learning||{}).reduce((sum,item)=>sum+(Number(item?.[field])||0),0)}
  getPortalStats(){
    const profile=this.getProfile();const g=this.getGobakData();const j=this.getJelajahData();
    const totalCorrect=g.totalCorrect+j.totalCorrect;const totalQuestions=g.totalQuestions+j.totalQuestions;const totalWins=g.wins+j.wins;
    const xp=totalCorrect*20+g.wins*300+j.wins*250+g.completedLevels.length*250+g.unlocked.length*150+(g.leaderboard.length+j.results.length)*25;
    const level=Math.max(1,Math.floor(Math.sqrt(xp/250))+1);
    const currentFloor=250*Math.pow(level-1,2);const nextFloor=250*Math.pow(level,2);
    const progress=Math.max(0,Math.min(100,Math.round((xp-currentFloor)/(nextFloor-currentFloor)*100)));
    const achievements=PORTAL_ACHIEVEMENTS.map(item=>({...item,unlocked:this.isPortalAchievementUnlocked(item.id,profile,g,j)}));
    return {profile,gobak:g,jelajah:j,totalCorrect,totalQuestions,totalWins,xp,level,currentFloor,nextFloor,progress,achievements,unlockedCount:achievements.filter(x=>x.unlocked).length};
  }
  isPortalAchievementUnlocked(id,profile,g,j){
    if(id==="profil-pertama")return Boolean(profile.displayName);
    if(id==="langkah-pertama")return g.totalQuestions>0||g.leaderboard.length>0||j.results.length>0;
    if(id==="juara-pulau")return g.completedLevels.length>0||g.wins>0;
    if(id==="cerdas-nusantara")return g.totalCorrect+j.totalCorrect>=20;
    if(id==="gotong-royong")return g.unlocked.includes("gotong-royong")||g.leaderboard.some(x=>x.mode==="Co-op"&&x.result==="Menang");
    if(id==="rajin-menjelajah")return g.streak>=3;
    return false;
  }
  getRecentActivity(limit=5){
    const gobak=this.getGobakData().leaderboard.map(x=>({...x,gameTitle:"Gobak Sodor Nusantara",date:x.date,accuracy:Number(x.accuracy)||0}));
    const jelajah=this.getJelajahData().results.map(x=>({name:this.getProfile().displayName||"Pemain lokal",score:x.score,accuracy:x.accuracy,result:x.result==="won"?"Menang":"Belum menang",date:x.date,gameTitle:"Jelajah Nusantara"}));
    return [...gobak,...jelajah].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,limit);
  }
}
