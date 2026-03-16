import {
account,
databases,
ID,
DATABASE_ID,
COLLECTION_WALLETS,
COLLECTION_REFERRALS,
COLLECTION_SYSTEM
} from './appwrite.js';


/* =========================
CHECK ACTIVE SESSION
========================= */

async function checkActiveSession(){

try{

await account.get();

if(
window.location.pathname.includes("login") ||
window.location.pathname.includes("register")
){
window.location.href="dashboard.html";
}

}catch{
/* no session */
}

}

checkActiveSession();



/* =========================
CLEAR SESSIONS
========================= */

async function clearSession(){

try{

const sessions = await account.listSessions();

for(const session of sessions.sessions){
await account.deleteSession(session.$id);
}

}catch(err){
console.log("No active sessions");
}

}



/* =========================
CHECK MAINTENANCE MODE
========================= */

async function checkMaintenance(){

try{

const system = await databases.listDocuments(
DATABASE_ID,
COLLECTION_SYSTEM
);

if(system.documents.length){

const maintenance = system.documents[0].maintenance;

if(maintenance){

document.body.innerHTML=`
<h2 style="text-align:center;margin-top:120px">
Platform Under Maintenance<br><br>
Please check back later.
</h2>`;

return true;

}

}

return false;

}catch(err){

console.log("Maintenance check failed",err);
return false;

}

}



/* =========================
REGISTER
========================= */

async function register(){

if(await checkMaintenance()) return;

const name = document.getElementById('name').value.trim();
const email = document.getElementById('email').value.trim();
const password = document.getElementById('password').value;
const confirmPassword = document.getElementById('confirmPassword').value;

const btn = document.getElementById('registerBtn');
const msgEl = document.getElementById('formMessage');

msgEl.textContent='';

if(!name || !email || !password){
alert('Name, email, and password are required');
return;
}

if(password !== confirmPassword){
msgEl.textContent="Passwords do not match!";
return;
}

btn.disabled=true;

await clearSession();

try{

/* CREATE ACCOUNT */

const user = await account.create(
ID.unique(),
email,
password,
name
);


/* AUTO LOGIN */

await account.createEmailSession(email,password);


/* =========================
CREATE WALLET
========================= */

try{

await databases.createDocument(
DATABASE_ID,
COLLECTION_WALLETS,
ID.unique(),
{
userId:user.$id,
userName:name,
balance:0,
createdAt:new Date().toISOString()
}
);

}catch(walletErr){

console.error("Wallet creation failed:",walletErr);

}


/* =========================
REFERRAL SYSTEM
========================= */

const urlParams = new URLSearchParams(window.location.search);
const referralId = urlParams.get('ref');

if(referralId){

await databases.createDocument(
DATABASE_ID,
COLLECTION_REFERRALS,
ID.unique(),
{
referredBy:referralId,
referredUser:user.$id,
bonus:50,
status:'pending',
createdAt:new Date().toISOString()
}
);

}


/* SUCCESS */

if(msgEl){
msgEl.textContent="Registration successful! Redirecting...";
msgEl.classList.add('success');
}

setTimeout(()=>{
window.location.href='dashboard.html';
},2000);

}catch(error){

console.error(error);

if(msgEl)
msgEl.textContent = error.message || "Registration failed";

}

btn.disabled=false;

}



/* =========================
LOGIN
========================= */

async function login(){

if(await checkMaintenance()) return;

const email = document.getElementById('email').value.trim();
const password = document.getElementById('password').value;

const btn = document.getElementById('loginBtn');

if(!email || !password){
alert('Email and password required');
return;
}

btn.disabled=true;

await clearSession();

try{

await account.createEmailSession(email,password);

window.location.href='dashboard.html';

}catch(error){

console.error(error);

if(error.code === 401){
alert('Invalid email or password');
}
else if(error.code === 404){
alert('Email not registered');
}
else{
alert(error.message || 'Login failed');
}

}

btn.disabled=false;

}



/* =========================
AUTO LOGOUT
========================= */

let logoutTimer;
const INACTIVITY_LIMIT = 30 * 60 * 1000;

function resetLogoutTimer(){

clearTimeout(logoutTimer);

logoutTimer=setTimeout(async()=>{

try{

await account.deleteSession('current');

alert('Logged out due to inactivity');

window.location.href='login.html';

}catch(err){
console.error(err);
}

},INACTIVITY_LIMIT);

}


[
'mousemove',
'keydown',
'click',
'scroll',
'touchstart'
].forEach(evt=>{
window.addEventListener(evt,resetLogoutTimer);
});

window.addEventListener('DOMContentLoaded',resetLogoutTimer);



/* =========================
EXPORT
========================= */

window.register = register;
window.login = login;