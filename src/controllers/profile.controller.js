const db = require('../repositories/db');

function getProfile(req, res) {
  const userId = req.user ? req.user.id : 'usr_demo_coimbatore_01';
  const user = db.findById('users', userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User profile not found' });
  }

  const { passwordHash, ...safeProfile } = user;
  const journeysCount = db.find('journeys', j => j.userId === userId).length;
  const couponsCount = db.find('coupons', c => c.userId === userId).length;

  res.json({
    success: true,
    data: {
      ...safeProfile,
      stats: {
        totalJourneysShared: journeysCount,
        totalRewardsUnlocked: couponsCount,
        communityImpact: `${journeysCount * 12} fellow passengers helped`
      }
    }
  });
}

function updateProfile(req, res) {
  const userId = req.user ? req.user.id : 'usr_demo_coimbatore_01';
  const { fullName, phone } = req.body;

  const updates = {};
  if (fullName) updates.fullName = fullName.trim();
  if (phone) updates.phone = phone.trim();

  const updated = db.update('users', userId, updates);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const { passwordHash, ...safeProfile } = updated;
  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: safeProfile
  });
}

module.exports = {
  getProfile,
  updateProfile
};
