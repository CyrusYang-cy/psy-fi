import HeaderBox from "@/components/HeaderBox";
import { Pagination } from "@/components/Pagination";
import TransactionsTable from "@/components/TransactionsTable";
import { getAccount, getAccounts } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { formatAmount } from "@/lib/utils";
import React from "react";
import ConnectBankUI from "@/components/ConnectBankUI";
import ReconnectBankUI from "@/components/ReconnectBankUI";

const TransactionHistory = async ({
  searchParams: { id, page, reconnected },
}: SearchParamProps) => {
  const currentPage = Number(page as string) || 1;
  const loggedIn = await getLoggedInUser();
  const accounts = await getAccounts({
    userId: loggedIn.$id,
  });

  if (!accounts || !accounts.data || accounts.data.length === 0) {
    return <ConnectBankUI user={loggedIn} />;
  }

  const accountsData = accounts?.data;
  const appwriteItemId = (id as string) || accountsData[0]?.appwriteItemId;

  const account = await getAccount({ appwriteItemId });

  // Check if account or transactions are undefined
  const transactions = account?.transactions || [];

  // Check for the PRODUCT_NOT_READY status
  const transactionsNotReady =
    account?.transactionsStatus === "PRODUCT_NOT_READY";

  // Only need to reconnect if transactions are empty AND not in the "not ready" state
  const needsReconnect = transactions.length === 0 && !transactionsNotReady;

  if (needsReconnect) {
    return <ReconnectBankUI user={loggedIn} />;
  }

  const rowsPerPage = 10;
  const totalPages = Math.ceil(transactions.length / rowsPerPage);

  const indexOfLastTransaction = currentPage * rowsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;

  const currentTransactions = transactions.slice(
    indexOfFirstTransaction,
    indexOfLastTransaction
  );

  const showReconnectionSuccess = reconnected === "true";

  return (
    <div className="transactions min-h-screen p-6 bg-gray-900">
      <div className="transactions-header">
        <HeaderBox
          title="Transaction History"
          subtext="See your bank details and transactions."
        />

        {showReconnectionSuccess && (
          <div className="mt-4 p-4 bg-green-900 rounded-md text-green-300 font-medium">
            Bank successfully reconnected! Your transaction history is now
            available.
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="transactions-account">
          <div className="flex flex-col gap-2">
            <h2 className="text-18 font-bold text-white">
              {account?.data?.name || "Account"}
            </h2>
            <p className="text-14 text-blue-300">
              {account?.data?.officialName || ""}
            </p>
            <p className="text-14 font-semibold tracking-[1.1px] text-gray-300">
              {account?.data?.mask ? `●●●● ●●●● ●●●● ${account.data.mask}` : ""}
            </p>
          </div>

          <div className="transactions-account-balance">
            <p className="text-14 text-gray-300">Current balance</p>
            <p className="text-24 text-center font-bold text-white">
              {formatAmount(account?.data?.currentBalance || 0)}
            </p>
          </div>
        </div>

        {transactionsNotReady ? (
          <div className="my-6 p-6 bg-gray-800 rounded-md text-center">
            <h3 className="text-xl font-medium text-blue-300 mb-2">
              Preparing Your Transaction History
            </h3>
            <p className="text-gray-300">{account.transactionsMessage}</p>
            <p className="mt-4 text-sm text-gray-400">
              This usually takes just a few moments. Try refreshing the page.
            </p>
            <a
              href={`/transaction-history?id=${appwriteItemId}`}
              className="mt-4 px-4 py-2 inline-block bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Refresh Now
            </a>
          </div>
        ) : (
          <section className="flex w-full flex-col gap-6">
            <TransactionsTable transactions={currentTransactions} />
            {totalPages > 1 && (
              <div className="my-4 w-full">
                <Pagination totalPages={totalPages} page={currentPage} />
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
