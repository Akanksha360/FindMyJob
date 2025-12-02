const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const Job = require('./models/job');

require('dotenv').config();
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));


const MONGO = process.env.MONGO_URI || 'mongodb+srv://akankshaofficial360_db_user:nZSbeOBIvuIgtrsG@cluster0.wvvdv7v.mongodb.net/?appName=Cluster0';
mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Mongo connected'))
    .catch(e => console.error(e));


// ingest endpoint used by crawler/extractor
app.post('/ingest', async (req, res) => {
    try {
        const jobs = req.body.jobs || [];
        const saved = [];
        for (const j of jobs) {
            // basic dedupe by fingerprint or apply_url
            const fp = j.fingerprint || (j.source_url + '|' + j.title);
            const existing = await Job.findOne({ fingerprint: fp });
            if (existing) continue;
            const job = new Job({
                company: j.company || '',
                title: j.title || '',
                location: j.location || null,
                experience: j.experience || null,
                skills: j.skills || [],
                description: j.description || '',
                apply_url: j.apply_url || j.source_url || null,
                posted_date: j.posted_date ? new Date(j.posted_date) : null,
                source_url: j.source_url || null,
                fingerprint: fp
            });
            await job.save();
            saved.push(job);
        }
        res.json({ ok: true, saved: saved.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: err.message });
    }
});


// simple search endpoint
app.get('/jobs', async (req, res) => {
    try {
        const q = req.query.q || '';
        console.log(q)
        const filter = q ? { $text: { $search: q } } : {};
        const jobs = await Job.find(filter).limit(100).sort({ crawled_at: -1 });
        console.log(jobs)
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.listen(process.env.PORT || 3001, () => console.log('Server started'));