import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import VotingAbi from './Voting.json';

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const API_BASE = "http://localhost:5000/api/v1";

function App() {
  // Auth & Identity State (Node.js + MongoDB)
  const [username, setUsername] = useState("voter_01");
  const [password, setPassword] = useState("Password@123");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isEligible, setIsEligible] = useState(false);

  // Blockchain State (Ethereum / Hardhat)
  const [account, setAccount] = useState(null);
  const [owner, setOwner] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [hasVotedOnChain, setHasVotedOnChain] = useState(false);
  const [newCandidateName, setNewCandidateName] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  // Step 1: Login via Node.js / MongoDB
  async function handleLogin(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setStatus("Authenticating against MongoDB backend...");
      
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          identifier: username.trim(), 
          password: password 
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      const accessToken = data.data?.accessToken || data.accessToken || data.token;
      const userData = data.data?.user || data.user || { username, fullName: username };

      setToken(accessToken);
      setUser(userData);
      setStatus(`Authenticated as ${userData.fullName || userData.username}`);
      
      // Step 2: Verify Voter Eligibility Off-Chain
      verifyEligibility(userData, accessToken);
    } catch (err) {
      console.error(err);
      setStatus(`Login Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Eligibility Check via Node.js
  function verifyEligibility(userData, authToken) {
    // If user holds VOTER, ADMIN, or CANDIDATE role and is active
    const roles = userData.roles || ['VOTER'];
    const isVoter = roles.includes('VOTER') || roles.includes('ADMIN') || roles.includes('CANDIDATE');

    if (isVoter) {
      setIsEligible(true);
      setStatus("Voter eligibility verified in MongoDB. Please connect your Web3 wallet to access the ballot.");
    } else {
      setIsEligible(false);
      setStatus("Access denied: You do not possess voter clearance in the system roster.");
    }
  }

  function handleLogout() {
    setUser(null);
    setToken(null);
    setIsEligible(false);
    setAccount(null);
    setStatus("Logged out.");
  }

  // Step 3: Wallet Connection & Smart Contract Loading
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
      setStatus("Wallet connected. Ballot unlocked!");

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
        setHasVotedOnChain(voted);
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
      setStatus("Could not load candidate list from Hardhat node.");
    }
  }

  // Step 4: Cast Vote (On-Chain Transaction + Off-Chain Audit Log)
  async function castVote(candidateId) {
    if (!account) return alert("Connect wallet first!");
    if (hasVotedOnChain) return alert("You have already voted!");

    try {
      setLoading(true);
      setStatus("Submitting your vote to Ethereum smart contract...");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingAbi.abi, signer);

      const tx = await contract.vote(candidateId);
      setStatus(`Waiting for on-chain block confirmation (Tx: ${tx.hash.slice(0, 10)}...)...`);
      await tx.wait();

      setHasVotedOnChain(true);
      setStatus(`Ballot confirmed on blockchain! Vote recorded for Candidate #${candidateId}.`);

      // Refresh contract state
      await loadContractData(signer, account);
    } catch (err) {
      console.error(err);
      setStatus("Transaction rejected or failed on-chain.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCandidate(e) {
    e.preventDefault();
    if (!newCandidateName.trim()) return;

    try {
      setLoading(true);
      setStatus("Registering new candidate on smart contract...");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingAbi.abi, signer);

      const tx = await contract.addCandidate(newCandidateName.trim());
      await tx.wait();

      setStatus(`Candidate "${newCandidateName}" added to contract!`);
      setNewCandidateName("");
      await loadContractData(signer, account);
    } catch (err) {
      console.error(err);
      setStatus("Failed to add candidate. Only contract owner can perform this.");
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
          setHasVotedOnChain(false);
        }
      });
    }
  }, []);

  const isAdmin = account && owner && account.toLowerCase() === owner.toLowerCase();

  return (
    <div style={{ fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif', maxWidth: '760px', margin: '40px auto', padding: '28px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
      {/* Header */}
      <header style={{ borderBottom: '2px solid #f1f3f5', paddingBottom: '16px', marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 8px 0', color: '#111827', fontSize: '24px' }}>🏛️ Hybrid E-Voting System</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
          Gated Web3 Architecture: Node/MongoDB Identity Gate &rarr; Ethereum Smart Contract Ledger
        </p>
      </header>

      {/* Pipeline Progress Indicator */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', fontSize: '13px' }}>
        <div style={{ flex: 1, padding: '10px', borderRadius: '6px', textAlign: 'center', background: user ? '#ecfdf5' : '#f3f4f6', color: user ? '#065f46' : '#6b7280', fontWeight: '600' }}>
          1. Node/DB Auth {user && "✓"}
        </div>
        <div style={{ flex: 1, padding: '10px', borderRadius: '6px', textAlign: 'center', background: isEligible ? '#ecfdf5' : '#f3f4f6', color: isEligible ? '#065f46' : '#6b7280', fontWeight: '600' }}>
          2. Eligibility {isEligible && "✓"}
        </div>
        <div style={{ flex: 1, padding: '10px', borderRadius: '6px', textAlign: 'center', background: account ? '#ecfdf5' : '#f3f4f6', color: account ? '#065f46' : '#6b7280', fontWeight: '600' }}>
          3. Web3 Wallet {account && "✓"}
        </div>
        <div style={{ flex: 1, padding: '10px', borderRadius: '6px', textAlign: 'center', background: hasVotedOnChain ? '#ecfdf5' : '#f3f4f6', color: hasVotedOnChain ? '#065f46' : '#6b7280', fontWeight: '600' }}>
          4. Ballot Recorded {hasVotedOnChain && "✓"}
        </div>
      </div>

      {/* Screen 1: Node.js / MongoDB Authentication */}
      {!user ? (
        <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', margin: '0 0 14px 0', color: '#1e293b' }}>🔐 Step 1: Off-Chain Voter Authentication</h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            Verify your student identity against the central election database before accessing the ballot.
          </p>
          <form onSubmit={handleLogin} style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#334155' }}>Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                placeholder="voter_01"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#334155' }}>Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                placeholder="Password@123"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', marginTop: '6px' }}
            >
              {loading ? "Authenticating..." : "Authenticate & Verify Eligibility"}
            </button>
          </form>
        </div>
      ) : (
        /* Screen 2 & 3: Verified Voter Dashboard */
        <div>
          {/* Authenticated Voter Bar */}
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Off-Chain Voter Profile (MongoDB)</span>
              <strong style={{ fontSize: '15px', color: '#0f172a' }}>{user.fullName || user.username}</strong>
              <span style={{ marginLeft: '8px', fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '999px', fontWeight: '600' }}>
                ELIGIBLE VOTER
              </span>
            </div>
            <button 
              onClick={handleLogout}
              style={{ background: 'transparent', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#64748b' }}
            >
              Log Out
            </button>
          </div>

          {/* Web3 Wallet Gate */}
          <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e9ecef' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Connected Ethereum Signer</span>
              <span style={{ fontWeight: '600', color: account ? '#16a34a' : '#dc2626', fontSize: '15px' }}>
                {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'MetaMask Not Linked'}
              </span>
              {isAdmin && <span style={{ marginLeft: '8px', fontSize: '11px', background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>CONTRACT OWNER</span>}
              {hasVotedOnChain && <span style={{ marginLeft: '8px', fontSize: '11px', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>BALLOT CAST</span>}
            </div>

            {!account && (
              <button 
                onClick={connectWallet}
                disabled={loading}
                style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
              >
                {loading ? "Connecting..." : "Connect MetaMask"}
              </button>
            )}
          </div>

          {/* Contract Owner Panel */}
          {isAdmin && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#166534', fontSize: '15px' }}>👑 Admin Action: Register Candidate on Blockchain</h3>
              <form onSubmit={handleAddCandidate} style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder="Candidate Name"
                  value={newCandidateName}
                  onChange={(e) => setNewCandidateName(e.target.value)}
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  disabled={loading}
                />
                <button 
                  type="submit"
                  disabled={loading || !newCandidateName.trim()}
                  style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Add
                </button>
              </form>
            </div>
          )}

          {/* Official Blockchain Ballot */}
          <h2 style={{ fontSize: '18px', marginBottom: '14px', color: '#1e293b' }}>🗳️ Official On-Chain Ballot</h2>
          
          <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
            {candidates.length > 0 ? (
              candidates.map((c) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#0f172a' }}>{c.name}</h3>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Ballot #{c.id} | Total Audited Votes: <strong>{c.voteCount}</strong></span>
                  </div>
                  <button 
                    onClick={() => castVote(c.id)}
                    disabled={loading || hasVotedOnChain || !account}
                    style={{ 
                      background: hasVotedOnChain ? '#94a3b8' : '#16a34a', 
                      color: '#fff', 
                      border: 'none', 
                      padding: '10px 20px', 
                      borderRadius: '6px', 
                      fontWeight: '600', 
                      cursor: (hasVotedOnChain || !account || loading) ? 'not-allowed' : 'pointer',
                      opacity: (hasVotedOnChain || !account) ? 0.6 : 1
                    }}
                  >
                    {hasVotedOnChain ? "Voted" : "Cast Vote"}
                  </button>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '28px', color: '#64748b', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                {account ? "No candidates found on contract." : "Connect your MetaMask wallet above to reveal candidate ballot."}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live System Feedback */}
      {status && (
        <div style={{ padding: '12px 16px', background: '#eff6ff', borderLeft: '4px solid #3b82f6', borderRadius: '4px', fontSize: '13px', color: '#1e40af' }}>
          {status}
        </div>
      )}
    </div>
  );
}

export default App;