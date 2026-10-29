import { ethers } from "ethers";

/**
 * Handles MetaMask provider detection, injection check, and signer authorization.
 */
export async function connectMetaMaskSigner() {
  if (typeof window.ethereum === "undefined") {
    throw new Error("MetaMask extension not detected in client browser.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);

  if (!accounts || accounts.length === 0) {
    throw new Error("No authorized accounts returned by provider.");
  }

  const signer = await provider.getSigner();
  return { provider, signer, account: accounts[0] };
}

/**
 * Checks if the wallet account is currently connected.
 */
export async function getActiveWalletAccount() {
  if (typeof window.ethereum === "undefined") return null;
  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.listAccounts();
  return accounts.length > 0 ? accounts[0].address : null;
}