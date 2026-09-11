import mongoose from 'mongoose';
import { Election } from '../models/Election.js';
import { ElectionPosition } from '../models/ElectionPosition.js';
import { Candidate } from '../models/Candidate.js';
import { VoteBallot } from '../models/VoteBallot.js';
import { ElectionVoter } from '../models/ElectionVoter.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { ELECTION_STATUS, ROLES } from '../constants/index.js';

export interface PositionResult {
  positionId: string;
  positionName: string;
  maxVotesAllowed: number;
  totalVotesCast: number;
  isTie: boolean;
  tieCandidateNames?: string[];
  winner?: {
    candidateId: string;
    fullName: string;
    symbol?: string;
    voteCount: number;
    percentage: number;
  };
  candidateResults: Array<{
    candidateId: string;
    candidateCode: string;
    fullName: string;
    symbol?: string;
    profilePhotoUrl?: string;
    voteCount: number;
    percentage: number;
    rank: number;
    isWinner: boolean;
  }>;
}

export interface ElectionResultSummary {
  election: {
    id: string;
    name: string;
    code: string;
    status: string;
    votingStartAt: Date;
    votingEndAt: Date;
    resultPublishAt?: Date;
  };
  stats: {
    totalEligibleVoters: number;
    totalVotesCast: number;
    turnoutPercentage: number;
  };
  positions: PositionResult[];
  generatedAt: Date;
}

export class ResultService {
  public static async calculateResults(
    electionId: string,
    userRoles: string[] = []
  ): Promise<ElectionResultSummary> {
    const election = await Election.findById(electionId);
    if (!election) throw new NotFoundError('Election not found');

    const isPrivileged = userRoles.some((r) =>
      [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ELECTION_OFFICER, ROLES.OBSERVER].includes(r as any)
    );

    // If regular voter/candidate, results are only visible if status is RESULT_PUBLISHED
    if (!isPrivileged && election.status !== ELECTION_STATUS.RESULT_PUBLISHED) {
      throw new ForbiddenError('Election results have not been officially published yet');
    }

    const [totalEligibleVoters, votersParticipated] = await Promise.all([
      ElectionVoter.countDocuments({ electionId, isEligible: true }),
      ElectionVoter.countDocuments({ electionId, hasVoted: true }),
    ]);

    const turnoutPercentage = totalEligibleVoters > 0
      ? Number(((votersParticipated / totalEligibleVoters) * 100).toFixed(2))
      : 0;

    const positions = await ElectionPosition.find({ electionId, isActive: true }).sort({ displayOrder: 1 });
    const positionResults: PositionResult[] = [];

    for (const pos of positions) {
      const candidates = await Candidate.find({
        electionId,
        positionId: pos._id,
        status: 'APPROVED',
      });

      // Aggregate votes for this position
      const voteAggregates = await VoteBallot.aggregate([
        {
          $match: {
            electionId: new mongoose.Types.ObjectId(electionId),
            positionId: pos._id,
          },
        },
        {
          $group: {
            _id: '$candidateId',
            voteCount: { $sum: 1 },
          },
        },
      ]);

      const voteMap = new Map<string, number>();
      let totalPositionVotes = 0;

      for (const item of voteAggregates) {
        voteMap.set(item._id.toString(), item.voteCount);
        totalPositionVotes += item.voteCount;
      }

      // Map candidates to vote counts & compute percentages
      const candidateList = candidates.map((cand) => {
        const count = voteMap.get(cand._id.toString()) || 0;
        const percentage = totalPositionVotes > 0
          ? Number(((count / totalPositionVotes) * 100).toFixed(2))
          : 0;

        return {
          candidateId: cand._id.toString(),
          candidateCode: cand.candidateCode,
          fullName: cand.fullName,
          symbol: cand.symbol,
          profilePhotoUrl: cand.profilePhotoUrl,
          voteCount: count,
          percentage,
          rank: 1,
          isWinner: false,
        };
      });

      // Sort by vote count descending
      candidateList.sort((a, b) => b.voteCount - a.voteCount);

      // Compute ranks & handle ties
      let currentRank = 1;
      for (let i = 0; i < candidateList.length; i++) {
        if (i > 0 && candidateList[i].voteCount < candidateList[i - 1].voteCount) {
          currentRank = i + 1;
        }
        candidateList[i].rank = currentRank;
      }

      let isTie = false;
      let tieCandidateNames: string[] = [];
      let winner: PositionResult['winner'] = undefined;

      if (candidateList.length > 0 && candidateList[0].voteCount > 0) {
        // Check if top candidate shares highest votes with second candidate
        if (candidateList.length > 1 && candidateList[0].voteCount === candidateList[1].voteCount) {
          isTie = true;
          tieCandidateNames = candidateList
            .filter((c) => c.voteCount === candidateList[0].voteCount)
            .map((c) => c.fullName);
        } else {
          candidateList[0].isWinner = true;
          winner = {
            candidateId: candidateList[0].candidateId,
            fullName: candidateList[0].fullName,
            symbol: candidateList[0].symbol,
            voteCount: candidateList[0].voteCount,
            percentage: candidateList[0].percentage,
          };
        }
      }

      positionResults.push({
        positionId: pos._id.toString(),
        positionName: pos.name,
        maxVotesAllowed: pos.maxVotesAllowed,
        totalVotesCast: totalPositionVotes,
        isTie,
        tieCandidateNames: isTie ? tieCandidateNames : undefined,
        winner,
        candidateResults: candidateList,
      });
    }

    return {
      election: {
        id: election._id.toString(),
        name: election.name,
        code: election.electionCode,
        status: election.status,
        votingStartAt: election.votingStartAt,
        votingEndAt: election.votingEndAt,
        resultPublishAt: election.resultPublishAt,
      },
      stats: {
        totalEligibleVoters,
        totalVotesCast: votersParticipated,
        turnoutPercentage,
      },
      positions: positionResults,
      generatedAt: new Date(),
    };
  }
}
