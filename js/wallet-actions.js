import {
  account,
  databases,
  ID,
  DATABASE_ID,
  COLLECTION_FUNDS,
  COLLECTION_WITHDRAWALS,
  COLLECTION_WALLETS,
  COLLECTION_INVESTMENTS,
  COLLECTION_EARNINGS
} from './appwrite.js';

export const walletActions = {

  user:null,
  wallet:null,

/* ================= INITIALIZE WALLET ================= */

async initializeWallet(){

try{

this.user = await account.get();

/* LOAD WALLET */

let walletRes = await databases.listDocuments(
DATABASE_ID,
COLLECTION_WALLETS
);

this.wallet =
walletRes.documents.find(w=>w.userId===this.user.$id);

/* AUTO CREATE WALLET */

if(!this.wallet){

this.wallet =
await databases.createDocument(
DATABASE_ID,
COLLECTION_WALLETS,
ID.unique(),
{
userId:this.user.$id,
balance:0,
createdAt:new Date().toISOString()
}
);

}

/* SHOW BALANCE */

const balanceEl =
document.getElementById("walletBalance");

if(balanceEl){

balanceEl.innerText =
`₦${Number(this.wallet.balance).toLocaleString()}`;

}

/* LOAD DATA */

await this.reloadPendingRequests();
await this.loadMaturedInvestments();

}catch(err){

console.error("Wallet initialization error:",err);

/* DO NOT LOGOUT USER */

const balanceEl =
document.getElementById("walletBalance");

if(balanceEl){

balanceEl.innerText="Error loading wallet";

}

}

},

/* ================= LOAD PENDING REQUESTS ================= */

async reloadPendingRequests(){

try{

const user = await account.get();

const pendingDiv =
document.getElementById("pendingRequests");

if(!pendingDiv) return;

pendingDiv.innerHTML="";

const fundRes =
await databases.listDocuments(
DATABASE_ID,
COLLECTION_FUNDS
);

const withdrawRes =
await databases.listDocuments(
DATABASE_ID,
COLLECTION_WITHDRAWALS
);

const pending=[

...fundRes.documents
.filter(r=>r.userId===user.$id && r.status==="pending")
.map(r=>({...r,type:"Fund"})),

...withdrawRes.documents
.filter(r=>r.userId===user.$id && r.status==="pending")
.map(r=>({...r,type:"Withdrawal"}))

];

if(!pending.length){

pendingDiv.innerText="No pending requests";
return;

}

pending.forEach(r=>{

const div=document.createElement("div");

div.className="pending-request";

div.innerHTML=`
<span>${r.type} Request: ₦${r.amount}</span>
<button>Cancel</button>
`;

const btn = div.querySelector("button");

btn.onclick = async()=>{

try{

btn.disabled=true;
btn.innerText="Cancelling...";

await databases.deleteDocument(
DATABASE_ID,
r.type==="Fund"
? COLLECTION_FUNDS
: COLLECTION_WITHDRAWALS,
r.$id
);

await this.reloadPendingRequests();

}catch(err){

console.error(err);

btn.disabled=false;
btn.innerText="Cancel";

alert("Failed to cancel request");

}

};

pendingDiv.appendChild(div);

});

}catch(err){

console.error("Error loading pending requests:",err);

}

},

/* ================= REQUEST FUND ================= */

async requestFund(){

try{

const amount =
Number(prompt("Enter amount to request"));

if(!amount || amount<=0)
throw new Error("Invalid amount");

const user = await account.get();

await databases.createDocument(
DATABASE_ID,
COLLECTION_FUNDS,
ID.unique(),
{
userId:user.$id,
amount,
status:"pending",
createdAt:new Date().toISOString()
}
);

alert("Fund request sent");

await this.reloadPendingRequests();

}catch(err){

console.error(err);
alert(err.message);

}

},

/* ================= REQUEST WITHDRAW ================= */

async requestWithdrawal(){

try{

const amount =
Number(prompt("Enter withdrawal amount (Min $700)"));

if(!amount || amount<700)
throw new Error("Minimum withdraw $700");

const user = await account.get();

let walletRes =
await databases.listDocuments(
DATABASE_ID,
COLLECTION_WALLETS
);

let wallet =
walletRes.documents.find(
w=>w.userId===user.$id
);

if(!wallet) throw new Error("Wallet not found");

if(amount>wallet.balance)
throw new Error("Insufficient balance");

await databases.createDocument(
DATABASE_ID,
COLLECTION_WITHDRAWALS,
ID.unique(),
{
userId:user.$id,
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

/* ================= LOAD MATURED INVESTMENTS ================= */

async loadMaturedInvestments(){

try{

const user = await account.get();

const container =
document.getElementById("maturedInvestments");

if(!container) return;

container.innerHTML="";

const invRes =
await databases.listDocuments(
DATABASE_ID,
COLLECTION_INVESTMENTS
);

const investments =
invRes.documents.filter(
inv=>inv.userId===user.$id
);

const now = Date.now();

investments.forEach(inv=>{

const div=document.createElement("div");

div.className="user-investment";

const expected =
Math.round(inv.amount*(1+inv.roi/100));

const target =
new Date(inv.createdAt).getTime() +
inv.duration*86400000;

div.innerHTML=`
<p>${inv.planName || "Unnamed Plan"} |
₦${inv.amount} | ROI ${inv.roi}% |
Duration ${inv.duration} days</p>

<p style="color:#10b981;font-weight:bold">
Expected Return: ₦${expected}
</p>
`;

/* CLAIM BUTTON */

if(inv.status==="active" && now>=target){

const claimBtn=document.createElement("button");

claimBtn.className="claim-btn";

claimBtn.innerText="Claim ROI";

claimBtn.onclick=async()=>{

try{

await databases.createDocument(
DATABASE_ID,
COLLECTION_EARNINGS,
ID.unique(),
{
userId:user.$id,
investmentId:inv.$id,
amount:expected,
status:"approved",
createdAt:new Date().toISOString()
}
);

let walletRes =
await databases.listDocuments(
DATABASE_ID,
COLLECTION_WALLETS
);

let wallet =
walletRes.documents.find(
w=>w.userId===user.$id
);

await databases.updateDocument(
DATABASE_ID,
COLLECTION_WALLETS,
wallet.$id,
{
balance:wallet.balance + expected
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

document.getElementById("walletBalance")
.innerText=`₦${wallet.balance + expected}`;

claimBtn.outerHTML=
`<span class="completed">Completed | ROI Credited</span>`;

}catch(err){

console.error(err);
alert("Claim failed");

}

};

div.appendChild(claimBtn);

}

container.appendChild(div);

});

}catch(err){

console.error("Error loading investments:",err);

}

},

/* ================= LOGOUT ================= */

async logout(){

try{

await account.deleteSession("current");

window.location.href="login.html";

}catch(err){

console.error(err);
alert("Logout failed");

}

}

};