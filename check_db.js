require('dotenv').config();
const { supabase } = require('./config/supabase');

async function check() {
    const { data: insertData, error: insertError } = await supabase.from('projects').upsert([
        {
            whatsapp_group_id: 'test_group_id_123',
            group_name: 'Test Group',
            status: 'Unassigned',
            event_month: 'Unknown',
            created_at: new Date()
        }
    ]);
    if (insertError) {
        console.error("INSERT ERROR:", insertError.message);
    } else {
        console.log("INSERT SUCCESSFUL");
    }

    const { data, error } = await supabase.from('projects').select('*');
    if (error) {
        console.error("SELECT ERROR:", error.message);
    } else {
        console.log("TOTAL GROUPS IN DB:", data.length);
        console.log(data);
    }
}
check();
