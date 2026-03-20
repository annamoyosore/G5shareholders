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

  /* ================= GET OR CREATE WALLET ================= */
  async getOrCreateWallet(userId) {

    const walletRes = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_WALLETS,
      [Query.equal("userId", userId)]
    );

    let wallet = walletRes.documents[0];

    if (!wallet) {
      wallet = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_WALLETS,
        ID.unique(),
        {
          userId,
          balance: 0,
          createdAt: new Date().toISOString()
        }
      );
    }

    return wallet;
  },

  /* ================= INITIALIZE WALLET ================= */
  async initializeWallet() {
    try {
      const user = await account.get();

      const wallet = await this.getOrCreateWallet(user.$id);

      document.getElementById('walletBalance').innerText =
        `₦${Number(wallet.balance).toLocaleString()}`;

      await this.reloadPendingRequests();
      await this.loadMaturedInvestments();

    } catch (err) {
      console.error('Wallet initialization error:', err);
      alert(err.message);
      document.getElementById('walletBalance').innerText = 'Error';
    }
  },

  /* ================= LOAD PENDING REQUESTS ================= */
  async reloadPendingRequests() {
    try {
      const user = await account.get();
      const pendingDiv = document.getElementById('pendingRequests');
      if (!pendingDiv) return;

      pendingDiv.innerHTML = '';

      const fundRes = await databases.listDocuments(DATABASE_ID, COLLECTION_FUNDS);
      const withdrawRes = await databases.listDocuments(DATABASE_ID, COLLECTION_WITHDRAWALS);

      const pending = [
        ...fundRes.documents
          .filter(r => r.userId === user.$id && r.status === 'pending')
          .map(r => ({ ...r, type: 'Fund' })),

        ...withdrawRes.documents
          .filter(r => r.userId === user.$id && r.status === 'pending')
          .map(r => ({ ...r, type: 'Withdrawal' }))
      ];

      if (!pending.length) {
        pendingDiv.innerText = 'No pending requests';
        return;
      }

      pending.forEach(r => {
        const div = document.createElement('div');
        div.classList.add('pending-request');

        div.innerHTML = `
          <span>${r.type} Request: ₦${r.amount}</span>
          <button>Cancel</button>
        `;

        const btn = div.querySelector('button');

        btn.onclick = async () => {
          try {
            btn.disabled = true;
            btn.innerText = 'Cancelling...';

            await databases.deleteDocument(
              DATABASE_ID,
              r.type === 'Fund' ? COLLECTION_FUNDS : COLLECTION_WITHDRAWALS,
              r.$id
            );

            await this.reloadPendingRequests();

          } catch (err) {
            console.error(err);
            btn.disabled = false;
            btn.innerText = 'Cancel';
            alert('Failed to cancel request');
          }
        };

        pendingDiv.appendChild(div);
      });

    } catch (err) {
      console.error('Error loading pending requests:', err);
    }
  },

  /* ================= REQUEST FUND ================= */
  async requestFund() {
    try {
      const amount = Number(prompt('Enter amount to request'));
      if (!amount || isNaN(amount) || amount <= 0)
        throw new Error('Invalid amount');

      const user = await account.get();

      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_FUNDS,
        ID.unique(),
        {
          userId: user.$id,
          amount,
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      );

      alert('Fund request sent!');
      await this.reloadPendingRequests();

    } catch (err) {
      alert(err.message);
    }
  },

  /* ================= REQUEST WITHDRAWAL ================= */
  async requestWithdrawal() {
    try {
      const amount = Number(prompt('Enter withdrawal amount'));
      if (!amount || isNaN(amount) || amount <= 0)
        throw new Error('Invalid amount');

      const user = await account.get();

      const wallet = await this.getOrCreateWallet(user.$id);

      if (amount > wallet.balance)
        throw new Error('Insufficient balance');

      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_WITHDRAWALS,
        ID.unique(),
        {
          userId: user.$id,
          amount,
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      );

      alert('Withdrawal request sent!');
      await this.reloadPendingRequests();

    } catch (err) {
      alert(err.message);
    }
  },

  /* ================= LOAD MATURED INVESTMENTS ================= */
  async loadMaturedInvestments() {
    try {
      const user = await account.get();
      const container = document.getElementById('maturedInvestments');
      if (!container) return;

      container.innerHTML = '';

      const invRes = await databases.listDocuments(DATABASE_ID, COLLECTION_INVESTMENTS);
      const investments = invRes.documents.filter(inv => inv.userId === user.$id);

      const now = Date.now();

      for (const inv of investments) {

        const div = document.createElement('div');
        div.classList.add('user-investment');

        const expectedReturn =
          inv.expectedReturn ??
          Math.round(inv.amount * (1 + inv.roi / 100));

        const targetTime =
          new Date(inv.createdAt).getTime() +
          inv.duration * 86400000;

        div.innerHTML = `
          <p>${inv.planName || 'Unnamed Plan'} |
          ₦${inv.amount} | ROI: ${inv.roi}% |
          Duration: ${inv.duration} days</p>
          <p style="font-weight:bold;color:#10b981">
          Expected Return: ₦${expectedReturn}</p>
        `;

        if (inv.status === 'active' && now >= targetTime) {

          const claimBtn = document.createElement('button');
          claimBtn.innerText = 'Claim ROI';

          claimBtn.onclick = async () => {
            try {

              await databases.createDocument(
                DATABASE_ID,
                COLLECTION_EARNINGS,
                ID.unique(),
                {
                  userId: user.$id,
                  investmentId: inv.$id,
                  amount: expectedReturn,
                  status: 'approved',
                  createdAt: new Date().toISOString()
                }
              );

              const wallet = await this.getOrCreateWallet(user.$id);

              await databases.updateDocument(
                DATABASE_ID,
                COLLECTION_WALLETS,
                wallet.$id,
                { balance: wallet.balance + expectedReturn }
              );

              await databases.updateDocument(
                DATABASE_ID,
                COLLECTION_INVESTMENTS,
                inv.$id,
                { status: 'completed' }
              );

              const updatedWallet = await databases.getDocument(
                DATABASE_ID,
                COLLECTION_WALLETS,
                wallet.$id
              );

              document.getElementById('walletBalance').innerText =
                `₦${updatedWallet.balance}`;

              claimBtn.outerHTML =
                `<span>Completed | ROI Credited</span>`;

            } catch (err) {
              console.error(err);
              alert('Claim failed');
            }
          };

          div.appendChild(claimBtn);
        }

        container.appendChild(div);
      }

    } catch (err) {
      console.error('Error loading investments:', err);
    }
  },

  /* ================= LOGOUT ================= */
  async logout() {
    await account.deleteSession('current');
    window.location.href = 'login.html';
  }
};