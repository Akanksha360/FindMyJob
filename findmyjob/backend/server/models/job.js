const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const JobSchema = new Schema({
    company: String,
    title: String,
    location: String,
    experience: String,
    skills: [String],
    description: String,
    apply_url: String,
    posted_date: Date,
    source_url: String,
    crawled_at: { type: Date, default: Date.now },
    fingerprint: String
});


module.exports = mongoose.model('Job', JobSchema);