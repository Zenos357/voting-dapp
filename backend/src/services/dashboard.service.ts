import { User } from '../models/User.js';
import { Election } from '../models/Election.js';
import { Candidate } from '../models/Candidate.js';
import { ElectionVoter } from '../models/ElectionVoter.js';
import { VoteParticipation } from '../models/VoteParticipation.js';
import { ELECTION_STATUS } from '../constants/index.js';

export class DashboardService {
  public static async getAdminDashboard() {
    const [
      totalUsers,
      totalElections,
      activeElections,
      upcomingElections,
      completedElections,
      totalCandidates,
      totalRegisteredVoters,
      totalVotesCast,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Election.countDocuments({ isActive: true }),
      Election.countDocuments({ status: ELECTION_STATUS.VOTING_LIVE }),
      Election.countDocuments({ status: { $in: [ELECTION_STATUS.DRAFT, ELECTION_STATUS.NOMINATION_OPEN, ELECTION_STATUS.READY_FOR_VOTING] } }),
      Election.countDocuments({ status: { $in: [ELECTION_STATUS.VOTING_CLOSED, ELECTION_STATUS.RESULT_PUBLISHED] } }),
      Candidate.countDocuments({ status: 'APPROVED' }),
      ElectionVoter.countDocuments({ isEligible: true }),
      VoteParticipation.countDocuments({ status: 'COMPLETED' }),
    ]);

    // Recent elections summary
    const recentElections = await Election.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name electionCode status type votingStartAt votingEndAt');

    return {
      metrics: {
        totalUsers,
        totalElections,
        activeElections,
        upcomingElections,
        completedElections,
        totalCandidates,
        totalRegisteredVoters,
        totalVotesCast,
        overallTurnout: totalRegisteredVoters > 0
          ? Number(((totalVotesCast / totalRegisteredVoters) * 100).toFixed(2))
          : 0,
      },
      recentElections,
    };
  }

  public static async getOfficerDashboard(officerId: string) {
    const myElections = await Election.find({ createdBy: officerId, isActive: true }).sort({ createdAt: -1 });
    const electionIds = myElections.map((e) => e._id);

    const [candidatesCount, votersCount, votesCount] = await Promise.all([
      Candidate.countDocuments({ electionId: { $in: electionIds } }),
      ElectionVoter.countDocuments({ electionId: { $in: electionIds }, isEligible: true }),
      VoteParticipation.countDocuments({ electionId: { $in: electionIds } }),
    ]);

    return {
      totalElections: myElections.length,
      candidatesCount,
      votersCount,
      votesCount,
      elections: myElections,
    };
  }
}
