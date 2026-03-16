import { account } from './appwrite.js';

export async function getUserMeta() {

try {

const user = await account.get();

return {
userId: user.$id,
userName: user.name || "Unknown User"
};

} catch (err) {

console.error("User fetch failed", err);

return {
userId: null,
userName: "Unknown"
};

}

}