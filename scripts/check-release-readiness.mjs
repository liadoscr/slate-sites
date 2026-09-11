// Read-only: reports setup flags, never credentials, customer records or counts.
import { createClient } from '@supabase/supabase-js';
import { resolve } from 'node:path';
process.loadEnvFile(resolve(import.meta.dirname,'../.env.local'));
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key){console.log(JSON.stringify({databaseReady:false,reason:'Missing local Supabase configuration'}));process.exit(1);}
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const checks=await Promise.all([
  client.from('project_briefs').select('design_notes').limit(0),
  client.from('site_versions').select('request_id').limit(0),
  client.from('site_generation_jobs').select('id,phase,error_message').limit(0),
  client.from('notification_outbox').select('id').limit(0),
  client.storage.getBucket('site-version-assets'),
]);
let functionsReady=false;
try{const response=await fetch(`${url}/rest/v1/`,{headers:{apikey:key,Authorization:`Bearer ${key}`,'Accept':'application/openapi+json'},signal:AbortSignal.timeout(15000)});const schema=await response.json();functionsReady=['slate_start_generation','slate_append_version','slate_publish_version','slate_save_brief','slate_claim_notifications','slate_take_limit'].every(name=>Boolean(schema.paths?.[`/rpc/${name}`]));}catch{}
const databaseReady=checks.every(result=>!result.error)&&checks[4].data?.public===false&&functionsReady;
console.log(JSON.stringify({databaseReady,checks:{designNotes:!checks[0].error,versionRequests:!checks[1].error,generationJobs:!checks[2].error,notificationOutbox:!checks[3].error,privateVersionMedia:!checks[4].error&&checks[4].data?.public===false,functionsReady},localEmailConfigured:Boolean(process.env.RESEND_API_KEY&&process.env.LEAD_EMAIL_FROM&&process.env.SLATE_SITES_APP_URL),localRetrySecretConfigured:Boolean(process.env.CRON_SECRET)}));
if(!databaseReady)process.exitCode=1;
