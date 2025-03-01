"use client";

import React from "react";
import PlaidLink from "./PlaidLink";
import HeaderBox from "./HeaderBox";

const ReconnectBankUI = ({ user }: { user: any }) => {
  return (
    <div className="transactions">
      <div className="transactions-header">
        <HeaderBox
          title="Transaction History"
          subtext="Additional permissions needed for your connected banks"
        />
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Transaction Access Required
        </h3>
        <p className="text-gray-600 mb-4">
          We've updated our system to provide you with transaction history, but
          your currently connected banks need additional permissions. Please
          click the button below and reconnect to the{" "}
          <strong>same bank account</strong> you already have connected to
          enable transaction history.
        </p>
        <div className="flex flex-col items-center gap-4">
          <div className="flex justify-center mt-2">
            <PlaidLink user={user} variant="primary" isReconnect={true} />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Note: This is a one-time process. After reconnecting, you'll be able
            to see your transaction history automatically.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReconnectBankUI;
