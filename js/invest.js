import { account, databases, ID } from './appwrite.js';

const DATABASE_ID = "696f9104001dfedc5e1a";
const COLLECTION_WALLETS = "wallets";
const COLLECTION_INVESTMENTS = "investment";
const COLLECTION_EARNINGS = "collection_earnings";

let activeTimers = {};


/* FORMAT USD */

function formatUSD(amount){
return new Intl.NumberFormat('en-US',{
style:'currency',
currency:'USD'
}).format(amount);
}


/* PLAN USER RESTRICTIONS
Only restrict users you manually add here */

const PLAN_RESTRICTIONS = {

"DANGOTE TRUCKS":{
blockedUsers:[]
},

"RAW-GOLD":{
blockedUsers:[]
}

};


/* CHECK IF USER CAN ACCESS PLAN */

function checkPlanAccess(planName,user){

const rule = PLAN_RESTRICTIONS[planName];

if(!rule) return true;

const blocked = rule.blockedUsers || [];

if(blocked.includes(user.$id)) return false;

if(blocked.includes(user.name)) return false;

return true;

}



/* START INVESTMENT COUNTDOWN */

function startCountdown(inv, elementId, containerDiv){

const el = document.getElementById(elementId);

if(!el) return;

const targetTime =
new Date(inv.createdAt).getTime() +
(inv.duration * 24 * 60 * 60 * 1000);


function update(){

const now = Date.now();

const distance = targetTime - now;


/* INVESTMENT MATURED */

if(distance <= 0){

el.innerHTML="✅ Matured";

if(inv.status==="active" && !containerDiv.querySelector(".claim-btn")){

const claimBtn=document.createElement("button");

claimBtn.className="claim-btn";

claimBtn.innerText="Claim ROI";


claimBtn.onclick = async()=>{

try{

const expectedReturn =
Math.round(inv.amount * (1 + inv.roi / 100));


/* FIND USER WALLET */

const walletsRes =
await databases.listDocuments(
DATABASE_ID,
COLLECTION_WALLETS
);

const wallet =
walletsRes.documents.find(
w=>w.userId===inv.userId
);

if(!wallet) throw new Error("Wallet not found");


/* CREDIT WALLET */

await databases.updateDocument(
DATABASE_ID,
COLLECTION_WALLETS,
wallet.$id,
{
balance: wallet.balance + expectedReturn
}
);


/* SAVE EARNINGS RECORD */

await databases.createDocument(
DATABASE_ID,
COLLECTION_EARNINGS,
ID.unique(),
{
userId:inv.userId,
userName:inv.userName,
investmentId:inv.$id,
amount:expectedReturn,
roi:inv.roi,
planName:inv.planName,
status:"approved",
createdAt:new Date()
}
);


/* MARK INVESTMENT COMPLETED */

await databases.updateDocument(
DATABASE_ID,
COLLECTION_INVESTMENTS,
inv.$id,
{
status:"completed"
}
);

claimBtn.outerHTML=
`<span class="success">ROI Claimed</span>`;

setTimeout(()=>{
loadUserInvestments();
},1500);

}catch(err){

console.error(err);

alert("Claim failed");

}

};

containerDiv.appendChild(claimBtn);

}

clearInterval(activeTimers[inv.$id]);

return;

}


/* COUNTDOWN TIMER */

const days=Math.floor(distance/(1000*60*60*24));

const hours=Math.floor((distance/(1000*60*60))%24);

const minutes=Math.floor((distance/(1000*60))%60);

const seconds=Math.floor((distance/1000)%60);


el.innerHTML=
`<span style="color:#22c55e;font-weight:bold;">
${days}d ${hours}h ${minutes}m ${seconds}s
</span>`;

}

update();

activeTimers[inv.$id]=setInterval(update,1000);

}



/* INVEST FUNCTION */

export async function invest(amount, roi, duration, planName){

try{

const user = await account.get();


/* CHECK PLAN RESTRICTION */

if(!checkPlanAccess(planName,user)){

alert("You are restricted from using this investment plan");

throw new Error("User restricted from plan");

}


/* FIND WALLET */

const walletsRes =
await databases.listDocuments(
DATABASE_ID,
COLLECTION_WALLETS
);

const wallet =
walletsRes.documents.find(
w=>w.userId===user.$id
);

if(!wallet) throw new Error("Wallet not found");


/* CHECK BALANCE */

if(wallet.balance < amount)
throw new Error("Insufficient balance");


/* DEDUCT BALANCE */

await databases.updateDocument(
DATABASE_ID,
COLLECTION_WALLETS,
wallet.$id,
{
balance: wallet.balance - amount
}
);


/* CREATE INVESTMENT */

await databases.createDocument(
DATABASE_ID,
COLLECTION_INVESTMENTS,
ID.unique(),
{
userId:user.$id,
userName:user.name,
amount,
roi,
duration,
planName,
status:"active",
createdAt:new Date()
});

}catch(err){

console.error(err);

throw err;

}

}



/* LOAD USER INVESTMENTS */

export async function loadUserInvestments(containerId="my-investments"){

try{

const user = await account.get();

const res =
await databases.listDocuments(
DATABASE_ID,
COLLECTION_INVESTMENTS
);

const investments =
res.documents.filter(
inv=>inv.userId===user.$id
);

const container=document.getElementById(containerId);

if(!container) return;

container.innerHTML="";


investments.forEach(inv=>{

const div=document.createElement("div");

div.classList.add("user-investment");


const expectedReturn =
Math.round(inv.amount*(1+inv.roi/100));


let statusSection="";

if(inv.status==="completed"){

statusSection=
`<span class="success">Completed | ROI Credited</span>`;

}


div.innerHTML=`

<p><strong>${inv.planName}</strong></p>

<p>
${formatUSD(inv.amount)} | ROI: ${inv.roi}% | Duration: ${inv.duration} days
</p>

<p style="color:#22c55e;font-weight:bold;">
Expected Return: ${formatUSD(expectedReturn)}
</p>

<p>
Time Remaining:
<span id="countdown-${inv.$id}">Loading...</span>
</p>

${statusSection}

`;

container.appendChild(div);


if(inv.status==="active"){

startCountdown(
inv,
`countdown-${inv.$id}`,
div
);

}

});

}catch(err){

console.error(err);

}

}



/* LOGOUT */

export async function logout(){

try{

await account.deleteSession("current");

window.location.href="login.html";

}catch(err){

alert("Logout failed");

}

}



/* GLOBAL FUNCTIONS */

window.invest = invest;
window.loadUserInvestments = loadUserInvestments;
window.logout = logout;;
