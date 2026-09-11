import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import VotingAbi from './Voting.json';

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

function App() {
  const [account, setAccount] = useState(null);
  const [owner, setOwner] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [newCandidateName, setNewCandidateName] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function connectWallet() {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      setStatus("Wallet connected successfully!");

      await loadContractData(signer, address);
    } catch (err) {
      console.error(err);
      setStatus("Failed to connect wallet.");
    } finally {
      setLoading(false);
    }
  }

  async function loadContractData(signerOrProvider, userAddress) {
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingAbi.abi, signerOrProvider);

      const contractOwner = await contract.owner();
      setOwner(contractOwner);

      if (userAddress) {
        const voted = await contract.hasVoted(userAddress);
        setHasVoted(voted);
      }

      const countBigInt = await contract.candidatesCount();
      const count = Number(countBigInt);
      const items = [];

      for (let i = 1; i <= count; i++) {
        const candidate = await contract.candidates(i);
        items.push({
          id: Number(candidate.id),
          name: candidate.name,
          voteCount: Number(candidate.voteCount)
        });
      }
      setCandidates(items);
    } catch (err) {
      console.error("Error reading contract:", err);
      setStatus("Could not load candidate list. Check your contract address and network.");
    }
  }

  async function castVote(candidateId) {
    if (!account) return alert("Connect wallet first!");
    if (hasVoted) return alert("You have already voted!");

    try {
      setLoading(true);
      setStatus("Submitting your vote on-chain...");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingAbi.abi, signer);

      const tx = await contract.vote(candidateId);
      await tx.wait();

      setStatus(`Vote cast successfully for Candidate #${candidateId}!`);
      setHasVoted(true);
      await loadContractData(signer, account);
    } catch (err) {
      console.error(err);
      setStatus("Transaction failed or rejected.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCandidate(e) {
    e.preventDefault();
    if (!newCandidateName.trim()) return;

    try {
      setLoading(true);
      setStatus("Adding new candidate to blockchain...");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingAbi.abi, signer);

      const tx = await contract.addCandidate(newCandidateName.trim());
      await tx.wait();

      setStatus(`Candidate "${newCandidateName}" added successfully!`);
      setNewCandidateName("");
      await loadContractData(signer, account);
    } catch (err) {
      console.error(err);
      setStatus("Failed to add candidate. Only the contract owner can do this.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const provider = new ethers.BrowserProvider(window.ethereum);
          loadContractData(provider, accounts[0]);
        } else {
          setAccount(null);
          setOwner(null);
          setHasVoted(false);
        }
      });
    }
  }, []);

  const isAdmin = account && owner && account.toLowerCase() === owner.toLowerCase();

  return (
    <div style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', maxWidth: '720px', margin: '40px auto', padding: '24px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
      <header style={{ borderBottom: '2px solid #f1f3f5', paddingBottom: '16px', marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 8px 0', color: '#1a1a1a', fontSize: '24px' }}>Decentralized E-Voting Portal</h1>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Secure, transparent voting powered by Ethereum Smart Contracts.</p>
      </header>

      <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '13px', color: '#666', display: 'block' }}>Connected Wallet</span>
          <span style={{ fontWeight: '600', color: account ? '#28a745' : '#dc3545', fontSize: '15px' }}>
            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not Connected'}
          </span>
          {isAdmin && <span style={{ marginLeft: '8px', fontSize: '11px', background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>ADMIN</span>}
          {hasVoted && <span style={{ marginLeft: '8px', fontSize: '11px', background: '#ffeeba', color: '#856404', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>VOTED</span>}
        </div>

        {!account && (
          <button 
            onClick={connectWallet}
            disabled={loading}
            style={{ background: '#0070f3', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
          >
            {loading ? "Connecting..." : "Connect MetaMask"}
          </button>
        )}
      </div>

      {isAdmin && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#166534', fontSize: '16px' }}>👑 Admin Panel: Register New Candidate</h3>
          <form onSubmit={handleAddCandidate} style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="Candidate Name (e.g. Candidate Gamma)"
              value={newCandidateName}
              onChange={(e) => setNewCandidateName(e.target.value)}
              style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              disabled={loading}
            />
            <button 
              type="submit"
              disabled={loading || !newCandidateName.trim()}
              style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
            >
              Add Candidate
            </button>
          </form>
        </div>
      )}

      <h2 style={{ fontSize: '18px', marginBottom: '14px', color: '#333' }}>Official Candidates</h2>
      
      <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
        {candidates.length > 0 ? (
          candidates.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid #e9ecef', borderRadius: '8px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#212529' }}>{c.name}</h3>
                <span style={{ fontSize: '13px', color: '#6c757d' }}>Candidate ID: #{c.id} | Total Votes: <strong>{c.voteCount}</strong></span>
              </div>
              <button 
                onClick={() => castVote(c.id)}
                disabled={loading || hasVoted || !account}
                style={{ 
                  background: hasVoted ? '#6c757d' : '#28a745', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '8px 18px', 
                  borderRadius: '6px', 
                  fontWeight: '600', 
                  cursor: (hasVoted || !account || loading) ? 'not-allowed' : 'pointer',
                  opacity: (hasVoted || !account) ? 0.6 : 1
                }}
              >
                {hasVoted ? "Voted" : "Vote"}
              </button>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#888', border: '1px dashed #ccc', borderRadius: '8px' }}>
            {account ? "No candidates found on contract." : "Connect wallet to view ballot."}
          </div>
        )}
      </div>

      {status && (
        <div style={{ padding: '12px 16px', background: '#eef2ff', borderLeft: '4px solid #0070f3', borderRadius: '4px', fontSize: '14px', color: '#333' }}>
          {status}
        </div>
      )}
    </div>
  );
}

export default App;