import { 
Client, 
Account, 
Databases, 
ID, 
Query 
} from "https://cdn.jsdelivr.net/npm/appwrite@13.0.0/+esm";


/* =========================
APPWRITE CLIENT
========================= */

export const client = new Client()
.setEndpoint("https://nyc.cloud.appwrite.io/v1")   // Appwrite endpoint
.setProject("696f9104001dfedc5e1a");                // Project ID


export const account = new Account(client);
export const databases = new Databases(client);

export { ID, Query };


/* =========================
DATABASE
========================= */

export const DATABASE_ID = "6970722d00269d80304f";


/* =========================
COLLECTIONS
========================= */

export const COLLECTION_WALLETS      = "wallets";
export const COLLECTION_INVESTMENTS  = "investment";
export const COLLECTION_BANK         = "bank_details";

export const COLLECTION_FUNDS        = "fundrequest";
export const COLLECTION_WITHDRAWALS  = "withdraw_request";

export const COLLECTION_REFERRALS    = "referrals";
export const COLLECTION_EARNINGS     = "users_collections";

export const COLLECTION_ADMINS       = "admins";


/* =========================
SYSTEM COLLECTION
(ADMIN CONTROLS)
========================= */

export const COLLECTION_SYSTEM       = "system";