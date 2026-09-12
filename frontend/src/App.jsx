import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import VotingAbi from './Voting.json';

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const API_BASE = "http://localhost:5000/api/v1";

export default function App() {
  // Auth & Off-chain State
  const [username, setUsername] = useState("voter_01");
  const [password, setPassword] = useState("Password@123");
  const [user, setUser] = useState(null);
  const [isEligible, setIsEligible] = useState(false);

  // Blockchain State
  const [account, setAccount] = useState(null);
  const [owner, setOwner] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [hasVotedOnChain, setHasVotedOnChain] = useState(false);
  const [newCandidateName, setNewCandidateName] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("SYSTEM READY // AWAITING CREDENTIAL VERIFICATION");

  // Step 1: Login via Node.js API
  async function handleLogin(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setStatus("AUTHENTICATING AGAINST CENTRAL IDENTITY REGISTRY...");

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
        throw new Error(data.message || "Authentication rejected");
      }

      const userData = data.data?.user || data.user || { username, fullName: username };
      setUser(userData);
      setIsEligible(true);
      setStatus("IDENTITY CONFIRMED // BIOMETRIC & CITIZEN ROSTER CLEARANCE GRANTED");
    } catch (err) {
      console.error(err);
      setStatus(`SECURITY ALERT: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setUser(null);
    setIsEligible(false);
    setAccount(null);
    setStatus("SESSION TERMINATED // REVERTED TO GUEST PERIMETER");
  }

  // Step 2 & 3: Connect Web3 Wallet
  async function connectWallet() {
    if (!window.ethereum) {
      alert("Ethereum Provider Not Detected! Install MetaMask.");
      return;
    }
    try {
      setLoading(true);
      setStatus("REQUESTING SIGNER HANDSHAKE FROM WEB3 RUNTIME...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      setStatus(`ENCRYPTED TUNNEL ESTABLISHED // NODE: ${address.slice(0, 8)}...`);

      await loadContractData(signer, address);
    } catch (err) {
      console.error(err);
      setStatus("CONNECTION ABORTED: Signer handshake rejected.");
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
      console.error("Contract Query Error:", err);
      setStatus("LEDGER DESYNC: Unable to query candidate data from local RPC.");
    }
  }

  // Step 4: Cast Vote to Hardhat Contract
  async function castVote(candidateId) {
    if (!account) return alert("Signer not linked!");
    if (hasVotedOnChain) return alert("Ballot record already committed to ledger!");

    try {
      setLoading(true);
      setStatus(`BROADCASTING TX // SUBMITTING BALLOT #${candidateId} TO CONSENSUS ENGINE...`);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingAbi.abi, signer);

      const tx = await contract.vote(candidateId);
      setStatus(`TX HASH DISPATCHED: ${tx.hash.slice(0, 16)}... AWAITING BLOCK FINALITY...`);
      await tx.wait();

      setHasVotedOnChain(true);
      setStatus(`TRANSACTION MINED // BALLOT IMMUTABLY SEALED FOR CANDIDATE #${candidateId}`);
      await loadContractData(signer, account);
    } catch (err) {
      console.error(err);
      setStatus("TRANSACTION REVERTED: Gas exhausted or double-spend detected.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCandidate(e) {
    e.preventDefault();
    if (!newCandidateName.trim()) return;

    try {
      setLoading(true);
      setStatus("PROPOSING NEW BALLOT ENTRY ON-CHAIN...");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingAbi.abi, signer);

      const tx = await contract.addCandidate(newCandidateName.trim());
      await tx.wait();

      setStatus(`LEDGER UPDATED: Candidate "${newCandidateName}" registered.`);
      setNewCandidateName("");
      await loadContractData(signer, account);
    } catch (err) {
      console.error(err);
      setStatus("ACCESS REFUSED: Only the contract genesis administrator can register candidates.");
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
  const totalVotes = candidates.reduce((acc, c) => acc + c.voteCount, 0);

  return (
    <div style={styles.appContainer}>
      {/* Background Neon Grid Ambience */}
      <div style={styles.glowOrb1} />
      <div style={styles.glowOrb2} />

      <main style={styles.mainCard}>
        {/* Futuristic Terminal Header */}
        <header style={styles.header}>
          <div style={styles.logoRow}>
            <span style={styles.badgeCyber}>ETHEREUM CORE v4.1 // REPUTATION MATRIX</span>
            <span style={styles.liveIndicator}>
              <span style={styles.pulseDot} />
              RPC ONLINE (8545)
            </span>
          </div>
          <h1 style={styles.title}>
            <span style={styles.gradientText}>NEXUS</span> E-VOTING PROTOCOL
          </h1>
          <p style={styles.subtitle}>
            Zero-Trust Hybrid Gated Ballot &bull; Off-Chain KYC &bull; On-Chain Immutable Consensus
          </p>
        </header>

        {/* 4-Step Futuristic Pipeline HUD */}
        <nav style={styles.hudGrid}>
          {[
            { num: "01", label: "NODE KYC", active: !!user, done: !!user },
            { num: "02", label: "CLEARANCE", active: isEligible, done: isEligible },
            { num: "03", label: "WEB3 SIGNER", active: !!account, done: !!account },
            { num: "04", label: "ON-CHAIN SEAL", active: hasVotedOnChain, done: hasVotedOnChain }
          ].map((step, idx) => (
            <div 
              key={idx} 
              style={{
                ...styles.hudStep,
                borderBottom: step.done ? '2px solid #00f2fe' : '2px solid rgba(255,255,255,0.08)',
                background: step.done ? 'rgba(0, 242, 254, 0.04)' : 'rgba(255,255,255,0.02)'
              }}
            >
              <span style={{ ...styles.stepNum, color: step.done ? '#00f2fe' : '#64748b' }}>
                {step.done ? "✓" : step.num}
              </span>
              <span style={{ ...styles.stepLabel, color: step.done ? '#f1f5f9' : '#64748b' }}>
                {step.label}
              </span>
            </div>
          ))}
        </nav>

        {/* Phase 1: Holographic Login Portal */}
        {!user ? (
          <section style={styles.cyberSection}>
            <div style={styles.sectionHeader}>
              <span style={styles.tag}>PHASE 01 // IDENTITY ACCESS</span>
              <h2 style={styles.sectionTitle}>Central Registry Verification</h2>
              <p style={styles.sectionDesc}>Enter your off-chain student credentials to authorize your voting allocation.</p>
            </div>

            <form onSubmit={handleLogin} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>VOTER IDENTIFIER</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={styles.cyberInput}
                  placeholder="voter_01"
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>PASSPHRASE</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.cyberInput}
                  placeholder="••••••••••••"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={styles.neonButton}
              >
                {loading ? "INITIALIZING DECRYPT..." : "AUTHENTICATE PROFILE ❯"}
              </button>
            </form>
          </section>
        ) : (
          /* Phase 2 & 3: Activated Cyber Voting Panel */
          <div>
            {/* Identity Bar */}
            <div style={styles.profileBar}>
              <div>
                <span style={styles.metaKey}>OFF-CHAIN IDENTITY RECORD</span>
                <div style={styles.profileNameRow}>
                  <strong style={styles.profileName}>{user.fullName || user.username}</strong>
                  <span style={styles.statusPill}>VERIFIED ROSTER</span>
                </div>
              </div>
              <button onClick={handleLogout} style={styles.logoutBtn}>
                REVOKE SESSION
              </button>
            </div>

            {/* Wallet Signer Hub */}
            <div style={styles.signerHub}>
              <div>
                <span style={styles.metaKey}>ETHEREUM SIGNER MATRIX</span>
                <div style={styles.accountText}>
                  {account ? (
                    <span style={{ color: '#00f2fe' }}>{account.slice(0, 10)}...{account.slice(-8)}</span>
                  ) : (
                    <span style={{ color: '#ef4444' }}>AWAITING RUNTIME ATTACHMENT</span>
                  )}
                  {isAdmin && <span style={styles.adminPill}>ADMIN ROOT</span>}
                  {hasVotedOnChain && <span style={styles.votedPill}>RECORD SEALED</span>}
                </div>
              </div>

              {!account && (
                <button 
                  onClick={connectWallet} 
                  disabled={loading}
                  style={styles.walletBtn}
                >
                  {loading ? "CONNECTING..." : "CONNECT METAMASK ⚡"}
                </button>
              )}
            </div>

            {/* Admin Controls */}
            {isAdmin && (
              <section style={styles.adminCard}>
                <span style={styles.adminTag}>GOVERNANCE CONTROLLER</span>
                <h3 style={styles.adminTitle}>Append Candidate to Smart Contract</h3>
                <form onSubmit={handleAddCandidate} style={styles.adminForm}>
                  <input 
                    type="text" 
                    placeholder="Enter Candidate Alias"
                    value={newCandidateName}
                    onChange={(e) => setNewCandidateName(e.target.value)}
                    style={styles.adminInput}
                    disabled={loading}
                  />
                  <button type="submit" disabled={loading || !newCandidateName.trim()} style={styles.adminSubmitBtn}>
                    SUBMIT TO LEDGER
                  </button>
                </form>
              </section>
            )}

            {/* Candidate Ballot */}
            <section style={{ marginTop: '28px' }}>
              <div style={styles.ballotHeaderRow}>
                <h2 style={styles.ballotTitle}>LIVE ELECTION BALLOT</h2>
                <span style={styles.totalBadge}>LEDGER VOTES CAST: {totalVotes}</span>
              </div>

              <div style={styles.candidateGrid}>
                {candidates.length > 0 ? (
                  candidates.map((c) => {
                    const pct = totalVotes > 0 ? ((c.voteCount / totalVotes) * 100).toFixed(1) : 0;
                    return (
                      <div key={c.id} style={styles.candidateCard}>
                        <div style={styles.candidateInfo}>
                          <div style={styles.candidateTopRow}>
                            <span style={styles.candidateIdBadge}>BALLOT #{c.id}</span>
                            <span style={styles.voteCountNumber}>{c.voteCount} VOTES ({pct}%)</span>
                          </div>
                          <h3 style={styles.candidateName}>{c.name}</h3>

                          {/* Futuristic progress meter */}
                          <div style={styles.meterContainer}>
                            <div style={{ ...styles.meterFill, width: `${pct}%` }} />
                          </div>
                        </div>

                        <button 
                          onClick={() => castVote(c.id)}
                          disabled={loading || hasVotedOnChain || !account}
                          style={{
                            ...styles.castVoteBtn,
                            background: hasVotedOnChain 
                              ? 'rgba(255, 255, 255, 0.05)' 
                              : (!account ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)'),
                            color: (hasVotedOnChain || !account) ? '#475569' : '#0a0f1d',
                            cursor: (hasVotedOnChain || !account || loading) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {hasVotedOnChain ? "COMMITTED" : "CAST BALLOT"}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div style={styles.emptyPrompt}>
                    {account ? "POLL INITIALIZED: NO CANDIDATES REGISTERED." : "CONNECT METAMASK SIGNER TO REVEAL SECURE CANDIDATE MATRIX."}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* System Terminal Console Output */}
        <footer style={styles.consoleBox}>
          <div style={styles.consoleHeader}>
            <span style={styles.consoleDot} />
            <span style={styles.consoleTitle}>CONSENSUS LOG // REALTIME AUDIT FEED</span>
          </div>
          <code style={styles.consoleText}>{status}</code>
        </footer>
      </main>
    </div>
  );
}

const styles = {
  appContainer: {
    minHeight: '100vh',
    background: '#070a13',
    color: '#e2e8f0',
    fontFamily: '"JetBrains Mono", "SF Mono", "Segoe UI", monospace',
    position: 'relative',
    overflowX: 'hidden',
    padding: '40px 20px',
    boxSizing: 'border-box'
  },
  glowOrb1: {
    position: 'absolute',
    top: '-150px',
    left: '10%',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0, 242, 254, 0.12) 0%, rgba(0,0,0,0) 70%)',
    filter: 'blur(60px)',
    pointerEvents: 'none'
  },
  glowOrb2: {
    position: 'absolute',
    bottom: '-100px',
    right: '5%',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(138, 43, 226, 0.12) 0%, rgba(0,0,0,0) 70%)',
    filter: 'blur(70px)',
    pointerEvents: 'none'
  },
  mainCard: {
    maxWidth: '820px',
    margin: '0 auto',
    position: 'relative',
    background: 'rgba(13, 19, 33, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(20px)',
    borderRadius: '16px',
    padding: '36px',
    boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 35px rgba(0, 242, 254, 0.05)'
  },
  header: {
    marginBottom: '28px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    paddingBottom: '24px'
  },
  logoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  badgeCyber: {
    fontSize: '11px',
    letterSpacing: '1.5px',
    color: '#00f2fe',
    fontWeight: '700'
  },
  liveIndicator: {
    fontSize: '11px',
    color: '#10b981',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  pulseDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#10b981',
    boxShadow: '0 0 8px #10b981'
  },
  title: {
    fontSize: '28px',
    margin: '0 0 8px 0',
    fontWeight: '800',
    letterSpacing: '-0.5px'
  },
  gradientText: {
    background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 50%, #9055ff 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0
  },
  hudGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    marginBottom: '28px'
  },
  hudStep: {
    padding: '12px 10px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    transition: 'all 0.3s ease'
  },
  stepNum: {
    fontSize: '11px',
    fontWeight: '800'
  },
  stepLabel: {
    fontSize: '11px',
    letterSpacing: '0.8px',
    fontWeight: '600'
  },
  cyberSection: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px'
  },
  sectionHeader: {
    marginBottom: '20px'
  },
  tag: {
    fontSize: '11px',
    color: '#38bdf8',
    letterSpacing: '1.2px',
    fontWeight: '700'
  },
  sectionTitle: {
    fontSize: '18px',
    margin: '4px 0',
    color: '#f8fafc'
  },
  sectionDesc: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '11px',
    letterSpacing: '1px',
    color: '#94a3b8',
    fontWeight: '600'
  },
  cyberInput: {
    background: 'rgba(7, 10, 19, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#00f2fe',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit'
  },
  neonButton: {
    background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
    color: '#0a0f1d',
    border: 'none',
    padding: '14px',
    borderRadius: '8px',
    fontWeight: '700',
    letterSpacing: '1px',
    cursor: 'pointer',
    fontSize: '13px',
    boxShadow: '0 4px 20px rgba(0, 242, 254, 0.25)',
    transition: 'all 0.2s ease'
  },
  profileBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '16px 20px',
    borderRadius: '10px',
    marginBottom: '16px'
  },
  metaKey: {
    fontSize: '10px',
    letterSpacing: '1.2px',
    color: '#64748b',
    display: 'block',
    marginBottom: '2px'
  },
  profileNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  profileName: {
    fontSize: '16px',
    color: '#f8fafc'
  },
  statusPill: {
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#10b981',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: '700',
    letterSpacing: '0.8px'
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    letterSpacing: '0.8px',
    cursor: 'pointer'
  },
  signerHub: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(0, 242, 254, 0.15)',
    padding: '16px 20px',
    borderRadius: '10px',
    marginBottom: '24px'
  },
  accountText: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    fontWeight: '600'
  },
  adminPill: {
    background: 'rgba(147, 51, 234, 0.2)',
    color: '#c084fc',
    border: '1px solid rgba(147, 51, 234, 0.4)',
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: '700'
  },
  votedPill: {
    background: 'rgba(234, 179, 8, 0.15)',
    color: '#facc15',
    border: '1px solid rgba(234, 179, 8, 0.3)',
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: '700'
  },
  walletBtn: {
    background: 'rgba(0, 242, 254, 0.1)',
    border: '1px solid #00f2fe',
    color: '#00f2fe',
    padding: '10px 18px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.8px',
    cursor: 'pointer'
  },
  adminCard: {
    background: 'rgba(147, 51, 234, 0.05)',
    border: '1px solid rgba(147, 51, 234, 0.2)',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '24px'
  },
  adminTag: {
    fontSize: '10px',
    color: '#c084fc',
    letterSpacing: '1.2px',
    fontWeight: '700'
  },
  adminTitle: {
    fontSize: '15px',
    margin: '4px 0 12px 0',
    color: '#f3e8ff'
  },
  adminForm: {
    display: 'flex',
    gap: '10px'
  },
  adminInput: {
    flex: 1,
    background: 'rgba(7, 10, 19, 0.8)',
    border: '1px solid rgba(147, 51, 234, 0.3)',
    borderRadius: '6px',
    padding: '10px 14px',
    color: '#f3e8ff',
    fontSize: '13px',
    outline: 'none'
  },
  adminSubmitBtn: {
    background: '#7e22ce',
    color: '#fff',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '6px',
    fontSize: '11px',
    letterSpacing: '0.8px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  ballotHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  ballotTitle: {
    fontSize: '16px',
    letterSpacing: '1px',
    color: '#94a3b8',
    margin: 0
  },
  totalBadge: {
    fontSize: '11px',
    color: '#00f2fe',
    letterSpacing: '1px',
    fontWeight: '700'
  },
  candidateGrid: {
    display: 'grid',
    gap: '12px'
  },
  candidateCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '10px',
    padding: '18px 22px',
    transition: 'border 0.2s ease'
  },
  candidateInfo: {
    flex: 1,
    marginRight: '20px'
  },
  candidateTopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '4px'
  },
  candidateIdBadge: {
    fontSize: '10px',
    color: '#00f2fe',
    letterSpacing: '1px',
    fontWeight: '700'
  },
  voteCountNumber: {
    fontSize: '11px',
    color: '#64748b'
  },
  candidateName: {
    fontSize: '17px',
    margin: '0 0 10px 0',
    color: '#f8fafc',
    fontWeight: '700'
  },
  meterContainer: {
    width: '100%',
    height: '4px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '999px',
    overflow: 'hidden'
  },
  meterFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #00f2fe, #3b82f6)',
    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  castVoteBtn: {
    padding: '10px 22px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '11px',
    letterSpacing: '1px',
    fontWeight: '800'
  },
  emptyPrompt: {
    textAlign: 'center',
    padding: '36px',
    color: '#475569',
    border: '1px dashed rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    fontSize: '12px',
    letterSpacing: '0.8px'
  },
  consoleBox: {
    marginTop: '32px',
    background: 'rgba(3, 7, 18, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '8px',
    padding: '14px 18px'
  },
  consoleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px'
  },
  consoleDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#00f2fe',
    boxShadow: '0 0 6px #00f2fe'
  },
  consoleTitle: {
    fontSize: '10px',
    color: '#64748b',
    letterSpacing: '1px',
    fontWeight: '700'
  },
  consoleText: {
    fontSize: '12px',
    color: '#38bdf8',
    display: 'block',
    wordBreak: 'break-all'
  }
};