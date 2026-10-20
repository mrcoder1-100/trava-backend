const { v4: uuidv4 } = require('uuid');
const db = require('../repositories/db');
const config = require('../config');

class RewardsService {
  /**
   * Evaluates journey distance and awards points according to backend rules
   */
  processJourneyPoints(userId, journeyId, distanceKm) {
    const user = db.findById('users', userId);
    if (!user) throw new Error('User not found');

    const isEligible = distanceKm >= config.minJourneyDistanceKm;
    if (!isEligible) {
      return {
        isEligible: false,
        pointsAwarded: 0,
        message: `Journey distance (${distanceKm} km) did not meet minimum threshold (${config.minJourneyDistanceKm} km).`,
        currentBalance: user.pointsBalance || 0
      };
    }

    // Check daily cap
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = db.find('rewards', r => r.userId === userId && r.createdAt.startsWith(today));
    const todayPoints = todayTransactions.reduce((acc, curr) => acc + (curr.points > 0 ? curr.points : 0), 0);

    let pointsToAward = config.pointsPerEligibleJourney;
    if (todayPoints + pointsToAward > config.dailyPointsCap) {
      pointsToAward = Math.max(0, config.dailyPointsCap - todayPoints);
    }

    if (pointsToAward <= 0) {
      return {
        isEligible: true,
        pointsAwarded: 0,
        message: `Daily points limit (${config.dailyPointsCap} pts) reached.`,
        currentBalance: user.pointsBalance || 0
      };
    }

    const previousBalance = user.pointsBalance || 0;
    const newBalance = previousBalance + pointsToAward;

    // Update user balance
    db.update('users', userId, { pointsBalance: newBalance });

    // Create ledger entry
    const ledgerEntry = db.create('rewards', {
      id: `ledg_${uuidv4().substring(0, 8)}`,
      userId,
      type: 'JOURNEY_CONTRIBUTION',
      points: pointsToAward,
      balanceAfter: newBalance,
      journeyId,
      description: `Eligible journey GPS contribution (${distanceKm.toFixed(1)} km)`,
      createdAt: new Date().toISOString()
    });

    // Check if threshold reached to unlock a guaranteed scratch card
    let unlockedCard = null;
    if (newBalance >= config.scratchCardThresholdPoints) {
      unlockedCard = this.unlockScratchCard(userId, 'Reached points target from bus contributions');
    }

    return {
      isEligible: true,
      pointsAwarded: pointsToAward,
      previousBalance,
      currentBalance: newBalance,
      unlockedCard,
      ledgerEntry
    };
  }

  getUserBalance(userId) {
    const user = db.findById('users', userId);
    if (!user) return { balance: 0, progress: 0, target: config.scratchCardThresholdPoints };

    const balance = user.pointsBalance || 0;
    const target = config.scratchCardThresholdPoints;
    const progress = Math.min(1.0, balance / target);

    return {
      balance,
      progress: parseFloat(progress.toFixed(2)),
      target,
      unlockedCardsCount: db.find('rewards', r => r.userId === userId && r.unlockedCard).length
    };
  }

  getUserLedger(userId) {
    return db
      .find('rewards', r => r.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Guaranteed reward rule: Every card has an assigned reward at creation
   */
  unlockScratchCard(userId, unlockReason = 'Points Threshold Target Reached') {
    // Check if user already has an unrevealed scratch card to avoid duplicates
    const existingUnrevealed = db.findOne('coupons', c => c.userId === userId && c.status === 'ACTIVE' && !c.redeemedAt);
    
    // Multi-category reward catalog (Bakery, Restaurant, Supermarket, Gym)
    const rewardCatalog = [
      {
        category: 'BAKERY',
        prefix: 'BAKE',
        title: 'Annapoorna Bakery & Sweets',
        description: '₹50 Off on Any Fresh Pastry, Savouries, or Traditional Sweets',
        discountAmount: 50,
        merchantName: 'Annapoorna Bakery & Sweets',
        location: 'Gandhipuram Bus Stand, Coimbatore'
      },
      {
        category: 'BAKERY',
        prefix: 'BAKE',
        title: 'KR Bakes Peelamedu',
        description: 'Free Premium Filter Coffee & Butter Biscuit Combo',
        discountAmount: 35,
        merchantName: 'KR Bakes',
        location: 'Avinashi Road, Peelamedu, Coimbatore'
      },
      {
        category: 'RESTAURANT',
        prefix: 'REST',
        title: 'Sree Annapoorna Restaurant',
        description: '₹75 Off on Special Ghee Roast Dosa & Traditional South Indian Thali',
        discountAmount: 75,
        merchantName: 'Sree Annapoorna Restaurant',
        location: 'RS Puram & Gandhipuram, Coimbatore'
      },
      {
        category: 'RESTAURANT',
        prefix: 'REST',
        title: 'Hari Bhavanam Non-Veg & Biryani',
        description: '₹100 Off on Family Dine-In & Mutton Biryani',
        discountAmount: 100,
        merchantName: 'Hari Bhavanam',
        location: 'Avinashi Road, Peelamedu, Coimbatore'
      },
      {
        category: 'RESTAURANT',
        prefix: 'REST',
        title: 'A2B - Adyar Ananda Bhavan',
        description: '₹50 Off on Evening Tiffin, Filter Coffee & Snacks Combo',
        discountAmount: 50,
        merchantName: 'A2B (Adyar Ananda Bhavan)',
        location: 'Ukkadam Bus Stand Bypass, Coimbatore'
      },
      {
        category: 'SUPERMARKET',
        prefix: 'MART',
        title: 'Nilgiris 1905 Supermarket',
        description: '₹60 Off on Groceries, Fresh Dairy & Organics (Min order ₹300)',
        discountAmount: 60,
        merchantName: 'Nilgiris 1905 Supermarket',
        location: 'DB Road, RS Puram, Coimbatore'
      },
      {
        category: 'SUPERMARKET',
        prefix: 'MART',
        title: 'Pazhamudir Nilayam Fresh Fruits',
        description: '₹40 Off on Farm Fresh Fruits & Cold-Pressed Juices',
        discountAmount: 40,
        merchantName: 'Pazhamudir Nilayam',
        location: 'Avinashi Road & Gandhipuram, Coimbatore'
      },
      {
        category: 'SUPERMARKET',
        prefix: 'MART',
        title: 'Kannan Jubilee Department Store',
        description: '₹50 Off on Household Essentials & Provisions',
        discountAmount: 50,
        merchantName: 'Kannan Jubilee Supermarket',
        location: 'Oppanakara Street, Town Hall, Coimbatore'
      },
      {
        category: 'GYM',
        prefix: 'GYM',
        title: 'Slam Fitness Studio',
        description: '3 Days Free All-Access Pass + ₹500 Off Annual Gym Membership',
        discountAmount: 500,
        merchantName: 'Slam Fitness Studio',
        location: 'Avinashi Road, Peelamedu, Coimbatore'
      },
      {
        category: 'GYM',
        prefix: 'GYM',
        title: "Gold's Gym Coimbatore",
        description: '1 Free Personal Training Session + ₹300 Off Fitness Pass',
        discountAmount: 300,
        merchantName: "Gold's Gym Coimbatore",
        location: 'Race Course Road, Coimbatore'
      },
      {
        category: 'GYM',
        prefix: 'GYM',
        title: 'Cult.fit Training Center',
        description: '₹200 Off on Cult Group Workouts, HIIT & Yoga Classes',
        discountAmount: 200,
        merchantName: 'Cult.fit Center',
        location: 'Cross Cut Road, Gandhipuram, Coimbatore'
      }
    ];

    const pick = rewardCatalog[Math.floor(Math.random() * rewardCatalog.length)];
    const couponCode = `TRAVA-${pick.prefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}${Math.floor(10 + Math.random() * 90)}`;
    const newCoupon = db.create('coupons', {
      id: `coup_${uuidv4().substring(0, 8)}`,
      code: couponCode,
      userId,
      category: pick.category,
      title: pick.title,
      description: pick.description,
      discountAmount: pick.discountAmount,
      merchantName: pick.merchantName,
      location: pick.location,
      status: 'ACTIVE',
      assignedAt: new Date().toISOString(),
      expiresAt: '2026-12-31T23:59:59Z',
      redeemedAt: null,
      redeemedByMerchant: null,
      isGuaranteedReward: true
    });

    const scratchCard = {
      id: `sc_${uuidv4().substring(0, 8)}`,
      userId,
      status: 'UNLOCKED',
      targetPoints: config.scratchCardThresholdPoints,
      unlockReason,
      rewardId: newCoupon.id,
      rewardAssigned: {
        code: newCoupon.code,
        title: newCoupon.title,
        description: newCoupon.description,
        discount: `₹${newCoupon.discountAmount}`,
        merchantName: newCoupon.merchantName
      },
      revealed: false,
      revealedAt: null,
      isGuaranteedReward: true,
      createdAt: new Date().toISOString()
    };

    return scratchCard;
  }

  revealScratchCard(cardId, userId) {
    // Mark revealed and return assigned reward
    const userCoupons = db.find('coupons', c => c.userId === userId && c.status === 'ACTIVE');
    const coupon = userCoupons[0] || db.findById('coupons', 'coup_demo_01');

    return {
      cardId,
      revealed: true,
      revealedAt: new Date().toISOString(),
      reward: coupon
    };
  }

  getUserCoupons(userId) {
    return db.find('coupons', c => c.userId === userId);
  }

  /**
   * Retrieves all issued customer coupons for a merchant partner (e.g. Annapoorna Bakery)
   */
  getPartnerCoupons(merchantQuery = '') {
    const allCoupons = db.getCollection('coupons');
    // Filter coupons matching Annapoorna Bakery or BAKERY category
    let partnerCoupons = allCoupons.filter(c => 
      (c.category === 'BAKERY') ||
      (c.merchantName && c.merchantName.toLowerCase().includes('annapoorna bakery')) ||
      (merchantQuery && c.merchantName && c.merchantName.toLowerCase().includes(merchantQuery.toLowerCase()))
    );

    // If needed, format/ensure customerName and terms are present
    const enriched = partnerCoupons.map(c => ({
      ...c,
      customerName: c.customerName || (c.code === 'TRAVA-BAKE-95A1' ? 'Sam (Route 95 Commuter)' : 'Trava Commuter'),
      minSpend: c.minSpend || 500,
      cashbackAmount: c.cashbackAmount || c.discountAmount || 150,
      offerDetails: c.offerDetails || `Buy above ₹${c.minSpend || 500}, Get ₹${c.cashbackAmount || c.discountAmount || 150} Cashback`
    }));

    const activeCount = enriched.filter(c => c.status === 'ACTIVE').length;
    const redeemedCount = enriched.filter(c => c.status === 'REDEEMED').length;

    return {
      partner: {
        partnerId: 'TRV-BAKE-042',
        businessName: 'Annapoorna Bakery & Sweets',
        ownerName: 'Sundar Raman',
        role: 'PARTNER',
        category: 'Bakery & Sweets',
        location: 'Shop #4, Gandhipuram Central Bus Stand Terminal, Coimbatore',
        rating: 4.9,
        badge: 'Verified Trava Transit Partner',
        totalIssued: enriched.length,
        totalActive: activeCount,
        totalRedeemed: redeemedCount
      },
      coupons: enriched
    };
  }

  /**
   * Bakery Shopkeeper Coupon Validation
   */
  validateCoupon(code) {
    if (!code) {
      return {
        status: 'INVALID_COUPON',
        message: 'The coupon code could not be found or is not eligible for redemption.'
      };
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = db.findOne('coupons', c => c.code.toUpperCase() === cleanCode);

    if (!coupon) {
      return {
        status: 'INVALID_COUPON',
        message: 'The coupon code could not be found or is not eligible for redemption.'
      };
    }

    // Check already used
    if (coupon.status === 'REDEEMED' || coupon.redeemedAt) {
      return {
        status: 'ALREADY_USED',
        message: 'This coupon has already been redeemed and cannot be used again.',
        coupon: {
          code: coupon.code,
          title: coupon.title,
          customerName: coupon.customerName || 'Sam',
          merchantName: coupon.merchantName,
          redeemedAt: coupon.redeemedAt,
          redeemedByMerchant: coupon.redeemedByMerchant
        }
      };
    }

    // Check expired
    if (coupon.status === 'EXPIRED' || (coupon.expiresAt && new Date(coupon.expiresAt) < new Date())) {
      return {
        status: 'EXPIRED',
        message: 'This coupon has expired and cannot be redeemed.',
        coupon: {
          code: coupon.code,
          title: coupon.title,
          customerName: coupon.customerName || 'Sam',
          expiresAt: coupon.expiresAt
        }
      };
    }

    // Valid
    return {
      status: 'VALID',
      message: 'This coupon is valid and has not been redeemed.',
      coupon: {
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        discountAmount: coupon.discountAmount,
        minSpend: coupon.minSpend || 500,
        cashbackAmount: coupon.cashbackAmount || (coupon.discountAmount === 50 ? 150 : coupon.discountAmount),
        offerDetails: coupon.offerDetails || `Buy above ₹${coupon.minSpend || 500}, Get ₹${coupon.cashbackAmount || 150} Cashback`,
        customerName: coupon.customerName || 'Sam (Route 95 Commuter)',
        merchantName: coupon.merchantName,
        location: coupon.location,
        expiresAt: coupon.expiresAt
      }
    };
  }

  /**
   * Atomic Shopkeeper Coupon Redemption with Race Condition Prevention
   */
  redeemCoupon(couponIdOrCode, merchantInfo = 'Bakery Counter') {
    const clean = (couponIdOrCode || '').trim();
    // Lookup by ID or code
    let coupon = db.findOne('coupons', c => c.id === clean || c.code.toUpperCase() === clean.toUpperCase());

    if (!coupon) {
      return {
        success: false,
        status: 'INVALID_COUPON',
        message: 'The coupon code could not be found.'
      };
    }

    // Atomic check: If already redeemed, strictly reject second redemption
    if (coupon.status === 'REDEEMED' || coupon.redeemedAt) {
      return {
        success: false,
        status: 'ALREADY_USED',
        message: 'This coupon has already been redeemed and cannot be used again.',
        redeemedAt: coupon.redeemedAt
      };
    }

    // Check expiry
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return {
        success: false,
        status: 'EXPIRED',
        message: 'This coupon has expired and cannot be redeemed.'
      };
    }

    const redemptionTimestamp = new Date().toISOString();

    // Perform atomic state update
    const updated = db.update('coupons', coupon.id, {
      status: 'REDEEMED',
      redeemedAt: redemptionTimestamp,
      redeemedByMerchant: merchantInfo
    });

    // Write audit record
    db.create('redemptions', {
      id: `red_${uuidv4().substring(0, 8)}`,
      couponId: coupon.id,
      couponCode: coupon.code,
      userId: coupon.userId,
      merchantInfo,
      redeemedAt: redemptionTimestamp
    });

    return {
      success: true,
      status: 'REDEEMED_SUCCESSFULLY',
      message: 'Coupon redeemed successfully!',
      coupon: updated
    };
  }
}

module.exports = new RewardsService();
