import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://znfwwstvldaqyohpqxft.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZnd3c3R2bGRhcXlvaHBxeGZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDY1MjQ3NiwiZXhwIjoyMDQ2MjI4NDc2fQ.SeFmh6kMn8L0bv3dVw5RtKcg8cQzuH3-IOpIqKl7fh8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMembershipStatus() {
  const email = 'helena.is.always.testing@gmail.com';
  
  console.log(`\n🔍 Checking membership status for: ${email}\n`);
  
  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('id, email, first_name, last_name')
    .eq('email', email)
    .single();
    
  if (!user) {
    console.log('❌ User not found');
    return;
  }
  
  console.log('✅ User found:', user);
  
  // Check subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
    
  console.log('\n📋 Subscription:', subscription || 'None found');
  
  // Check allowance cycles
  const { data: allowances } = await supabase
    .from('allowance_cycles')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
    
  console.log('\n💳 Allowance Cycles:', allowances?.length || 0, 'found');
  if (allowances && allowances.length > 0) {
    console.log('Latest:', allowances[0]);
  }
  
  // Check if MEMBERSHIP_ACTIVATED notification was sent
  const { data: notifications } = await supabase
    .from('scheduled_notifications')
    .select('*')
    .eq('user_id', user.id)
    .eq('trigger_code', 'M1')
    .order('created_at', { ascending: false });
    
  console.log('\n📧 MEMBERSHIP_ACTIVATED Notifications:', notifications?.length || 0, 'found');
  if (notifications && notifications.length > 0) {
    console.log('Latest:', notifications[0]);
  }
}

checkMembershipStatus().catch(console.error);
