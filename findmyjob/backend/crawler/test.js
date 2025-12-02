import fs from 'fs';

// Load your extracted jobs
const jobs = JSON.parse(fs.readFileSync('./extracted_jobs.json', 'utf-8'));

// Filter valid jobs
const validJobs = jobs
  .filter(job => job.url && job.url.includes('/jobs/')) // Only keep URLs with /jobs/
  .filter((job, index, self) => 
    index === self.findIndex(j => j.url === job.url) // Deduplicate by URL
  );

fs.writeFileSync('./cleaned_jobs.json', JSON.stringify(validJobs, null, 2));
console.log(`Total valid jobs: ${validJobs.length}`);
