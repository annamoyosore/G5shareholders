import { account, databases, ID } from './appwrite.js';

const DATABASE_ID="696f9104001dfedc5e1a";
const COLLECTION_WALLETS="wallets";
const COLLECTION_INVESTMENTS="investment";
const COLLECTION_EARNINGS="collection_earnings";

let activeTimers={};


/* FORMAT */

function formatUSD(amount){
return new Intl.NumberFormat('en-US',{
style:'currency',
currency:'USD'
}).format(amount);
}


/* PLAN RESTRICTIONS */

const PLAN_RESTRICTIONS={

"DANGOTE TRUCKS":{blockedUsers:[]},
"RAW-GOLD":{blockedUsers:[]}

};


function checkPlanAccess(planName,user){

const rule=PLAN_RESTRICTIONS[planName];

if(!rule) return true;

if(rule.blockedUsers.includes(user.$id)) return false;
if(rule.blockedUsers.includes(user.name)) return false;

return true;

}



/* INVEST FUNCTION */

export async function invest(amount,roi,duration,planName){

try{

const user=await account.get();

if(!checkPlanAccess(planName,user)){
alert("You are restricted from this plan");
return;
}

const walletsRes=
await databases.listDocuments(
DATABASE_ID,
COLLECTION_WALLETS
);

const wallet=
walletsRes.documents.find(
w=>w.userId===user.$id
);

if(!wallet) throw new Error("Wallet not found");

if(wallet.balance < amount){
alert("Insufficient balance");
return;
}


/* DEDUCT WALLET */

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
createdAt:new Date().toISOString()
});

alert("Investment successful");

loadUserInvestments();

}catch(err){

console.error(err);
alert("Investment failed");

}

}



/* LOAD USER INVESTMENTS */

export async function loadUserInvestments(containerId="my-investments"){

try{

const user=await account.get();

const res=
await databases.listDocuments(
DATABASE_ID,
COLLECTION_INVESTMENTS
);

const investments=res.documents.filter(
inv=>inv.userId===user.$id
);

const container=document.getElementById(containerId);

if(!container) return;

container.innerHTML="";


investments.forEach(inv=>{

const div=document.createElement("div");

div.classList.add("user-investment");

const expectedReturn=
Math.round(inv.amount*(1+inv.roi/100));

div.innerHTML=`

<p><strong>${inv.planName}</strong></p>

<p>${formatUSD(inv.amount)} | ROI ${inv.roi}%</p>

<p>Expected Return: ${formatUSD(expectedReturn)}</p>

<p>Time Remaining:
<span id="countdown-${inv.$id}"></span>
</p>

`;

container.appendChild(div);

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

}catch{

alert("Logout failed");

}

}


/* GLOBAL ACCESS */

window.invest=invest;
window.loadUserInvestments=loadUserInvestments;
window.logout=logout;