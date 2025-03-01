"use client";

import React from "react";
import PlaidLink from "./PlaidLink";
import HeaderBox from "./HeaderBox";

const ConnectBankUI = ({ user }: { user: any }) => {
  return (
    <div className="transactions">
      <div className="transactions-header">
        <HeaderBox
          title="Transaction History"
          subtext="No bank accounts found. Please connect a bank account."
        />
      </div>
      <div className="flex justify-center mt-8">
        <PlaidLink user={user} variant="primary" />
      </div>
    </div>
  );
};

export default ConnectBankUI;
