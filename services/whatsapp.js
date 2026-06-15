const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { supabase } = require('../config/supabase');

let currentStatus = 'initializing';
let lastQR = null;
let activeGroupsList = [];
const profilePicCache = {};

const isSupabaseConfigured = () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    if (!url || !key) return false;
    if (url.includes('placeholder') || key.includes('placeholder')) return false;
    return true;
};

// Helper to perform Supabase queries with transient network retry
async function supabaseWithRetry(queryFn, retries = 3, delay = 1000) {
    if (!isSupabaseConfigured()) {
        return null;
    }
    for (let i = 0; i < retries; i++) {
        try {
            const result = await queryFn();
            if (result.error) throw result.error;
            return result.data;
        } catch (err) {
            if (i === retries - 1) throw err;
            console.warn(`Supabase operation failed, retrying in ${delay}ms... (${i + 1}/${retries}). Error: ${err.message}`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

function initializeWhatsApp(io) {
    console.log('Starting WhatsApp Engine...');
    
    if (io) {
        io.on('connection', (socket) => {
            console.log(`[Socket] New client connected: ${socket.id}`);
            socket.emit('current_status', { status: currentStatus, qr: lastQR });

            // Fetch messages for a specific group
            socket.on('get_chat_messages', async ({ chatId }) => {
                console.log(`[Socket] Received get_chat_messages for chatId: ${chatId}`);
                try {
                    console.log(`[Socket] Fetching chat for chatId: ${chatId}`);
                    const chat = await client.getChatById(chatId);
                    console.log(`[Socket] Chat object obtained: ${chat.name || chat.id.user}. Fetching messages...`);
                    const messages = await chat.fetchMessages({ limit: 50 });
                    console.log(`[Socket] Fetched ${messages.length} messages for chatId: ${chatId}`);
                    
                    const formatted = [];
                    for (const msg of messages) {
                        const msgData = {
                            id: msg.id._serialized,
                            body: msg.body,
                            timestamp: msg.timestamp,
                            from: msg.from,
                            fromMe: msg.fromMe,
                            senderName: msg._data?.notifyName || msg.author || 'User',
                            hasMedia: msg.hasMedia,
                            ack: msg.ack
                        };
                        try {
                            if (msg.hasQuotedMsg) {
                                const quoted = await msg.getQuotedMessage();
                                if (quoted) {
                                    msgData.quotedBody = quoted.body;
                                    msgData.quotedSender = quoted._data?.notifyName || quoted.author || 'User';
                                }
                            }
                        } catch (e) {}
                        formatted.push(msgData);
                    }
                    console.log(`[Socket] Sending chat_messages_response with ${formatted.length} messages to client`);
                    socket.emit('chat_messages_response', { chatId, messages: formatted });
                } catch (err) {
                    console.error(`[Socket] Error fetching messages for ${chatId}:`, err.message);
                    socket.emit('chat_messages_response', { chatId, messages: [], error: err.message });
                }
            });

            // Send a message
            socket.on('send_chat_message', async ({ chatId, text, quotedMessageId }) => {
                console.log(`[Socket] Received send_chat_message to chatId: ${chatId}`);
                try {
                    const chat = await client.getChatById(chatId);
                    const options = {};
                    if (quotedMessageId) {
                        options.quotedMessageId = quotedMessageId;
                    }
                    const sentMsg = await chat.sendMessage(text, options);
                    
                    const formatted = {
                        id: sentMsg.id._serialized,
                        body: sentMsg.body,
                        timestamp: sentMsg.timestamp,
                        from: sentMsg.from,
                        fromMe: sentMsg.fromMe,
                        senderName: 'Me',
                        hasMedia: sentMsg.hasMedia,
                        ack: sentMsg.ack
                    };
                    try {
                        if (sentMsg.hasQuotedMsg) {
                            const quoted = await sentMsg.getQuotedMessage();
                            if (quoted) {
                                formatted.quotedBody = quoted.body;
                                formatted.quotedSender = quoted._data?.notifyName || quoted.author || 'User';
                            }
                        }
                    } catch (e) {}
                    socket.emit('send_chat_message_success', { chatId, message: formatted });
                } catch (err) {
                    console.error(`[Socket] Error sending message to ${chatId}:`, err.message);
                    socket.emit('send_chat_message_error', { chatId, error: err.message });
                }
            });

            // Fetch group participants
            socket.on('get_group_participants', async ({ chatId }) => {
                try {
                    const chat = await client.getChatById(chatId);
                    if (chat.isGroup) {
                        const participants = chat.participants;
                        const formatted = [];
                        for (const p of participants) {
                            try {
                                const contact = await client.getContactById(p.id._serialized);
                                formatted.push({
                                    phone: p.id.user,
                                    savedName: contact.name || '',
                                    displayName: contact.pushname || '',
                                    isAdmin: p.isAdmin || p.isSuperAdmin || false
                                });
                            } catch (err) {
                                formatted.push({
                                    phone: p.id.user,
                                    savedName: '',
                                    displayName: '',
                                    isAdmin: p.isAdmin || p.isSuperAdmin || false
                                });
                            }
                        }
                        socket.emit('group_participants_response', { chatId, participants: formatted });
                    } else {
                        socket.emit('group_participants_response', { chatId, participants: [], error: 'Not a group chat' });
                    }
                } catch (err) {
                    console.error("Error fetching group participants:", err.message);
                    socket.emit('group_participants_response', { chatId, participants: [], error: err.message });
                }
            });

            // Fetch all projects/groups (bypassing client RLS)
            socket.on('get_projects', async () => {
                try {
                    let filteredProjects = [];
                    if (isSupabaseConfigured()) {
                        const data = await supabaseWithRetry(() => 
                            supabase
                                .from('projects')
                                .select('*')
                                .order('created_at', { ascending: false })
                        );
                        filteredProjects = data || [];
                        if (currentStatus === 'ready' && activeGroupsList.length > 0) {
                            filteredProjects = filteredProjects.filter(proj => activeGroupsList.includes(proj.whatsapp_group_id));
                        }
                    } else if (currentStatus === 'ready') {
                        // Supabase is offline/mock, but WhatsApp is ready.
                        // Resolve chats dynamically from active WhatsApp connection!
                        try {
                            const chats = await client.getChats();
                            filteredProjects = chats.map(chat => {
                                const chatName = chat.name || chat.id.user;
                                return {
                                    id: chat.id._serialized,
                                    whatsapp_group_id: chat.id._serialized,
                                    group_name: chatName,
                                    status: 'Unassigned',
                                    event_month: chat.isGroup ? (extractDateFallback(chatName) || 'Unknown') : 'Direct Chat',
                                    created_at: new Date()
                                };
                            });
                        } catch (e) {
                            console.error("Error fetching chats for fallback projects_response:", e.message);
                        }
                    }
                    
                    socket.emit('projects_response', { projects: filteredProjects });
                } catch (err) {
                    console.error("Error fetching projects for socket:", err.message);
                    socket.emit('projects_response', { projects: [], error: err.message });
                }
            });

            // Update a project/group (bypassing client RLS)
            socket.on('update_project', async ({ jid, status, event_month }) => {
                try {
                    const data = await supabaseWithRetry(() => 
                        supabase
                            .from('projects')
                            .update({ status, event_month })
                            .eq('whatsapp_group_id', jid)
                            .select()
                    );
                    
                    socket.emit('update_project_success', { 
                        jid, 
                        project: data && data.length > 0 ? data[0] : { whatsapp_group_id: jid, status, event_month } 
                    });
                } catch (err) {
                    console.error("Error updating project for socket:", err.message);
                    socket.emit('update_project_error', { jid, error: err.message });
                }
            });

            // Disconnect/Logout WhatsApp client
            socket.on('disconnect_whatsapp', async () => {
                try {
                    console.log('Logging out WhatsApp client...');
                    await client.logout();
                    currentStatus = 'waiting_qr';
                    lastQR = null;
                    activeGroupsList = [];
                    io.emit('whatsapp_disconnected');
                } catch (err) {
                    console.error("Error logging out WhatsApp client:", err.message);
                    socket.emit('disconnect_whatsapp_error', { error: err.message });
                }
            });

            // Fetch chat media on-demand (keeps message loading extremely fast)
            socket.on('get_chat_media', async ({ messageId }) => {
                try {
                    console.log('Downloading media for message:', messageId);
                    const message = await client.getMessageById(messageId);
                    if (message && message.hasMedia) {
                        const media = await message.downloadMedia();
                        socket.emit('chat_media_response', { 
                            messageId, 
                            media: {
                                mimetype: media.mimetype,
                                data: media.data, // base64 data
                                filename: media.filename
                            } 
                        });
                    } else {
                        socket.emit('chat_media_response', { messageId, error: 'Message has no media' });
                    }
                } catch (err) {
                    console.error("Error downloading media:", err.message);
                    socket.emit('chat_media_response', { messageId, error: err.message });
                }
            });

            // Send media file message
            socket.on('send_chat_media', async ({ chatId, base64Data, filename, mimetype, caption }) => {
                try {
                    const { MessageMedia } = require('whatsapp-web.js');
                    const cleanBase64 = base64Data.split(',').pop();
                    const media = new MessageMedia(mimetype, cleanBase64, filename);
                    
                    const chat = await client.getChatById(chatId);
                    const sentMsg = await chat.sendMessage(media, { caption });
                    
                    const formatted = {
                        id: sentMsg.id._serialized,
                        body: sentMsg.body || filename,
                        timestamp: sentMsg.timestamp,
                        from: sentMsg.from,
                        fromMe: sentMsg.fromMe,
                        senderName: 'Me',
                        hasMedia: true
                    };
                    socket.emit('send_chat_message_success', { chatId, message: formatted });
                } catch (err) {
                    console.error("Error sending media message:", err.message);
                    socket.emit('send_chat_message_error', { chatId, error: err.message });
                }
            });

            // Fetch database-backed pinned notes for a group
            socket.on('get_pinned_notes', async ({ chatId }) => {
                try {
                    const data = await supabaseWithRetry(() => 
                        supabase
                            .from('pinned_notes')
                            .select('*')
                            .eq('whatsapp_group_id', chatId)
                            .order('created_at', { ascending: true })
                    );
                    socket.emit('pinned_notes_response', { chatId, notes: data || [] });
                } catch (err) {
                    console.error("Error fetching pinned notes:", err.message);
                    // Safe fallback to localStorage representation to prevent crashes
                    socket.emit('pinned_notes_response', { chatId, notes: [], error: err.message });
                }
            });

            // Add persistent pinned note
            socket.on('add_pinned_note', async ({ chatId, content }) => {
                try {
                    const data = await supabaseWithRetry(() => 
                        supabase
                            .from('pinned_notes')
                            .insert([{ whatsapp_group_id: chatId, content }])
                            .select()
                    );
                    
                    if (data && data.length > 0) {
                        io.emit('pinned_note_added', { chatId, note: data[0] });
                    } else {
                        // Emit mock note for local fallback state
                        const mockNote = {
                            id: 'mock-' + Date.now(),
                            whatsapp_group_id: chatId,
                            content,
                            created_at: new Date().toISOString()
                        };
                        io.emit('pinned_note_added', { chatId, note: mockNote });
                    }
                } catch (err) {
                    console.error("Error adding pinned note:", err.message);
                    socket.emit('pinned_note_error', { error: err.message });
                }
            });

            // Delete persistent pinned note
            socket.on('delete_pinned_note', async ({ noteId, chatId }) => {
                try {
                    await supabaseWithRetry(() => 
                        supabase
                            .from('pinned_notes')
                            .delete()
                            .eq('id', noteId)
                    );
                    io.emit('pinned_note_deleted', { chatId, noteId });
                } catch (err) {
                    console.error("Error deleting pinned note:", err.message);
                    socket.emit('pinned_note_error', { error: err.message });
                }
            });

            // Fetch profile picture URL dynamically
            socket.on('get_profile_pic', async ({ chatId }) => {
                try {
                    if (profilePicCache[chatId]) {
                        socket.emit('profile_pic_response', { chatId, url: profilePicCache[chatId] });
                        return;
                    }
                    const url = await client.getProfilePicUrl(chatId);
                    profilePicCache[chatId] = url || 'no_pic';
                    socket.emit('profile_pic_response', { chatId, url: url || 'no_pic' });
                } catch (err) {
                    profilePicCache[chatId] = 'no_pic';
                    socket.emit('profile_pic_response', { chatId, url: 'no_pic' });
                }
            });

            // Fetch online status of a contact
            socket.on('get_online_status', async ({ chatId }) => {
                try {
                    const contact = await client.getContactById(chatId);
                    const presence = await contact.getPresence();
                    socket.emit('online_status_response', { 
                        chatId, 
                        isOnline: presence.isOnline,
                        lastSeen: presence.lastSeen || null
                    });
                } catch (err) {
                    socket.emit('online_status_response', { chatId, isOnline: false });
                }
            });
        });
    }

    const client = new Client({
        authStrategy: new LocalAuth(),
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html'
        },
        puppeteer: {
            headless: true,
            ...(process.platform === 'win32' ? {
                executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
            } : {}),
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            protocolTimeout: 300000
        }
    });

    client.on('qr', (qr) => {
        currentStatus = 'waiting_qr';
        lastQR = qr;
        console.log('\n=========================================');
        console.log('📱 Scan this QR code with your phone (Linked Devices):');
        console.log('=========================================\n');
        qrcode.generate(qr, { small: true });
        if (io) {
            io.emit('qr_code', qr);
        }
    });

    client.on('authenticated', () => {
        currentStatus = 'authenticated';
        lastQR = null;
        console.log('AUTHENTICATED');
        if (io) io.emit('whatsapp_authenticated');
    });

    client.on('disconnected', (reason) => {
        currentStatus = 'disconnected';
        lastQR = null;
        console.log('Client was logged out', reason);
        if (io) io.emit('whatsapp_disconnected');
    });

    client.on('ready', () => {
        currentStatus = 'ready';
        console.log('\n✅ WhatsApp Client is Ready! Successfully connected.\n');
        if (io) io.emit('whatsapp_ready');
        
        // Delay fetching chats to ensure WhatsApp Web is fully hydrated and prevent hanging
        console.log('Waiting 10 seconds before syncing groups...');
        setTimeout(() => syncGroups(client, io), 10000);
    });

    client.on('message_create', async (msg) => {
        try {
            const chat = await msg.getChat();
            const jid = chat.id._serialized;
            if (!activeGroupsList.includes(jid)) {
                activeGroupsList.push(jid);
            }
            
            let chatName = chat.name;
            if (!chat.isGroup && (!chatName || /^\d+$/.test(chatName.replace(/[\s+-]/g, '')))) {
                try {
                    const contact = await chat.getContact();
                    chatName = contact.name || contact.pushname || chatName || contact.number;
                } catch (err) {
                    // ignore
                }
            }

            // Sync chat metadata in Supabase
            const chatData = {
                whatsapp_group_id: jid,
                group_name: chatName || jid.split('@')[0],
                status: 'Unassigned',
                event_month: chat.isGroup ? (extractDateFallback(chat.name) || 'Unknown') : 'Direct Chat',
                created_at: new Date()
            };

            if (isSupabaseConfigured()) {
                await supabaseWithRetry(() => 
                    supabase.from('projects').upsert([chatData], { onConflict: 'whatsapp_group_id' })
                );
            }

            // Stream message to connected clients
            const msgData = {
                id: msg.id._serialized,
                body: msg.body,
                timestamp: msg.timestamp,
                from: msg.from,
                fromMe: msg.fromMe,
                senderName: msg.fromMe ? 'Me' : (msg._data?.notifyName || chatName || 'User'),
                hasMedia: msg.hasMedia,
                ack: msg.ack
            };
            try {
                if (msg.hasQuotedMsg) {
                    const quoted = await msg.getQuotedMessage();
                    if (quoted) {
                        msgData.quotedBody = quoted.body;
                        msgData.quotedSender = quoted._data?.notifyName || quoted.author || 'User';
                    }
                }
            } catch (e) {}
            if (io) {
                io.emit('incoming_message', { chatId: jid, message: msgData });
            }
        } catch (err) {
            // silent catch
        }
    });

    client.on('chat_state_changed', (chatState) => {
        if (io) {
            io.emit('typing_status', { 
                chatId: chatState.chatId._serialized, 
                isTyping: chatState.state === 'typing' 
            });
        }
    });

    client.on('message_ack', (msg, ack) => {
        if (io) {
            const myJid = client.info && client.info.wid ? client.info.wid._serialized : null;
            const chatId = (myJid && msg.to === myJid) ? msg.from : msg.to;
            io.emit('message_ack', { 
                chatId, 
                messageId: msg.id._serialized, 
                ack 
            });
        }
    });

    client.initialize();
}

async function syncGroups(client, io) {
    console.log('Fetching existing chats to sync chats... (This might take a minute)');
    try {
        // Adding a fallback timeout so it doesn't hang forever
        const chatsPromise = client.getChats();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout fetching chats')), 240000));
        
        const chats = await Promise.race([chatsPromise, timeoutPromise]);
        
        console.log(`Successfully fetched ${chats.length} total chats.`);
        
        const radheMatches = chats.filter(c => c.name && c.name.toLowerCase().includes("shree radhe"));
        console.log("[Debug] Shree Radhe matches:", radheMatches.map(c => ({ id: c.id._serialized, name: c.name, isGroup: c.isGroup })));
        
        // Populate the active groups list in memory
        activeGroupsList = chats.map(c => c.id._serialized);
        
        console.log(`Found ${chats.length} active chats. Syncing data...`);
        
        const chatDataArray = [];
        for (const chat of chats) {
            const chatName = chat.name || chat.id.user;
            const chatData = {
                whatsapp_group_id: chat.id._serialized,
                group_name: chatName,
                status: 'Unassigned',
                event_month: chat.isGroup ? (extractDateFallback(chatName) || 'Unknown') : 'Direct Chat',
                created_at: new Date()
            };
            chatDataArray.push(chatData);
        }

        let syncedCount = chats.length;
        
        if (isSupabaseConfigured() && chatDataArray.length > 0) {
            try {
                // Batch upsert all chats in a single request (highly efficient)
                await supabaseWithRetry(() => 
                    supabase
                        .from('projects')
                        .upsert(chatDataArray, { onConflict: 'whatsapp_group_id' })
                );
            } catch (err) {
                console.error(`Supabase Sync Error:`, err.message);
            }
        } else {
            console.log("⚠️ Database is in mock fallback state (Placeholder credentials). Supabase sync skipped.");
        }
        
        console.log(`✅ Chat Sync Complete. Synced ${syncedCount} chats.`);
        
        // Push newly filtered chats to all connected clients
        try {
            let projects = [];
            if (isSupabaseConfigured()) {
                const data = await supabaseWithRetry(() => 
                    supabase
                        .from('projects')
                        .select('*')
                        .order('created_at', { ascending: false })
                );
                projects = data || [];
            }
            
            const filtered = projects.filter(proj => activeGroupsList.includes(proj.whatsapp_group_id));
            if (io) {
                io.emit('projects_response', { projects: filtered });
                io.emit('groups_synced', { count: syncedCount });
            }
        } catch (err) {
            console.error("Error emitting projects after sync:", err.message);
            if (io) io.emit('groups_synced', { count: syncedCount });
        }
    } catch (error) {
        console.error('⚠️ Warning: Could not fetch initial chats. Error:', error.message);
    }
}

function extractDateFallback(text) {
    if (!text) return null;
    // Basic regex to look for months in the group name (e.g. "Rahul Weds Anjali 24 Nov")
    const regex = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{2,4}|\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;
    const match = text.match(regex);
    return match ? match[0] : null;
}

module.exports = { initializeWhatsApp };
