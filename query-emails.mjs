import postgres from 'postgres';

const sql = postgres('postgresql://postgres.hzmrkvooqjbxptqjqxii:ArnuVVZ0mS4ZbMR8@aws-0-eu-central-1.pooler.supabase.com:5432/postgres', {
  ssl: { rejectUnauthorized: false }
});

// Query emails with user info
const emails = await sql`
  SELECT
    en.id,
    en.status,
    en.error_message,
    en.template_key,
    en.created_at,
    u.email as user_email
  FROM email_notifications en
  LEFT JOIN users u ON en.user_id = u.id
  WHERE en.created_at > NOW() - INTERVAL '1 day'
  ORDER BY en.created_at DESC
  LIMIT 20
`;

console.log('Recent emails:');
console.log(JSON.stringify(emails, null, 2));

await sql.end();
