import {
account,
databases,
DATABASE_ID,
COLLECTION_WALLETS,
COLLECTION_FUNDS,
COLLECTION_WITHDRAWALS,
COLLECTION_SYSTEM
} from "./appwrite.js";

export const adminActions={

walletCache:[],

/* ====================
MAINTENANCE MODE
==================== */

async toggleMaintenance(){

let system=await databases.listDocuments(
DATABASE_ID,
COLLECTION_SYSTEM
);

let doc=system.documents[0];

await databases.updateDocument(
DATABASE_ID,
COLLECTION_SYSTEM,
doc.$id,
{
maintenance:!doc.maintenance
}
);

alert("Maintenance mode updated");

},



/* ====================
LOAD USERS
==================== */

async loadWalletUsers(){

const container=document.getElementById("walletUsers");

container.innerHTML="";

let res=await databases.listDocuments(
DATABASE_ID,
COLLECTION_WALLETS
);

this.walletCache=res.documents;

res.documents.forEach(user=>{

let div=document.createElement("div");

div.className="card";

div.innerHTML=`

<b>UserID:</b> ${user.userId}<br>
<b>Balance:</b> $${user.balance}<br>
<b>Withdraw Frozen:</b> ${user.withdrawFrozen ? "YES" : "NO"}

`;

let freezeBtn=document.createElement("button");

if(user.withdrawFrozen){

freezeBtn.innerText="Unfreeze Withdraw";
freezeBtn.className="unfreeze";

freezeBtn.onclick=async()=>{

await databases.updateDocument(
DATABASE_ID,
COLLECTION_WALLETS,
user.$id,
{
withdrawFrozen:false
}
);

this.loadWalletUsers();

};

}else{

freezeBtn.innerText="Freeze Withdraw";
freezeBtn.className="freeze";

freezeBtn.onclick=async()=>{

await databases.updateDocument(
DATABASE_ID,
COLLECTION_WALLETS,
user.$id,
{
withdrawFrozen:true
}
);

this.loadWalletUsers();

};

}

div.appendChild(freezeBtn);

container.appendChild(div);

});

},



/* ====================
SEARCH USER
==================== */

searchUser(query){

let container=document.getElementById("walletUsers");

container.innerHTML="";

this.walletCache
.filter(u=>u.userId.includes(query))
.forEach(user=>{

let div=document.createElement("div");

div.className="card";

div.innerHTML=`

UserID: ${user.userId}<br>
Balance: $${user.balance}

`;

container.appendChild(div);

});

}

};