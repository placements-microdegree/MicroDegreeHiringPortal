// FILE: controllers/externalJobController.js

const externalJobService = require("../services/externalJobService");

// GET /api/external-jobs  — eligible students
async function listActive(req, res, next) {
  try {
    const jobs = await externalJobService.listActiveExternalJobs({
      jwt: req.user.jwt,
    });
    res.json({ success: true, jobs });
  } catch (err) { next(err); }
}

// GET /api/external-jobs/all  — HR/admin sees everything
async function listAll(req, res, next) {
  try {
    const jobs = await externalJobService.listAllExternalJobs({
      jwt: req.user.jwt,
    });
    res.json({ success: true, jobs });
  } catch (err) { next(err); }
}

// POST /api/external-jobs
async function create(req, res, next) {
  try {
    const job = await externalJobService.createExternalJob({
      jwt:     req.user.jwt,
      userId:  req.user.id,
      payload: req.body,
    });
    res.status(201).json({ success: true, job });
  } catch (err) { next(err); }
}

// PUT /api/external-jobs/:id
async function update(req, res, next) {
  try {
    const job = await externalJobService.updateExternalJob({
      jwt:     req.user.jwt,
      jobId:   req.params.id,
      payload: req.body,
    });
    res.json({ success: true, job });
  } catch (err) { next(err); }
}

// DELETE /api/external-jobs/:id
async function remove(req, res, next) {
  try {
    await externalJobService.deleteExternalJob({
      jwt:   req.user.jwt,
      jobId: req.params.id,
    });
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { listActive, listAll, create, update, remove };