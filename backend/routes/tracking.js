const router = require('express').Router();
const auth = require('../middleware/auth');
const Tracking = require('../models/Tracking');

// POST /api/tracking/sync — sync one day
router.post('/sync', auth, async (req, res) => {
  try {
    const { date, data } = req.body;
    if (!date || !data) return res.status(400).json({ message: 'date and data required' });

    const sites = Object.entries(data).map(([domain, seconds]) => ({ domain, seconds }));

    await Tracking.findOneAndUpdate(
      { userId: req.user._id, date },
      { sites, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ message: 'Synced', date });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/tracking/sync-all — sync all days at once
router.post('/sync-all', auth, async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ message: 'data required' });

    const ops = Object.entries(data).map(([date, dayData]) => ({
      updateOne: {
        filter: { userId: req.user._id, date },
        update: {
          $set: {
            sites: Object.entries(dayData).map(([domain, seconds]) => ({ domain, seconds })),
            updatedAt: new Date()
          }
        },
        upsert: true
      }
    }));

    if (ops.length > 0) await Tracking.bulkWrite(ops);

    res.json({ message: 'All synced', days: ops.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tracking/today
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const record = await Tracking.findOne({ userId: req.user._id, date: today });
    if (!record) return res.json({ date: today, sites: {}, totalSeconds: 0 });

    const sites = {};
    record.sites.forEach(s => { sites[s.domain] = s.seconds; });
    res.json({ date: today, sites, totalSeconds: record.totalSeconds });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tracking/range?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/range', auth, async (req, res) => {
  try {
    const { start, end } = req.query;
    const filter = { userId: req.user._id };
    if (start || end) {
      filter.date = {};
      if (start) filter.date.$gte = start;
      if (end) filter.date.$lte = end;
    }

    const records = await Tracking.find(filter).sort({ date: -1 }).limit(90);
    const result = {};
    records.forEach(r => {
      result[r.date] = {};
      r.sites.forEach(s => { result[r.date][s.domain] = s.seconds; });
    });

    res.json({ data: result, count: records.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/tracking/:date
router.delete('/:date', auth, async (req, res) => {
  try {
    await Tracking.deleteOne({ userId: req.user._id, date: req.params.date });
    res.json({ message: 'Deleted', date: req.params.date });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
