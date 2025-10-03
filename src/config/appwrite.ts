import { Client, Account, Databases, Storage, ID } from 'appwrite';

// ✅ Configure Appwrite client (using demo configuration)
const client = new Client()
    .setEndpoint('http://localhost/v1') // Appwrite endpoint from demo
    .setProject('social-hub'); // Project ID from demo

// Initialize services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Configuration
export const appwriteConfig = {
    endpoint: 'http://localhost/v1',
    projectId: 'social-hub',
    databaseId: 'main',
    usersCollectionId: 'users',
    storageProfilePicturesBucketId: 'profile-pictures'
};

export { client, ID };