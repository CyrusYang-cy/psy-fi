"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  PlaidLinkOnSuccess,
  PlaidLinkOptions,
  usePlaidLink,
} from "react-plaid-link";
import { useRouter, usePathname } from "next/navigation";
import {
  createLinkToken,
  exchangePublicToken,
} from "@/lib/actions/user.actions";
import Image from "next/image";

const PlaidLink = ({
  user,
  variant,
  isReconnect = false,
}: PlaidLinkProps & { isReconnect?: boolean }) => {
  const router = useRouter();
  const pathname = usePathname();
  const isTransactionPage = pathname.includes("transaction-history");

  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getLinkToken = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await createLinkToken(user, isReconnect);

        if (!data || !data.linkToken) {
          console.error("Failed to create link token");
          setError("Could not connect to bank. Please try again later.");
          return;
        }

        setToken(data.linkToken);
      } catch (err) {
        console.error("Error getting link token:", err);
        setError("Could not connect to bank. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    getLinkToken();
  }, [user, isReconnect]);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (public_token: string) => {
      try {
        setIsLoading(true);

        // Pass isReconnect flag to server action
        await exchangePublicToken({
          publicToken: public_token,
          user,
          isReconnect,
        });

        // If we're on the transaction history page or this is a reconnect,
        // redirect back to transaction history
        if (isTransactionPage || isReconnect) {
          // Force a page refresh to ensure new data is loaded
          // Using href directly ensures a full page reload which is needed
          // to properly fetch fresh data with the new token
          window.location.href = "/transaction-history?reconnected=true";
        } else {
          router.push("/");
        }
      } catch (error) {
        console.error("Error connecting bank:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [user, router, isTransactionPage, isReconnect]
  );

  const config: PlaidLinkOptions = {
    token,
    onSuccess,
  };

  const { open, ready } = usePlaidLink(config);

  const buttonText = isReconnect ? "Reconnect Bank" : "Connect Bank";

  return (
    <>
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {variant === "primary" ? (
        <Button
          onClick={() => open()}
          disabled={!ready || isLoading}
          className="plaidlink-primary"
        >
          {isLoading ? "Connecting..." : buttonText}
        </Button>
      ) : variant === "ghost" ? (
        <Button
          onClick={() => open()}
          variant="ghost"
          disabled={isLoading}
          className="plaidlink-ghost"
        >
          <Image
            src="/icons/connect-bank.svg"
            alt="connect bank"
            width={24}
            height={24}
          />
          <p className="hiddenl text-[16px] font-semibold text-black-2 xl:block">
            {isLoading ? "Connecting..." : buttonText}
          </p>
        </Button>
      ) : (
        <Button
          onClick={() => open()}
          disabled={isLoading}
          className="plaidlink-default"
        >
          <Image
            src="/icons/connect-bank.svg"
            alt="connect bank"
            width={24}
            height={24}
          />
          <p className="text-[16px] font-semibold text-black-2">
            {isLoading ? "Connecting..." : buttonText}
          </p>
        </Button>
      )}
    </>
  );
};

export default PlaidLink;
