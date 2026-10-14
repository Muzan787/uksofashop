-- The scheduled jobs now run from the database (admin upgrade Q2, Q3).
--
-- Each was run once from the database first and reported ok in job_runs
-- (15 Oct 2026); the matching schedule line was removed from
-- .github/workflows/scheduled-jobs.yml in the same change, so no job runs
-- twice. Same times as GitHub had them (UTC).
--
--   job-recovery-cleanup  08:30 daily     plain SQL
--   job-review-requests   10:00 daily     site, through /api/jobs
--   job-weekly-digest     07:00 Mondays   site, through /api/jobs
--   job-health-check      :07 every hour  site, through /api/jobs
--
-- cron.schedule() with an existing name updates that job, so this is safe
-- to run again.

select cron.schedule('job-recovery-cleanup', '30 8 * * *', 'select private.run_recovery_cleanup();');
select cron.schedule('job-review-requests', '0 10 * * *', $$select private.start_site_job('review-requests');$$);
select cron.schedule('job-weekly-digest', '0 7 * * 1', $$select private.start_site_job('weekly-digest');$$);
select cron.schedule('job-health-check', '7 * * * *', $$select private.start_site_job('health-check');$$);
