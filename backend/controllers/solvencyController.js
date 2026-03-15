const solvencyService = require('../zkp/services/solvencyService');

/**
 * Solvency Controller
 * Handles requests for Proof-of-Solvency verification
 */
class SolvencyController {
    /**
     * Get global solvency status
     */
    async getStatus(req, res) {
        try {
            const status = await solvencyService.getSolvencyStatus();
            res.json(status);
        } catch (error) {
            console.error('Error fetching solvency status:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Get user-specific inclusion proof
     */
    async getUserProof(req, res) {
        try {
            const userId = req.user.id; // From authMiddleware
            const proof = await solvencyService.getUserInclusionProof(userId);
            res.json(proof);
        } catch (error) {
            console.error('Error fetching user inclusion proof:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Manually trigger a fresh snapshot (Admin only in production)
     */
    async triggerSnapshot(req, res) {
        try {
            const snapshot = await solvencyService.generateSnapshot();
            res.json({ success: true, data: snapshot });
        } catch (error) {
            console.error('Error triggering solvency snapshot:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new SolvencyController();
