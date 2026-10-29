import { ethers } from "ethers";
import VotingArtifact from "../Voting.json";

export const VOTING_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

/**
 * Creates contract instance bound with active signer or read provider.
 */
export function getVotingContract(signerOrProvider) {
  return new ethers.Contract(
    VOTING_CONTRACT_ADDRESS,
    VotingArtifact.abi || VotingArtifact,
    signerOrProvider
  );
}

/**
 * Event listeners for account and network changes in MetaMask.
 */
export function registerWalletListeners(onAccountChange, onNetworkChange) {
  if (!window.ethereum) return () => {};

  const handleAccounts = (accounts) => {
    onAccountChange(accounts.length > 0 ? accounts[0] : null);
  };

  const handleChain = () => {
    if (onNetworkChange) onNetworkChange();
  };

  window.ethereum.on("accountsChanged", handleAccounts);
  window.ethereum.on("chainChanged", handleChain);

  return () => {
    window.ethereum.removeListener("accountsChanged", handleAccounts);
    window.ethereum.removeListener("chainChanged", handleChain);
  };
}