import {
account,
databases,
ID,
DATABASE_ID,
COLLECTION_FUNDS
} from "./appwrite.js";


/* =========================
LOGIN PROTECTION
========================= */

async function checkLogin(){

try{

await account.get();

}catch(err){

window.location.href="login.html";

}

}

checkLogin();



/* =========================
CRYPTO WALLET ADDRESSES
========================= */

const addresses={

bnb:"ueiejdkek",
eth:"0ejsidkdk",
btc:"1XXXXXXXXXXXXXXXXXXXXX",
usdt:"TXXXXXXXXXXXXXXXXXXXX",
sol:"XXXXXXXXXXXXXXXXXXXXX"

};



/* =========================
DOM ELEMENTS
========================= */

const cryptoTypeSelect=
document.getElementById("cryptoType");

const recipientInput=
document.getElementById("recipientAddress");

const amountInput=
document.getElementById("cryptoAmount");

const successMsg=
document.getElementById("successMsg");

const errorMsg=
document.getElementById("errorMsg");



/* =========================
UPDATE ADDRESS
========================= */

function updateAddress(){

const coin=
cryptoTypeSelect.value.toLowerCase();

recipientInput.value=
addresses[coin] || "Address unavailable";

}



/* INITIAL LOAD */

document.addEventListener(
"DOMContentLoaded",
updateAddress
);



/* COIN CHANGE */

cryptoTypeSelect.addEventListener(
"change",
updateAddress
);



/* =========================
COPY ADDRESS
========================= */

document
.getElementById("copyAddressBtn")
.addEventListener("click",()=>{

navigator.clipboard
.writeText(recipientInput.value)
.then(()=>{

alert("Address copied");

})
.catch(()=>{

alert("Copy failed");

});

});



/* =========================
SUBMIT DEPOSIT
========================= */

document
.getElementById("submitCryptoDeposit")
.addEventListener("click",async()=>{

successMsg.style.display="none";
errorMsg.style.display="none";


const coin=
cryptoTypeSelect.value.toLowerCase();

const recipient=
recipientInput.value;

const amount=
parseFloat(amountInput.value);


if(!amount || amount<=0){

errorMsg.innerText="Enter valid amount";
errorMsg.style.display="block";

return;

}


try{

const user=await account.get();


await databases.createDocument(

DATABASE_ID,
COLLECTION_FUNDS,
ID.unique(),

{

userId:user.$id,
userName:user.name,

type:"crypto",

cryptoType:coin,

recipientAddress:recipient,

amount:amount,

status:"pending",

createdAt:new Date().toISOString()

}

);


successMsg.innerText=
"Deposit request submitted successfully";

successMsg.style.display="block";

amountInput.value="";


}catch(err){

console.error(err);

errorMsg.innerText=
"Failed to submit request";

errorMsg.style.display="block";

}

});