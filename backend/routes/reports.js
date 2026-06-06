const router = require('express').Router();
const auth = require('../middleware/auth');
const Tracking = require('../models/Tracking');

// GET /api/reports/daily?date=YYYY-MM-DD
router.get('/daily', auth, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const record = await Tracking.findOne({ userId: req.user._id, date });

    if (!record) return res.json({ date, totalSeconds: 0, topSites: [], siteCount: 0 });

    const sorted = [...record.sites].sort((a, b) => b.seconds - a.seconds);
    res.json({
      date,
      totalSeconds: record.totalSeconds,
      siteCount: record.sites.length,
      topSites: sorted.slice(0, 10).map(s => ({
        domain: s.domain,
        seconds: s.seconds,
        percentage: record.totalSeconds > 0 ? ((s.seconds / record.totalSeconds) * 100).toFixed(1) : 0
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/weekly
router.get('/weekly', auth, async (req, res) => {
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);

    const records = await Tracking.find({
      userId: req.user._id,
      date: {
        $gte: start.toISOString().split('T')[0],
        $lte: end.toISOString().split('T')[0]
      }
    }).sort({ date: 1 });

    // Aggregate all sites
    const aggregate = {};
    const dailyTotals = {};

    records.forEach(r => {
      dailyTotals[r.date] = r.totalSeconds;
      r.sites.forEach(s => {
        aggregate[s.domain] = (aggregate[s.domain] || 0) + s.seconds;
      });
    });

    const totalSeconds = Object.values(dailyTotals).reduce((a, b) => a + b, 0);
    const topSites = Object.entries(aggregate)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, seconds]) => ({
        domain,
        seconds,
        percentage: totalSeconds > 0 ? ((seconds / totalSeconds) * 100).toFixed(1) : 0
      }));

    res.json({ totalSeconds, dailyTotals, topSites, days: records.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/summary
router.get('/summary', auth, async (req, res) => {
  try {
    const records = await Tracking.find({ userId: req.user._id }).sort({ date: -1 }).limit(30);
    const aggregate = {};
    let totalSeconds = 0;
    let totalDays = records.length;

    records.forEach(r => {
      totalSeconds += r.totalSeconds;
      r.sites.forEach(s => {
        aggregate[s.domain] = (aggregate[s.domain] || 0) + s.seconds;
      });
    });

    const topSites = Object.entries(aggregate)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain, seconds]) => ({ domain, seconds }));

    res.json({
      totalSeconds,
      totalDays,
      avgSecondsPerDay: totalDays > 0 ? Math.round(totalSeconds / totalDays) : 0,
      topSites,
      uniqueSites: Object.keys(aggregate).length
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
