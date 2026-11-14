import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("PASTE_") && !SUPABASE_ANON_KEY.includes("PASTE_");
const db = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = (id) => document.getElementById(id);
let currentUser = null;
let tournaments = [];

function toast(message, error=false) {
  const el=$("toast"); el.textContent=message; el.classList.remove("hidden","error");
  if(error) el.classList.add("error");
  setTimeout(()=>el.classList.add("hidden"),4000);
}
function show(id){$(id).classList.remove("hidden")}
function hide(id){$(id).classList.add("hidden")}
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>hide(b.dataset.close)));
$("loginOpen").addEventListener("click",()=>show("loginModal"));

function money(n){return "₹"+Number(n||0).toLocaleString("en-IN")}
function dateText(s){return new Date(s).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}

async function loadPublic(){
  if(!db){
    $("tournamentGrid").innerHTML='<div class="empty">Connect Supabase first: add your Project URL and anon key in config.js, then refresh.</div>';
    $("resultsList").innerHTML='<div class="empty">Results will appear here after Supabase is connected.</div>';
    return;
  }
  const [t,r]=await Promise.all([
    db.from("tournaments").select("*").order("start_at",{ascending:true}),
    db.from("results").select("*").order("created_at",{ascending:false}).limit(20)
  ]);
  if(t.error){$("tournamentGrid").innerHTML=`<div class="empty">Could not load tournaments: ${t.error.message}</div>`;return}
  tournaments=t.data||[]; $("tournamentCount").textContent=tournaments.length;
  $("tournamentGrid").innerHTML=tournaments.length?tournaments.map(x=>`
    <article class="t-card"><span class="tag">${escapeHtml(x.mode)} / ${escapeHtml(x.status)}</span>
    <h3>${escapeHtml(x.title)}</h3><p class="muted">${escapeHtml(x.description||"Join the B4X-PLAY5 arena.")}</p>
    <div class="t-meta"><div>STARTS<b>${dateText(x.start_at)}</b></div><div>MAP<b>${escapeHtml(x.map_name||"TBA")}</b></div>
    <div>ENTRY<b>${money(x.entry_fee)}</b></div><div>PRIZE POOL<b>${money(x.prize_pool)}</b></div>
    <div>SLOTS<b>${x.slots}</b></div></div>
    <button class="btn btn-primary register-btn" data-id="${x.id}" ${x.status!=="open"?"disabled":""}>${x.status==="open"?"Register now":"Registration closed"}</button></article>`).join(""):'<div class="empty">No tournaments yet. Check back soon.</div>';
  document.querySelectorAll(".register-btn").forEach(b=>b.addEventListener("click",()=>openRegistration(b.dataset.id)));
  $("resultsList").innerHTML=(r.data||[]).length?(r.data||[]).map(x=>`<div class="result-row"><b>#${x.placement}</b><strong>${escapeHtml(x.team_name)}</strong><span>${x.points} pts</span><span>${x.kills} kills</span></div>`).join(""):'<div class="empty">No results published yet.</div>';
}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

function openRegistration(id){
  const t=tournaments.find(x=>x.id===id); if(!t)return;
  $("tournamentId").value=id; $("registerTitle").textContent=t.title; show("registerModal");
}
$("registerForm").addEventListener("submit",async e=>{
  e.preventDefault(); if(!db)return toast("Connect Supabase first.",true);
  const payload={tournament_id:$("tournamentId").value,team_name:$("teamName").value.trim(),captain_name:$("captainName").value.trim(),captain_uid:$("captainUid").value.trim(),contact:$("contact").value.trim(),members_text:$("members").value.trim(),status:"pending"};
  const {error}=await db.from("registrations").insert(payload);
  if(error)return toast(error.message,true);
  e.target.reset();hide("registerModal");toast("Registration submitted. Wait for admin approval."); 
});

$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!db)return toast("Connect Supabase first.",true);
  const {data,error}=await db.auth.signInWithPassword({email:$("adminEmail").value,password:$("adminPassword").value});
  if(error)return toast(error.message,true);
  currentUser=data.user;hide("loginModal");await showAdmin();
});
async function showAdmin(){
  const {data,error}=await db.from("admin_users").select("user_id").eq("user_id",currentUser.id).maybeSingle();
  if(error||!data){await db.auth.signOut();currentUser=null;return toast("This account is not authorised as an admin.",true)}
  show("adminPanel");$("loginOpen").classList.add("hidden");await loadAdmin();
}
$("logoutBtn").addEventListener("click",async()=>{await db.auth.signOut();currentUser=null;hide("adminPanel");$("loginOpen").classList.remove("hidden");toast("Signed out.")});

$("tournamentForm").addEventListener("submit",async e=>{
  e.preventDefault();const payload={title:$("newTitle").value.trim(),mode:$("newMode").value,map_name:$("newMap").value.trim(),start_at:new Date($("newStart").value).toISOString(),entry_fee:Number($("newFee").value),prize_pool:Number($("newPrize").value),slots:Number($("newSlots").value),description:$("newDescription").value.trim(),status:"open"};
  const {error}=await db.from("tournaments").insert(payload);if(error)return toast(error.message,true);
  e.target.reset();$("newFee").value=0;$("newPrize").value=0;$("newSlots").value=48;toast("Tournament published.");await loadPublic();await loadAdmin();
});
async function loadAdmin(){
  const [reg,t]=await Promise.all([db.from("registrations").select("*,tournaments(title)").order("created_at",{ascending:false}),db.from("tournaments").select("id,title").order("start_at",{ascending:false})]);
  if(reg.error)return $("adminRegistrations").textContent=reg.error.message;
  $("adminRegistrations").innerHTML=`<table class="admin-table"><thead><tr><th>Team / Captain</th><th>UID</th><th>Tournament</th><th>Status</th><th>Action</th></tr></thead><tbody>${(reg.data||[]).map(x=>`<tr><td>${escapeHtml(x.team_name)}<br>${escapeHtml(x.captain_name)}</td><td>${escapeHtml(x.captain_uid)}</td><td>${escapeHtml(x.tournaments?.title||"—")}</td><td>${escapeHtml(x.status)}</td><td><button class="small-btn" data-reg="${x.id}" data-status="approved">Approve</button><button class="small-btn" data-reg="${x.id}" data-status="rejected">Reject</button></td></tr>`).join("")}</tbody></table>`;
  document.querySelectorAll("[data-reg]").forEach(b=>b.addEventListener("click",async()=>{const {error}=await db.from("registrations").update({status:b.dataset.status}).eq("id",b.dataset.reg);if(error)return toast(error.message,true);toast("Registration updated.");await loadAdmin()}));
  $("resultTournament").innerHTML=(t.data||[]).map(x=>`<option value="${x.id}">${escapeHtml(x.title)}</option>`).join("");
}
$("resultForm").addEventListener("submit",async e=>{
  e.preventDefault();const payload={tournament_id:$("resultTournament").value,team_name:$("resultTeam").value.trim(),placement:Number($("resultPlacement").value),points:Number($("resultPoints").value),kills:Number($("resultKills").value)};
  const {error}=await db.from("results").insert(payload);if(error)return toast(error.message,true);
  e.target.reset();toast("Result published.");await loadPublic();
});

if(db){
  db.auth.getSession().then(async({data})=>{if(data.session){currentUser=data.session.user;await showAdmin()}});
  db.auth.onAuthStateChange((_event,session)=>{if(!session){currentUser=null;hide("adminPanel");$("loginOpen").classList.remove("hidden")}});
}
loadPublic();
