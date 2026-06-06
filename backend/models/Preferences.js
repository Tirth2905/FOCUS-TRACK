const mongoose = require('mongoose');

const PreferencesSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  blockedSites: [{ type: String }],
  dailyGoalHours: { type: Number, default: 8 },
  trackingEnabled: { type: Boolean, default: true },
  notificationsEnabled: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});

PreferencesSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Preferences', PreferencesSchema);
