import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zgjwvovtsovkzuztgjvo.supabase.co";
const supabaseAnonKey = "sb_publishable_D3q9PBLCALwxxeF7xHO9iw_cLjXavj7";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
