import { Request, Response, NextFunction } from 'express';
import { ResultService } from '../services/result.service.js';
import { sendSuccess } from '../utils/response.js';

export class ResultController {
  public static async getElectionResults(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await ResultService.calculateResults(
        String(req.params.electionId),
        req.user?.roles || []
      );
      sendSuccess(res, results);
    } catch (error) {
      next(error);
    }
  }

  public static async exportResultsCSV(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await ResultService.calculateResults(
        String(req.params.electionId),
        req.user?.roles || []
      );

      let csvContent = 'Position,Candidate Code,Candidate Name,Symbol,Votes,Percentage,Rank,Status\n';
      for (const pos of results.positions) {
        for (const cand of pos.candidateResults) {
          csvContent += `"${pos.positionName}","${cand.candidateCode}","${cand.fullName}","${cand.symbol || ''}",${cand.voteCount},${cand.percentage}%,${cand.rank},"${cand.isWinner ? 'WINNER' : ''}"\n`;
        }
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Election_Results_${results.election.code}.csv"`
      );
      res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  }
}
