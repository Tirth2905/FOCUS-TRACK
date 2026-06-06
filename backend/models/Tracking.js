const mongoose = require('mongoose');

const SiteEntrySchema = new mongoose.Schema({
  domain: { type: String, required: true },
  seconds: { type: Number, default: 0 }
}, { _id: false });

const TrackingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String,  // YYYY-MM-DD
    required: true,
    index: true
  },
  sites: [SiteEntrySchema],
  totalSeconds: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index for fast user+date lookups
TrackingSchema.index({ userId: 1, date: 1 }, { unique: true });

// Auto-update totalSeconds
TrackingSchema.pre('save', function (next) {
  this.totalSeconds = this.sites.reduce((sum, s) => sum + s.seconds, 0);
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Tracking', TrackingSchema);
