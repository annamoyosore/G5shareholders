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
   CLEAR EXISTING SESSION
========================= */

async function clearSession(){

try{

/* CHECK IF SESSION EXISTS */

await account.get();

/* DELETE SESSION */

await account.deleteSession("current");

console.log("Previous session cleared");

}catch{

console.log("No existing session");

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

document.body.innerHTML = `
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
msgEl.classList.remove('success');

if(!name || !email || !password){

alert('Name, email, and password are required');
return;

}

if(password !== confirmPassword){

msgEl.textContent="Passwords do not match!";
return;

}

btn.disabled=true;

if(btn.querySelector('.btn-text'))
btn.querySelector('.btn-text').innerText='Creating...';

if(btn.querySelector('.spinner'))
btn.querySelector('.spinner').classList.remove('hidden');


await clearSession();


try{

/* CREATE USER */

const user = await account.create(
ID.unique(),
email,
password,
name
);


/* AUTO LOGIN */

await account.createEmailSession(email,password);


/* CREATE WALLET */

await databases.createDocument(
DATABASE_ID,
COLLECTION_WALLETS,
ID.unique(),
{
userId:user.$id,
userName:name,
balance:0,
withdrawFrozen:false,
createdAt:new Date().toISOString()
}
);


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


/* SUCCESS MESSAGE */

if(msgEl){

msgEl.textContent="Registration successful! Redirecting...";
msgEl.classList.add('success');

}

setTimeout(()=>{

window.location.href='dashboard.html';

},2500);


}catch(error){

console.error(error);

if(msgEl)
msgEl.textContent = error.message || "Registration failed";

}finally{

btn.disabled=false;

if(btn.querySelector('.btn-text'))
btn.querySelector('.btn-text').innerText='Register';

if(btn.querySelector('.spinner'))
btn.querySelector('.spinner').classList.add('hidden');

}

}



/* =========================
   LOGIN
========================= */

async function login(){

if(await checkMaintenance()) return;

const email = document.getElementById('email').value.trim();
const password = document.getElementById('password').value;

const btn = document.getElementById('loginBtn');
const msgEl = document.getElementById('formMessage');

if(!email || !password){

alert('Email and password required');
return;

}

btn.disabled=true;

if(btn.querySelector('.btn-text'))
btn.querySelector('.btn-text').innerText='Logging in...';

if(btn.querySelector('.spinner'))
btn.querySelector('.spinner').classList.remove('hidden');


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

alert('Email not registered. Please sign up first.');

}

else{

alert(error.message || 'Login failed');

}

if(msgEl) msgEl.textContent='';

}finally{

btn.disabled=false;

if(btn.querySelector('.btn-text'))
btn.querySelector('.btn-text').innerText='Login';

if(btn.querySelector('.spinner'))
btn.querySelector('.spinner').classList.add('hidden');

}

}



/* =========================
   AUTO LOGOUT AFTER INACTIVITY
========================= */

let logoutTimer;

const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes


function resetLogoutTimer(){

clearTimeout(logoutTimer);

logoutTimer=setTimeout(async()=>{

try{

await account.deleteSession('current');

alert('You were logged out due to inactivity.');

window.location.href='login.html';

}catch(err){

console.error('Auto logout error:',err);

}

},INACTIVITY_LIMIT);

}



/* ACTIVITY EVENTS */

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
   EXPORT FUNCTIONS
========================= */

window.register = register;
window.login = login;