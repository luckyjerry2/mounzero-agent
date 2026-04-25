"use client";

import { useEffect, useState } from "react";

type AgentResult = {
  decision: "BLOCKED" | "APPROVED" | string;
  reason: string;
  suggested_action: string;
  category?: string;
  risk_level?: "HIGH" | "MEDIUM" | "LOW" | string;
  confidence?: number;
};

type HistoryItem = {
  decision: string;
  category?: string;
  risk_level?: string;
  timestamp: number;
};

type EthereumProvider = {
  request: <T = unknown>(args: {
    method: string;
    params?: unknown[];
  }) => Promise<T>;
  on?: (event: "accountsChanged", handler: (accounts: string[]) => void) => void;
  removeListener?: (
    event: "accountsChanged",
    handler: (accounts: string[]) => void
  ) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const formatCategory = (cat: string) => {
  const map: Record<string, string> = {
    emotional_spending: "Emotional Spending",
    emotional_eating: "Emotional Eating",
    essential_purchase: "Essential Purchase",
    education: "Education",
    health: "Health",
    bills: "Bills",
    transportation: "Transportation",
    lifestyle_spending: "Lifestyle Spending",
    other: "Other",
  };

  return map[cat] || cat;
};

const shortenAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [walletAddress, setWalletAddress] = useState("");
  const [paymentStep, setPaymentStep] = useState<
    "idle" | "required" | "paid"
  >("idle");

  const estimatedCost = 30;
  const monthlyBudgetLeft = 120;
  const fakeTxHash =
    "0x9f3a7c2b8e4d91aa73c0b2f8d6e4a11c90b8f3e2a7c61d9b0e5f8c2a44d12abc";

  const blockedCount = history.filter(
    (h) => h.decision === "BLOCKED"
  ).length;

  const savedMoney = blockedCount * 12;

  const connectWallet = async () => {
    try {
      const ethereum = window.ethereum;

      if (!ethereum) {
        alert("MetaMask is not installed.");
        return;
      }

      const accounts = await ethereum.request<string[]>({
        method: "eth_requestAccounts",
      });

      setWalletAddress(accounts[0]);
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };

  const disconnectWallet = async () => {
    try {
      await window.ethereum?.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch (error) {
      console.error("Wallet permission revoke failed:", error);
    } finally {
      setWalletAddress("");
      setPaymentStep("idle");
    }
  };

  useEffect(() => {
    const ethereum = window.ethereum;

    if (!ethereum?.on) {
      return;
    }

    const handleAccountsChanged = (accounts: string[]) => {
      setWalletAddress(accounts[0] || "");
      setPaymentStep("idle");
    };

    ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, []);

  const handleSubmit = async () => {
    setPaymentStep("idle");

    const res = await fetch("/api/agent", {
      method: "POST",
      body: JSON.stringify({ input }),
    });

    const data = await res.json();

    try {
      const parsed = JSON.parse(data.result);
      setResult(parsed);

      setHistory((prev) => [
        ...prev,
        {
          decision: parsed.decision,
          category: parsed.category,
          risk_level: parsed.risk_level,
          timestamp: Date.now(),
        },
      ]);
    } catch {
      console.error("JSON parse 실패:", data.result);
      setResult(null);
    }
  };

  return (
    <div className="p-10 max-w-xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">💊 MounZero Agent</h1>

          <p className="text-gray-600 mb-4">
            AI that blocks emotional spending in real time
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            className="bg-blue-600 text-white px-3 py-2 rounded text-sm shadow hover:bg-blue-700"
            onClick={connectWallet}
          >
            {walletAddress ? shortenAddress(walletAddress) : "Connect Wallet"}
          </button>

          {walletAddress && (
            <button
              className="border border-gray-300 px-3 py-2 rounded text-sm hover:bg-gray-100"
              onClick={disconnectWallet}
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {walletAddress && (
        <div className="mb-4 text-sm bg-blue-50 p-3 rounded">
          <p>🔗 Wallet connected: {shortenAddress(walletAddress)}</p>
          <p>🌐 Network: Base</p>
          <p>💵 Payment token: USDC</p>
        </div>
      )}

      <textarea
        className="w-full border p-3 mb-4"
        placeholder="Describe your spending urge..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button
        className="bg-black text-white px-5 py-2 hover:opacity-80"
        onClick={handleSubmit}
      >
        Analyze
      </button>

      {result && (
        <div
          className={`mt-6 p-5 rounded-lg shadow ${
            result.decision === "BLOCKED" ? "bg-red-100" : "bg-green-100"
          }`}
        >
          <h2 className="text-xl font-bold mb-2">
            {result.decision === "BLOCKED"
              ? "🚫 BLOCKED (Impulse)"
              : "✅ APPROVED"}
          </h2>

          <p className="mt-2">{result.reason}</p>

          {(result.category || result.risk_level || result.confidence) && (
            <div className="mt-3 text-sm text-gray-700 bg-white/50 p-3 rounded">
              {result.category && (
                <p>🧠 Category: {formatCategory(result.category)}</p>
              )}

              {result.risk_level && (
                <p>
                  ⚠️ Risk Level:{" "}
                  <span
                    className={`font-semibold ${
                      result.risk_level === "HIGH"
                        ? "text-red-600"
                        : result.risk_level === "MEDIUM"
                        ? "text-yellow-600"
                        : "text-green-600"
                    }`}
                  >
                    {result.risk_level}
                  </span>
                </p>
              )}

              {result.confidence && (
                <p>📊 Confidence: {Math.round(result.confidence * 100)}%</p>
              )}
            </div>
          )}

          {result.decision === "BLOCKED" && (
            <>
              <p className="mt-2 text-sm text-gray-600">
                Impulse spending detected 🚨
              </p>

              <p className="mt-2 text-sm text-gray-700">
                🔁 You avoided a negative spending pattern
              </p>
            </>
          )}

          <p className="mt-3 font-semibold">👉 {result.suggested_action}</p>

          {result.decision === "BLOCKED" && (
            <p className="mt-3 font-bold text-red-600">
              💸 You just saved $12
            </p>
          )}

          {result.decision !== "BLOCKED" && (
            <div className="mt-4 text-sm">
              <p>💰 Estimated cost: ${estimatedCost}</p>
              <p>💳 Monthly budget left: ${monthlyBudgetLeft}</p>
            </div>
          )}

          {result.decision !== "BLOCKED" && (
            <>
              {paymentStep === "idle" && (
                <button
                  className="mt-4 bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
                  onClick={() => setPaymentStep("required")}
                >
                  Pay with AI Agent
                </button>
              )}

              {paymentStep === "required" && (
                <div className="mt-4 bg-white/50 p-3 rounded">
                  <p className="text-yellow-700 font-semibold">
                    ⚠️ 402 Payment Required (x402)
                  </p>
                  <p className="text-sm mt-1">🌐 Network: Base</p>
                  <p className="text-sm">💵 Token: USDC</p>
                  <p className="text-sm">👛 Wallet: {walletAddress ? shortenAddress(walletAddress) : "Not connected"}</p>

                  <button
                    className="mt-3 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                    onClick={() => setPaymentStep("paid")}
                  >
                    Simulate x402 Payment
                  </button>
                </div>
              )}

              {paymentStep === "paid" && (
                <div className="mt-4 bg-white/50 p-3 rounded">
                  <p className="font-bold text-green-700">
                    ✅ Paid with x402 on Base
                  </p>
                  <p className="text-sm mt-1 break-all">
                    🔗 Tx hash: {fakeTxHash}
                  </p>
                </div>
              )}
            </>
          )}

          {history.length > 0 && (
            <div className="mt-5 text-sm bg-white/50 p-3 rounded">
              <p className="font-semibold mb-1">🧠 This week:</p>
              <p>- {blockedCount} impulse attempts blocked</p>
              <p>- ${savedMoney} saved</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
