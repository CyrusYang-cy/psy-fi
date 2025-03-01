'use server';

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";

import { plaidClient } from '@/lib/plaid';
import { revalidatePath } from "next/cache";
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
  APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
} = process.env;

export const getUserInfo = async ({ userId }: getUserInfoProps) => {
  try {
    const { database } = await createAdminClient();

    const user = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    )

    return parseStringify(user.documents[0]);
  } catch (error) {
    console.log(error)
  }
}

export const signIn = async ({ email, password }: signInProps) => {
  try {
    const { account } = await createAdminClient();
    const session = await account.createEmailPasswordSession(email, password);

    cookies().set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    const user = await getUserInfo({ userId: session.userId }) 

    return parseStringify(user);
  } catch (error) {
    console.error('Error', error);
  }
}

export const signUp = async ({ password, ...userData }: SignUpParams) => {
  const { email, firstName, lastName } = userData;
  
  let newUserAccount;

  try {
    const { account, database } = await createAdminClient();

    newUserAccount = await account.create(
      ID.unique(), 
      email, 
      password, 
      `${firstName} ${lastName}`
    );

    if(!newUserAccount) throw new Error('Error creating user')

    const dwollaCustomerUrl = await createDwollaCustomer({
      ...userData,
      type: 'personal'
    })

    if(!dwollaCustomerUrl) throw new Error('Error creating Dwolla customer')

    const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

    const newUser = await database.createDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      ID.unique(),
      {
        ...userData,
        userId: newUserAccount.$id,
        dwollaCustomerId,
        dwollaCustomerUrl
      }
    )

    const session = await account.createEmailPasswordSession(email, password);

    cookies().set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return parseStringify(newUser);
  } catch (error) {
    console.error('Error', error);
  }
}

export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    const result = await account.get();

    const user = await getUserInfo({ userId: result.$id})

    return parseStringify(user);
  } catch (error) {
    console.log(error)
    return null;
  }
}

export const logoutAccount = async () => {
  try {
    const { account } = await createSessionClient();

    cookies().delete('appwrite-session');

    await account.deleteSession('current');
  } catch (error) {
    return null;
  }
}

export const createLinkToken = async (user: User, isReconnect = false) => {
  try {
    // Basic token params that are required for all flows
    const tokenParams: any = {
      user: {
        client_user_id: user.$id
      },
      client_name: `${user.firstName} ${user.lastName}`,
      products: ['auth', 'transactions'] as Products[],
      language: 'en',
      country_codes: ['US'] as CountryCode[],
    };

    // For reconnection, we need to get the existing bank's item ID
    if (isReconnect) {
      // Get existing banks for this user
      const existingBanks = await getBanks({ userId: user.$id });
      
      if (existingBanks && existingBanks.length > 0) {
        // Use the first bank account's item ID for reconnection
        // In a more complex app, you might want the user to select which bank to reconnect
        tokenParams.access_token = existingBanks[0].accessToken;
      }
    }

    console.log("Creating link token with params:", {
      ...tokenParams,
      access_token: tokenParams.access_token ? "HIDDEN" : undefined
    });

    const response = await plaidClient.linkTokenCreate(tokenParams);
    console.log("Link token created successfully");

    return parseStringify({ linkToken: response.data.link_token });
  } catch (error: any) {
    console.error("Error creating link token:", error);
    // Log detailed error information if available
    if (error.response && error.response.data) {
      console.error("Plaid API Error Details:", {
        status: error.response.status,
        data: error.response.data
      });
    }
    return null;
  }
}

export const createBankAccount = async ({
  userId,
  bankId,
  accountId,
  accessToken,
  fundingSourceUrl,
  shareableId,
}: createBankAccountProps) => {
  try {
    const { database } = await createAdminClient();

    const bankAccount = await database.createDocument(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      ID.unique(),
      {
        userId,
        bankId,
        accountId,
        accessToken,
        fundingSourceUrl,
        shareableId,
      }
    )

    return parseStringify(bankAccount);
  } catch (error) {
    console.log(error);
  }
}

export const exchangePublicToken = async ({
  publicToken,
  user,
  isReconnect = false
}: exchangePublicTokenProps & { isReconnect?: boolean }) => {
  try {
    console.log(`Starting public token exchange${isReconnect ? ' (RECONNECT)' : ''}`);
    
    // Exchange public token for access token and item ID
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;
    
    console.log(`Successfully exchanged public token for access token (item ID: ${itemId})`);
    
    // Get account information from Plaid using the access token
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accountData = accountsResponse.data.accounts[0];
    console.log(`Retrieved account information for account: ${accountData.account_id}`);

    // Check if this bank account already exists by checking for a match on itemId
    const existingBanks = await getBanks({ userId: user.$id });
    const existingBank = existingBanks.find((bank: Bank) => bank.bankId === itemId);
    
    if (existingBank) {
      // This is a reconnection - just update the access token
      console.log(`Found existing bank connection (ID: ${existingBank.$id}). Updating access token...`);
      
      const { database } = await createAdminClient();
      
      await database.updateDocument(
        DATABASE_ID!,
        BANK_COLLECTION_ID!,
        existingBank.$id,
        {
          accessToken: accessToken,
        }
      );
      
      console.log("Access token updated successfully. Revalidating paths...");
      
      // Revalidate the path to reflect the changes
      revalidatePath("/");
      revalidatePath("/transaction-history");
      
      return parseStringify({
        publicTokenExchange: "complete",
        reconnected: true
      });
    }
    
    // This is a new connection - continue with normal flow
    console.log("Creating new bank connection...");
    
    // Create a processor token for Dwolla using the access token and account ID
    const request: ProcessorTokenCreateRequest = {
      access_token: accessToken,
      account_id: accountData.account_id,
      processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
    };

    const processorTokenResponse = await plaidClient.processorTokenCreate(request);
    const processorToken = processorTokenResponse.data.processor_token;
    console.log("Created processor token for Dwolla");

    // Create a funding source URL for the account using the Dwolla customer ID, processor token, and bank name
    const fundingSourceUrl = await addFundingSource({
      dwollaCustomerId: user.dwollaCustomerId!,
      processorToken,
      bankName: accountData.name,
    });
    
    // If the funding source URL is not created, throw an error
    if (!fundingSourceUrl) {
      console.error("Failed to create funding source URL");
      throw new Error("Failed to create funding source URL");
    }
    
    console.log("Created funding source URL for Dwolla. Creating bank account in database...");

    // Create a bank account using the user ID, item ID, account ID, access token, funding source URL, and shareableId ID
    await createBankAccount({
      userId: user.$id,
      bankId: itemId,
      accountId: accountData.account_id,
      accessToken,
      fundingSourceUrl,
      shareableId: encryptId(accountData.account_id),
    });

    console.log("Bank account created successfully. Revalidating paths...");
    
    // Revalidate the path to reflect the changes
    revalidatePath("/");
    revalidatePath("/transaction-history");

    // Return a success message
    return parseStringify({
      publicTokenExchange: "complete",
      reconnected: false
    });
  } catch (error: any) {
    console.error("An error occurred while exchanging token:", error);
    
    // Log detailed error information if available
    if (error.response && error.response.data) {
      console.error("API Error Details:", {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    // Re-throw to ensure the error propagates to the UI
    throw error;
  }
}

export const getBanks = async ({ userId }: getBanksProps) => {
  try {
    const { database } = await createAdminClient();

    const banks = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    )

    return parseStringify(banks.documents);
  } catch (error) {
    console.log(error)
  }
}

export const getBank = async ({ documentId }: getBankProps) => {
  try {
    const { database } = await createAdminClient();

    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('$id', [documentId])]
    )

    return parseStringify(bank.documents[0]);
  } catch (error) {
    console.log(error)
  }
}

export const getBankByAccountId = async ({ accountId }: getBankByAccountIdProps) => {
  try {
    const { database } = await createAdminClient();

    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('accountId', [accountId])]
    )

    if(bank.total !== 1) return null;

    return parseStringify(bank.documents[0]);
  } catch (error) {
    console.log(error)
  }
}