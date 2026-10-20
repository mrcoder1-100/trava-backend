const rewardsService = require('../services/rewards.service');
const db = require('../repositories/db');
const config = require('../config');

function getBalance(req, res) {
  const userId = req.user ? req.user.id : 'usr_demo_coimbatore_01';
  const data = rewardsService.getUserBalance(userId);
  res.json({
    success: true,
    data
  });
}

function getLedger(req, res) {
  const userId = req.user ? req.user.id : 'usr_demo_coimbatore_01';
  const transactions = rewardsService.getUserLedger(userId);
  res.json({
    success: true,
    count: transactions.length,
    data: transactions
  });
}

function getScratchCards(req, res) {
  const userId = req.user ? req.user.id : 'usr_demo_coimbatore_01';
  const user = db.findById('users', userId);
  const balance = user ? user.pointsBalance || 0 : 0;

  // Find or generate scratch cards for eligible balance
  const activeCoupons = db.find('coupons', c => c.userId === userId);
  
  // Create guaranteed card if user has reached target
  const cards = [
    {
      id: 'sc_demo_01',
      userId,
      status: balance >= config.scratchCardThresholdPoints ? 'UNLOCKED' : 'LOCKED',
      targetPoints: config.scratchCardThresholdPoints,
      currentPoints: balance,
      unlockReason: 'Completed eligible GPS sharing journey contribution',
      reward: activeCoupons[0] || null,
      isGuaranteedReward: true
    }
  ];

  res.json({
    success: true,
    data: cards
  });
}

function revealScratchCard(req, res) {
  const userId = req.user ? req.user.id : 'usr_demo_coimbatore_01';
  const { id } = req.params;
  const result = rewardsService.revealScratchCard(id, userId);
  res.json({
    success: true,
    message: 'Guaranteed reward revealed successfully!',
    ...result
  });
}

module.exports = {
  getBalance,
  getLedger,
  getScratchCards,
  revealScratchCard
};
