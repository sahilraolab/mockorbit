const mongoose = require('mongoose');

/**
 * SiteSettings — editable key/value store for admin-configurable text & flags.
 * Admin panel: /admin/settings
 *
 * Default keys (seeded on first read via getOrDefault):
 *   hero_heading  — main H1 text on the homepage hero
 *   hero_sub      — subheading paragraph below the H1
 */
const siteSettingsSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true, trim: true },
  value: { type: String, default: '', trim: true },
  label: { type: String, trim: true }   // friendly name shown in admin UI
});

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

// Defaults — used when a key has never been saved
const DEFAULTS = {
  hero_heading: { label: 'Hero Heading', value: 'Mission for Academic\nRank & Success' },
  hero_sub:     { label: 'Hero Subheading', value: 'Full-length mock tests for top competitive exams — topic-wise analytics, detailed explanations, and an all-India rank among fellow aspirants.' }
};

/**
 * Get a setting value; returns the default if the key doesn't exist.
 */
SiteSettings.getOrDefault = async function (key) {
  const doc = await this.findOne({ key }).lean();
  if (doc) return doc.value;
  return (DEFAULTS[key] && DEFAULTS[key].value) || '';
};

/**
 * Get all settings as a plain object { key: value }.
 * Merges DB values over DEFAULTS so every key is always present.
 */
SiteSettings.getAll = async function () {
  const docs = await this.find().lean();
  const result = {};
  Object.entries(DEFAULTS).forEach(([k, v]) => { result[k] = v.value; });
  docs.forEach(d => { result[d.key] = d.value; });
  return result;
};

/**
 * Upsert a key/value. Creates the doc if it doesn't exist.
 */
SiteSettings.set = async function (key, value) {
  const label = (DEFAULTS[key] && DEFAULTS[key].label) || key;
  return this.findOneAndUpdate(
    { key },
    { key, value: String(value || '').trim(), label },
    { upsert: true, new: true }
  );
};

module.exports = SiteSettings;
