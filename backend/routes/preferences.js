const router = require('express').Router();
const auth = require('../middleware/auth');
const Preferences = require('../models/Preferences');

// GET /api/preferences
router.get('/', auth, async (req, res) => {
  try {
    let prefs = await Preferences.findOne({ userId: req.user._id });
    if (!prefs) prefs = await Preferences.create({ userId: req.user._id });
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/preferences
router.put('/', auth, async (req, res) => {
  try {
    const { blockedSites, dailyGoalHours, trackingEnabled, notificationsEnabled } = req.body;
    const update = {};
    if (blockedSites !== undefined) update.blockedSites = blockedSites;
    if (dailyGoalHours !== undefined) update.dailyGoalHours = dailyGoalHours;
    if (trackingEnabled !== undefined) update.trackingEnabled = trackingEnabled;
    if (notificationsEnabled !== undefined) update.notificationsEnabled = notificationsEnabled;
    update.updatedAt = new Date();

    const prefs = await Preferences.findOneAndUpdate(
      { userId: req.user._id },
      { $set: update },
      { upsert: true, new: true }
    );
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/preferences/blocked — add a blocked site
router.post('/blocked', auth, async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ message: 'domain required' });
    const prefs = await Preferences.findOneAndUpdate(
      { userId: req.user._id },
      { $addToSet: { blockedSites: domain }, $set: { updatedAt: new Date() } },
      { upsert: true, new: true }
    );
    res.json(prefs.blockedSites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/preferences/blocked/:domain
router.delete('/blocked/:domain', auth, async (req, res) => {
  try {
    const prefs = await Preferences.findOneAndUpdate(
      { userId: req.user._id },
      { $pull: { blockedSites: req.params.domain }, $set: { updatedAt: new Date() } },
      { new: true }
    );
    res.json(prefs ? prefs.blockedSites : []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
