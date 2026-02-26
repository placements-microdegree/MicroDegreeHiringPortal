const jobService = require("../services/jobService");

async function list(req, res, next) {
  try {
    const jobs = await jobService.listJobs({ actor: req.user });
    res.json({ success: true, jobs });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const job = await jobService.createJob({
      payload: req.body,
      actor: req.user,
      jwt: req.user.jwt,
    });
    res.status(201).json({ success: true, job });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const job = await jobService.updateJob({
      jobId: req.params.id,
      payload: req.body,
      actor: req.user,
      jwt: req.user.jwt,
    });
    res.json({ success: true, job });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await jobService.deleteJob({
      jobId: req.params.id,
      actor: req.user,
      jwt: req.user.jwt,
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  create,
  update,
  remove,
};
