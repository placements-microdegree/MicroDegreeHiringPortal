const notificationService = require("../services/notificationService");

async function myNotifications(req, res, next) {
  try {
    const notifications = await notificationService.listNotificationsByUser({
      userId: req.user.id,
      jwt: req.user.jwt,
    });
    res.json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const notification = await notificationService.markNotificationAsRead({
      notificationId: req.params.id,
      userId: req.user.id,
      jwt: req.user.jwt,
    });

    res.json({ success: true, notification });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  myNotifications,
  markRead,
};
