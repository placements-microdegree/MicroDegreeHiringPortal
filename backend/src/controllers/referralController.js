const referralService = require("../services/referralService");

async function createStepOne(req, res, next) {
  try {
    const referral = await referralService.createReferralStepOne({
      jwt: req.user?.jwt,
      studentId: req.user?.id,
      payload: req.body,
    });

    res.status(201).json({ success: true, referral });
  } catch (err) {
    next(err);
  }
}

async function submitFollowUp(req, res, next) {
  try {
    const referral = await referralService.submitReferralFollowUp({
      jwt: req.user?.jwt,
      studentId: req.user?.id,
      referralId: req.params.id,
      payload: req.body,
    });

    res.json({ success: true, referral });
  } catch (err) {
    next(err);
  }
}

async function listForAdmin(req, res, next) {
  try {
    const referrals = await referralService.listReferredData({
      jwt: req.user?.jwt,
    });

    res.json({ success: true, referrals });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createStepOne,
  submitFollowUp,
  listForAdmin,
};
