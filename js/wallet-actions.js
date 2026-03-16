import {
account,
databases,
ID,
Query,
DATABASE_ID,
COLLECTION_FUNDS,
COLLECTION_WITHDRAWALS,
COLLECTION_WALLETS,
COLLECTION_INVESTMENTS,
COLLECTION_EARNINGS,
COLLECTION_SYSTEM
} from "./appwrite.js";

export const walletActions={

user:null,
wallet:null,

/* =========================
INITIALIZE WALLET
========================= */

async initializeWallet(){

try{

/* GET CURRENT USER */

this.user = await account.get();

/* =========================
CHECK SYSTEM MAINTENANCE
========================= */

try{

const systemRes = await databases.listDocuments(
DATABASE_ID,
COLLECTION_SYSTEM
);

if(systemRes.documents.length){

const sys = systemRes.documents[0];

if(sys.maintenance === true){

document.body.innerHTML =
"<h2 style='text-align:center;margin-top:120px'>Platform Under Maintenance</h2>";

return;

}

}

}catch(e){

console.log("Maintenance check skipped");

}

/* =========================
LOAD OR CREATE WALLET
========================= */

let walletRes =
await databases.listDocuments(
DATABASE_ID,
COLLECTION_WALLETS,
[
Query.equal("userId",this.user.$id),
Query.limit(1)
]
);

if(walletRes.documents.length){

this.wallet = walletRes.documents[0];

}else{

this.wallet =
await databases.createDocument(
DATABASE_ID,
COLLECTION_WALLETS,
ID.unique(),
{
userId:this.user.$id,
userName:this.user.name,
balance:0,
withdrawFrozen:false,
createdAt:new Date().toISOString()
}
);

}

/* =========================
DISPLAY WALLET BALANCE
========================= */

const balanceEl = document.getElementById("walletBalance");

if(balanceEl){

balanceEl.innerText =
`$${Number(this.wallet.balance).toLocaleString()}`;

}

/* =========================
WITHDRAW FREEZE WARNING
========================= */

if(this.wallet.withdrawFrozen){

const warn=document.getElementById("withdrawWarning");

if(warn) warn.style.display="block";

const withdrawBtn=document.getElementById("withdrawBtn");

if(withdrawBtn) withdrawBtn.disabled=true;

}

/* =========================
LOAD DATA
========================= */

await this.reloadPendingRequests();
await this.loadMaturedInvestments();

}catch(err){

console.error("Wallet initialization error:",err);

/* ONLY REDIRECT IF SESSION EXPIRED */

if(err.code === 401 || err.message?.includes("missing scope")){

window.location.href="login.html";

}

}

},

/* =========================
REQUEST FUND
========================= */

async requestFund(){

try{

const amount = Number(prompt("Enter amount to deposit"));

if(!amount || amount<=0)
throw new Error("Invalid amount");

await databases.createDocument(
DATABASE_ID,
COLLECTION_FUNDS,
ID.unique(),
{
userId:this.user.$id,
userName:this.user.name,
amount,
status:"pending",
type:"crypto",
createdAt:new Date().toISOString()
}
);

alert("Deposit request sent to admin");

await this.reloadPendingRequests();

}catch(err){

console.error(err);
alert(err.message);

}

},

/* =========================
REQUEST WITHDRAWAL
========================= */

async requestWithdrawal(){

try{

const amount =
Number(prompt("Enter withdrawal amount (Min $700)"));

if(!amount || amount<700)
throw new Error("Minimum withdrawal is $700");

if(this.wallet.withdrawFrozen)
throw new Error("Withdrawals disabled for your account");

if(amount > this.wallet.balance)
throw new Error("Insufficient wallet balance");

await databases.createDocument(
DATABASE_ID,
COLLECTION_WITHDRAWALS,
ID.unique(),
{
userId:this.user.$id,
userName:this.user.name,
amount,
status:"pending",
createdAt:new Date().toISOString()
}
);

alert("Withdrawal request sent");

await this.reloadPendingRequests();

}catch(err){

console.error(err);
alert(err.message);

}

},

/* =========================
LOAD PENDING REQUESTS
========================= */

async reloadPendingRequests(){

const container =
document.getElementById("pendingRequests");

if(!container) return;

container.innerHTML="Loading...";

try{

const fundRes =
await databases.listDocuments(
DATABASE_ID,
COLLECTION_FUNDS,
[
Query.equal("userId",this.user.$id),
Query.equal("status","pending")
]
);

const withdrawRes =
await databases.listDocuments(
DATABASE_ID,
COLLECTION_WITHDRAWALS,
[
Query.equal("userId",this.user.$id),
Query.equal("status","pending")
]
);

const requests=[
...fundRes.documents,
...withdrawRes.documents
];

container.innerHTML="";

if(requests.length===0){

container.innerText="No pending requests";
return;

}

requests.forEach(r=>{

const div=document.createElement("div");

div.className="pending-request";

div.innerHTML=`

<p><b>Amount:</b> $${r.amount}</p>
<p class="pending">Pending Admin Approval</p>

`;

container.appendChild(div);

});

}catch(err){

console.error(err);
container.innerText="Error loading requests";

}

},

/* =========================
LOAD MATURED INVESTMENTS
========================= */

async loadMaturedInvestments(){

const container =
document.getElementById("maturedInvestments");

if(!container) return;

container.innerHTML="";

try{

const res =
await databases.listDocuments(
DATABASE_ID,
COLLECTION_INVESTMENTS,
[
Query.equal("userId",this.user.$id)
]
);

const investments=res.documents;

const now=Date.now();

investments.forEach(inv=>{

const target =
new Date(inv.createdAt).getTime() +
(inv.duration*86400000);

if(inv.status==="active" && now>=target){

const expected =
Math.round(inv.amount*(1+inv.roi/100));

const div=document.createElement("div");

div.className="user-investment";

div.innerHTML=`

<p>${inv.planName}</p>

<p>$${inv.amount} | ROI ${inv.roi}%</p>

<p style="color:#10b981;font-weight:bold">
Return: $${expected}
</p>

`;

const btn=document.createElement("button");

btn.className="claim-btn";

btn.innerText="Claim ROI";

btn.onclick=async()=>{

await databases.updateDocument(
DATABASE_ID,
COLLECTION_WALLETS,
this.wallet.$id,
{
balance:this.wallet.balance+expected
}
);

await databases.updateDocument(
DATABASE_ID,
COLLECTION_INVESTMENTS,
inv.$id,
{
status:"completed"
}
);

/* UPDATE LOCAL BALANCE */

this.wallet.balance+=expected;

const bal=document.getElementById("walletBalance");

if(bal){

bal.innerText=
`$${Number(this.wallet.balance).toLocaleString()}`;

}

btn.outerHTML=
`<span class="completed">ROI Claimed</span>`;

};

div.appendChild(btn);

container.appendChild(div);

}

});

}catch(err){

console.error(err);

}

},

/* =========================
LOGOUT
========================= */

async logout(){

try{

await account.deleteSession("current");

}catch(e){

console.log("Session already cleared");

}

window.location.href="login.html";

}

};