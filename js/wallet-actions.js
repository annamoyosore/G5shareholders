import {
  account,
  databases,
  ID,
  DATABASE_ID,
  COLLECTION_FUNDS,
  COLLECTION_WITHDRAWALS,
  COLLECTION_WALLETS,
  COLLECTION_INVESTMENTS,
  COLLECTION_EARNINGS,
  Query
} from './appwrite.js';

export const walletActions = {

  user: null,
  wallet: null,

/* ================= INITIALIZE ================= */

async initializeWallet(){

  try{

    this.user = await account.get();

    /* ✅ CORRECT QUERY */
    const walletRes = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_WALLETS,
      [Query.equal("userId", this.user.$id)]
    );

    this.wallet = walletRes.documents[0];

    /* ✅ CREATE IF NOT EXISTS */
    if(!this.wallet){

      this.wallet = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_WALLETS,
        ID.unique(),
        {
          userId: this.user.$id,
          balance: 0,
          createdAt: new Date().toISOString()
        }
      );
    }

    this.updateBalanceUI(this.wallet.balance);

    await this.reloadPendingRequests();
    await this.loadMaturedInvestments();

  }catch(err){

    console.error("Wallet Init Error:", err);
    alert(err.message);

    const el = document.getElementById("walletBalance");
    if(el){
      el.innerText = "Error loading wallet";
    }
  }
},

/* ================= UI ================= */

updateBalanceUI(amount){
  const el = document.getElementById("walletBalance");
  if(el){
    el.innerText = `₦${Number(amount).toLocaleString()}`;
  }
},

/* ================= REQUEST FUND ================= */

async requestFund(){

  try{

    const amount = Number(prompt("Enter amount"));

    if(!amount || amount <= 0)
      throw new Error("Invalid amount");

    const user = await account.get();

    await databases.createDocument(
      DATABASE_ID,
      COLLECTION_FUNDS,
      ID.unique(),
      {
        userId: user.$id,
        amount,
        status: "pending",
        createdAt: new Date().toISOString()
      }
    );

    alert("Fund request sent");

    await this.reloadPendingRequests();

  }catch(err){
    alert(err.message);
  }
},

/* ================= REQUEST WITHDRAW ================= */

async requestWithdrawal(){

  try{

    const amount = Number(prompt("Enter amount"));

    if(!amount || amount <= 0)
      throw new Error("Invalid amount");

    const user = await account.get();

    const wallet = await this.getUserWallet(user.$id);

    if(amount > wallet.balance)
      throw new Error("Insufficient balance");

    await databases.createDocument(
      DATABASE_ID,
      COLLECTION_WITHDRAWALS,
      ID.unique(),
      {
        userId: user.$id,
        amount,
        status: "pending",
        createdAt: new Date().toISOString()
      }
    );

    alert("Withdrawal request sent");

    await this.reloadPendingRequests();

  }catch(err){
    alert(err.message);
  }
},

/* ================= CLAIM ROI ================= */

async claimROI(investmentId){

  try{

    const user = await account.get();

    const inv = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_INVESTMENTS,
      investmentId
    );

    if(inv.claimed || inv.status === "completed"){
      throw new Error("Already claimed");
    }

    const now = Date.now();
    const target =
      new Date(inv.createdAt).getTime() +
      inv.duration * 86400000;

    if(now < target){
      throw new Error("Not matured yet");
    }

    const expected =
      inv.expectedReturn ??
      Math.round(inv.amount * (1 + inv.roi / 100));

    /* CREATE EARNING */
    await databases.createDocument(
      DATABASE_ID,
      COLLECTION_EARNINGS,
      ID.unique(),
      {
        userId: user.$id,
        investmentId: inv.$id,
        amount: expected,
        status: "approved",
        createdAt: new Date().toISOString()
      }
    );

    /* UPDATE WALLET */
    const wallet = await this.getUserWallet(user.$id);

    const newBalance = wallet.balance + expected;

    await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_WALLETS,
      wallet.$id,
      {
        balance: newBalance
      }
    );

    /* MARK INVESTMENT */
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_INVESTMENTS,
      inv.$id,
      {
        status: "completed",
        claimed: true
      }
    );

    this.updateBalanceUI(newBalance);

    alert("ROI claimed successfully");

  }catch(err){
    alert(err.message);
  }
},

/* ================= ADMIN: APPROVE FUND ================= */

async approveFund(fundId){

  try{

    const fund = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_FUNDS,
      fundId
    );

    if(fund.status === "approved"){
      throw new Error("Already approved");
    }

    const wallet = await this.getUserWallet(fund.userId);

    const newBalance = wallet.balance + fund.amount;

    await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_FUNDS,
      fundId,
      {
        status: "approved",
        approvedAt: new Date().toISOString()
      }
    );

    await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_WALLETS,
      wallet.$id,
      {
        balance: newBalance
      }
    );

  }catch(err){
    console.error(err);
  }
},

/* ================= ADMIN: APPROVE WITHDRAW ================= */

async approveWithdrawal(withdrawId){

  try{

    const withdraw = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_WITHDRAWALS,
      withdrawId
    );

    if(withdraw.status === "approved"){
      throw new Error("Already approved");
    }

    const wallet = await this.getUserWallet(withdraw.userId);

    if(withdraw.amount > wallet.balance){
      throw new Error("Insufficient balance");
    }

    const newBalance = wallet.balance - withdraw.amount;

    await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_WITHDRAWALS,
      withdrawId,
      {
        status: "approved",
        approvedAt: new Date().toISOString()
      }
    );

    await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_WALLETS,
      wallet.$id,
      {
        balance: newBalance
      }
    );

  }catch(err){
    console.error(err);
  }
},

/* ================= HELPERS ================= */

async getUserWallet(userId){

  const walletRes = await databases.listDocuments(
    DATABASE_ID,
    COLLECTION_WALLETS,
    [Query.equal("userId", userId)]
  );

  const wallet = walletRes.documents[0];

  if(!wallet) throw new Error("Wallet not found");

  return wallet;
}

};