import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { Election } from '../models/Election.js';
import { ElectionPosition } from '../models/ElectionPosition.js';
import { Candidate } from '../models/Candidate.js';
import { ElectionVoter } from '../models/ElectionVoter.js';
import { ROLES, ELECTION_STATUS, ELECTION_TYPES, CANDIDATE_STATUS } from '../constants/index.js';
import { config } from '../config/index.js';

export async function seedDatabase() {
  try {
    console.log('🌱 Starting Database Seeding...');
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(config.mongodb.uri);
    }

    // 1. Clear existing collections (optional/clean seed)
    await Promise.all([
      Role.deleteMany({}),
      User.deleteMany({}),
      Election.deleteMany({}),
      ElectionPosition.deleteMany({}),
      Candidate.deleteMany({}),
      ElectionVoter.deleteMany({}),
    ]);

    console.log('🧹 Cleaned existing database collections');

    // 2. Seed Roles
    const rolesData = [
      { code: ROLES.SUPER_ADMIN, name: 'Super Admin', description: 'Complete system access and administration' },
      { code: ROLES.ADMIN, name: 'Admin', description: 'Election, voter and system management' },
      { code: ROLES.ELECTION_OFFICER, name: 'Election Officer', description: 'Conducts elections and verifies candidates' },
      { code: ROLES.CANDIDATE, name: 'Candidate', description: 'Nominated contestant' },
      { code: ROLES.VOTER, name: 'Voter', description: 'Registered voter with casting rights' },
      { code: ROLES.OBSERVER, name: 'Observer', description: 'Auditor and viewer role' },
    ];
    await Role.insertMany(rolesData);
    console.log('✅ Roles seeded');

    // 3. Seed Users
    const defaultPasswordHash = await bcrypt.hash('Password@123', config.security.bcryptRounds);

    const superAdmin = await User.create({
      username: 'superadmin',
      email: 'superadmin@onlinevoting.local',
      fullName: 'Chief Super Administrator',
      passwordHash: defaultPasswordHash,
      roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
      isActive: true,
      isVerified: true,
    });

    const admin = await User.create({
      username: 'admin',
      email: 'admin@onlinevoting.local',
      fullName: 'System Administrator',
      passwordHash: defaultPasswordHash,
      roles: [ROLES.ADMIN],
      isActive: true,
      isVerified: true,
    });

    const officer = await User.create({
      username: 'officer',
      email: 'officer@onlinevoting.local',
      fullName: 'Prof. Rajesh Sharma (Election Officer)',
      passwordHash: defaultPasswordHash,
      roles: [ROLES.ELECTION_OFFICER],
      isActive: true,
      isVerified: true,
    });

    const observer = await User.create({
      username: 'observer',
      email: 'observer@onlinevoting.local',
      fullName: 'Dr. Sunita Rao (Neutral Observer)',
      passwordHash: defaultPasswordHash,
      roles: [ROLES.OBSERVER],
      isActive: true,
      isVerified: true,
    });

    // Candidates
    const candUser1 = await User.create({
      username: 'rahul_sharma',
      email: 'rahul@student.college.edu',
      fullName: 'Rahul Sharma',
      passwordHash: defaultPasswordHash,
      roles: [ROLES.CANDIDATE, ROLES.VOTER],
      isActive: true,
      isVerified: true,
    });

    const candUser2 = await User.create({
      username: 'priya_patel',
      email: 'priya@student.college.edu',
      fullName: 'Priya Patel',
      passwordHash: defaultPasswordHash,
      roles: [ROLES.CANDIDATE, ROLES.VOTER],
      isActive: true,
      isVerified: true,
    });

    const candUser3 = await User.create({
      username: 'arjun_verma',
      email: 'arjun@student.college.edu',
      fullName: 'Arjun Verma',
      passwordHash: defaultPasswordHash,
      roles: [ROLES.CANDIDATE, ROLES.VOTER],
      isActive: true,
      isVerified: true,
    });

    // Seed 20 Voters
    const voters: any[] = [];
    for (let i = 1; i <= 20; i++) {
      const vNum = i.toString().padStart(2, '0');
      const voter = await User.create({
        username: `voter_${vNum}`,
        email: `voter${vNum}@student.college.edu`,
        fullName: `Student Voter ${vNum}`,
        passwordHash: defaultPasswordHash,
        roles: [ROLES.VOTER],
        isActive: true,
        isVerified: true,
      });
      voters.push(voter);
    }
    console.log('✅ Users seeded (SuperAdmin, Admin, Officer, Observer, 3 Candidates, 20 Voters)');

    // 4. Seed Demo Elections
    const now = new Date();
    
    // Election 1: National (All India General Parliamentary Election 2026)
    const natElection = await Election.create({
      electionCode: 'LOK-SABHA-26',
      name: 'All India General Parliamentary Election 2026',
      description: 'Federal election to elect Members of Parliament (Lok Sabha) representing constituencies nationwide. A true test of secure, high-volume digital voting.',
      type: ELECTION_TYPES.NATIONAL,
      nominationStartAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      nominationEndAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      votingStartAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // started 2 hours ago
      votingEndAt: new Date(now.getTime() + 72 * 60 * 60 * 1000), // 3 days left
      resultPublishAt: new Date(now.getTime() + 75 * 60 * 60 * 1000),
      status: ELECTION_STATUS.VOTING_LIVE,
      isActive: true,
      createdBy: officer._id,
    });

    // Election 2: Municipal (Mumbai Ward Commissioner Election 2026)
    const munElection = await Election.create({
      electionCode: 'MUM-MUNICIPAL-26',
      name: 'Mumbai Corporation Ward Commissioner Election 2026',
      description: 'Local municipal body election for electing Ward Commissioners to oversee civic development and administrative projects.',
      type: ELECTION_TYPES.MUNICIPAL,
      nominationStartAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      nominationEndAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      votingStartAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // started 1 hour ago
      votingEndAt: new Date(now.getTime() + 48 * 60 * 60 * 1000), // 2 days left
      resultPublishAt: new Date(now.getTime() + 50 * 60 * 60 * 1000),
      status: ELECTION_STATUS.VOTING_LIVE,
      isActive: true,
      createdBy: officer._id,
    });

    // Election 3: College (College Student Council Election 2026)
    const colElection = await Election.create({
      electionCode: 'CSE-2026',
      name: 'College Student Council Election 2026',
      description: 'Annual democratic student council leadership election for technology and campus welfare committees.',
      type: ELECTION_TYPES.COLLEGE,
      nominationStartAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      nominationEndAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      votingStartAt: new Date(now.getTime() - 30 * 60 * 1000), // started 30 mins ago
      votingEndAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 1 day left
      resultPublishAt: new Date(now.getTime() + 26 * 60 * 60 * 1000),
      status: ELECTION_STATUS.VOTING_LIVE,
      isActive: true,
      createdBy: officer._id,
    });

    // 5. Seed Positions for all Elections
    const posNatPM = await ElectionPosition.create({
      electionId: natElection._id,
      name: 'Prime Minister (Representative)',
      description: 'Leader of the Parliamentary House and Head of Federal Cabinet',
      maxVotesAllowed: 1,
      displayOrder: 1,
      isActive: true,
    });

    const posMunComm = await ElectionPosition.create({
      electionId: munElection._id,
      name: 'Ward Commissioner',
      description: 'Civic administrator for Ward 45 constituency',
      maxVotesAllowed: 1,
      displayOrder: 1,
      isActive: true,
    });

    const posColPres = await ElectionPosition.create({
      electionId: colElection._id,
      name: 'President',
      description: 'Head of Student Union and Campus Council',
      maxVotesAllowed: 1,
      displayOrder: 1,
      isActive: true,
    });

    console.log('✅ Elections & Positions seeded');

    // 6. Seed Candidates for all Elections
    await Candidate.create([
      // National Election Candidates
      {
        userId: candUser1._id,
        electionId: natElection._id,
        positionId: posNatPM._id,
        candidateCode: 'CAND-NAT-01',
        fullName: 'Rahul Sharma',
        symbol: '🚀 Progress Party (PPP)',
        manifesto: 'National technological push, digital infrastructure throughout municipal cities, and education subsidies.',
        description: 'Federal Coalition candidate, experienced administrator',
        status: CANDIDATE_STATUS.APPROVED,
        submittedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        approvedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        approvedBy: officer._id,
      },
      {
        userId: candUser2._id,
        electionId: natElection._id,
        positionId: posNatPM._id,
        candidateCode: 'CAND-NAT-02',
        fullName: 'Priya Patel',
        symbol: '🌟 Democratic Front (DF)',
        manifesto: 'Focus on clean energy transformation, healthcare security for every citizen, and municipal funding.',
        description: 'Coalition for Social Reforms representative',
        status: CANDIDATE_STATUS.APPROVED,
        submittedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        approvedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        approvedBy: officer._id,
      },

      // Municipal Election Candidates
      {
        userId: candUser2._id,
        electionId: munElection._id,
        positionId: posMunComm._id,
        candidateCode: 'CAND-MUN-01',
        fullName: 'Priya Patel',
        symbol: '⚖️ Civic Alliance (CA)',
        manifesto: '24/7 Ward water supply, modern waste management system, and rehabilitation of city parks.',
        description: 'Local resident, urban planner and environmental scientist',
        status: CANDIDATE_STATUS.APPROVED,
        submittedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
        approvedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        approvedBy: officer._id,
      },
      {
        userId: candUser3._id,
        electionId: munElection._id,
        positionId: posMunComm._id,
        candidateCode: 'CAND-MUN-02',
        fullName: 'Arjun Verma',
        symbol: '🛠️ Workers Guild (WG)',
        manifesto: 'Subsidized local transport, street light installations, and digitizing ward office complaints.',
        description: 'Social activist and union organizer',
        status: CANDIDATE_STATUS.APPROVED,
        submittedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        approvedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        approvedBy: officer._id,
      },

      // College Election Candidates
      {
        userId: candUser1._id,
        electionId: colElection._id,
        positionId: posColPres._id,
        candidateCode: 'CAND-PRES-01',
        fullName: 'Rahul Sharma',
        symbol: '🚀 Tech & Welfare',
        manifesto: 'Focus on 24x7 Digital Library, High-speed Campus WiFi, and Cafeteria upgrades.',
        description: 'Final Year CS Student',
        status: CANDIDATE_STATUS.APPROVED,
        submittedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        approvedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        approvedBy: officer._id,
      },
      {
        userId: candUser3._id,
        electionId: colElection._id,
        positionId: posColPres._id,
        candidateCode: 'CAND-PRES-02',
        fullName: 'Arjun Verma',
        symbol: '⚖️ Campus Unity',
        manifesto: 'Academic mentorship program, inter-college sports tournaments, and transparent fund management.',
        description: 'Third Year Mechanical Student',
        status: CANDIDATE_STATUS.APPROVED,
        submittedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
        approvedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        approvedBy: officer._id,
      },
    ]);
    console.log('✅ Candidates seeded');

    // 7. Register all 23 voters in ALL elections
    const allEligibleUsers = [...voters, candUser1, candUser2, candUser3];
    const electionVotersData: any[] = [];
    
    // Register for National Election
    allEligibleUsers.forEach((u, idx) => {
      electionVotersData.push({
        electionId: natElection._id,
        userId: u._id,
        voterNumber: `VOTER-NAT-${(idx + 1).toString().padStart(4, '0')}`,
        isEligible: true,
        eligibilityStatus: 'ELIGIBLE',
        hasVoted: false,
      });
    });

    // Register for Municipal Election
    allEligibleUsers.forEach((u, idx) => {
      electionVotersData.push({
        electionId: munElection._id,
        userId: u._id,
        voterNumber: `VOTER-MUN-${(idx + 1).toString().padStart(4, '0')}`,
        isEligible: true,
        eligibilityStatus: 'ELIGIBLE',
        hasVoted: false,
      });
    });

    // Register for College Election
    allEligibleUsers.forEach((u, idx) => {
      electionVotersData.push({
        electionId: colElection._id,
        userId: u._id,
        voterNumber: `VOTER-COL-${(idx + 1).toString().padStart(4, '0')}`,
        isEligible: true,
        eligibilityStatus: 'ELIGIBLE',
        hasVoted: false,
      });
    });

    await ElectionVoter.insertMany(electionVotersData);
    console.log(`✅ Registered eligible voters for all elections`);

    console.log('\n======================================================');
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('Demo Credentials (Password: Password@123):');
    console.log('  Admin:      admin / admin@onlinevoting.local');
    console.log('  Officer:    officer / officer@onlinevoting.local');
    console.log('  Voters:     voter_01 to voter_20 (voter01@student.college.edu)');
    console.log('  Candidates: rahul_sharma, priya_patel, arjun_verma');
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

