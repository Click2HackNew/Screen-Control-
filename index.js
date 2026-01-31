// Add this section after your imports
const iconDatabase = {
    // App Icons
    whatsapp: { 
        color: '#25D366', 
        text: 'WA', 
        emoji: '💬',
        icon: 'https://img.icons8.com/color/96/000000/whatsapp--v1.png'
    },
    facebook: { 
        color: '#1877F2', 
        text: 'FB', 
        emoji: '👥',
        icon: 'https://img.icons8.com/color/96/000000/facebook-new.png'
    },
    instagram: { 
        color: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', 
        text: 'IG', 
        emoji: '📸',
        icon: 'https://img.icons8.com/color/96/000000/instagram-new--v1.png'
    },
    youtube: { 
        color: '#FF0000', 
        text: 'YT', 
        emoji: '🎬',
        icon: 'https://img.icons8.com/color/96/000000/youtube-play.png'
    },
    chrome: { 
        color: '#4285F4', 
        text: 'GC', 
        emoji: '🌐',
        icon: 'https://img.icons8.com/color/96/000000/google-chrome--v1.png'
    },
    gmail: { 
        color: '#EA4335', 
        text: 'GM', 
        emoji: '📧',
        icon: 'https://img.icons8.com/color/96/000000/gmail--v1.png'
    },
    file_manager: { 
        color: '#009688', 
        text: 'FM', 
        emoji: '📁',
        icon: 'https://img.icons8.com/color/96/000000/folder-invoices--v1.png'
    },
    gallery: { 
        color: '#795548', 
        text: 'GL', 
        emoji: '🖼️',
        icon: 'https://img.icons8.com/color/96/000000/gallery.png'
    },
    camera: { 
        color: '#795548', 
        text: 'CM', 
        emoji: '📷',
        icon: 'https://img.icons8.com/color/96/000000/camera--v1.png'
    },
    settings: { 
        color: '#607D8B', 
        text: 'ST', 
        emoji: '⚙️',
        icon: 'https://img.icons8.com/color/96/000000/settings--v1.png'
    },
    phone: { 
        color: '#4CAF50', 
        text: 'PH', 
        emoji: '📞',
        icon: 'https://img.icons8.com/color/96/000000/phone--v1.png'
    },
    messages: { 
        color: '#03A9F4', 
        text: 'MSG', 
        emoji: '💬',
        icon: 'https://img.icons8.com/color/96/000000/sms.png'
    },
    calculator: { 
        color: '#FF9800', 
        text: 'CAL', 
        emoji: '📱',
        icon: 'https://img.icons8.com/color/96/000000/calculator--v1.png'
    },
    clock: { 
        color: '#9C27B0', 
        text: 'CLK', 
        emoji: '⏰',
        icon: 'https://img.icons8.com/color/96/000000/clock--v1.png'
    },
    calendar: { 
        color: '#E91E63', 
        text: 'CAL', 
        emoji: '📅',
        icon: 'https://img.icons8.com/color/96/000000/calendar--v1.png'
    },
    
    // Folder Icons
    folder_download: { 
        color: '#FFC107', 
        text: 'DL', 
        emoji: '📥',
        icon: 'https://img.icons8.com/color/96/000000/downloads-folder.png'
    },
    folder_document: { 
        color: '#9E9E9E', 
        text: 'DOC', 
        emoji: '📄',
        icon: 'https://img.icons8.com/color/96/000000/documents.png'
    },
    folder_image: { 
        color: '#2196F3', 
        text: 'IMG', 
        emoji: '🖼️',
        icon: 'https://img.icons8.com/color/96/000000/pictures-folder.png'
    },
    folder_video: { 
        color: '#4CAF50', 
        text: 'VID', 
        emoji: '🎬',
        icon: 'https://img.icons8.com/color/96/000000/video-folder.png'
    },
    folder_music: { 
        color: '#9C27B0', 
        text: 'MUS', 
        emoji: '🎵',
        icon: 'https://img.icons8.com/color/96/000000/music-folder.png'
    },
    
    // UI Elements
    ui_button: { 
        color: '#4285F4', 
        text: 'BTN', 
        emoji: '🔘'
    },
    ui_back: { 
        color: 'transparent', 
        text: '←', 
        emoji: '←'
    },
    ui_home: { 
        color: 'transparent', 
        text: '⌂', 
        emoji: '⌂'
    },
    ui_menu: { 
        color: 'transparent', 
        text: '☰', 
        emoji: '☰'
    },
    ui_search: { 
        color: '#F5F5F5', 
        text: '🔍', 
        emoji: '🔍'
    },
    ui_share: { 
        color: '#FFC107', 
        text: '📤', 
        emoji: '📤'
    },
    ui_delete: { 
        color: '#F44336', 
        text: '🗑️', 
        emoji: '🗑️'
    },
    ui_edit: { 
        color: '#2196F3', 
        text: '✏️', 
        emoji: '✏️'
    },
    ui_save: { 
        color: '#4CAF50', 
        text: '💾', 
        emoji: '💾'
    },
    ui_send: { 
        color: '#9C27B0', 
        text: '📨', 
        emoji: '📨'
    },
    ui_add: { 
        color: '#009688', 
        text: '➕', 
        emoji: '➕'
    }
};

// AI Detection Function
function detectElementAI(text, className, properties) {
    if (!text) text = '';
    const lowerText = text.toLowerCase();
    
    // App detection
    if (lowerText.includes('whatsapp')) return 'whatsapp';
    if (lowerText.includes('facebook') || lowerText.includes('fb')) return 'facebook';
    if (lowerText.includes('instagram') || lowerText.includes('insta')) return 'instagram';
    if (lowerText.includes('youtube') || lowerText.includes('yt')) return 'youtube';
    if (lowerText.includes('chrome') || lowerText.includes('browser')) return 'chrome';
    if (lowerText.includes('gmail') || lowerText.includes('mail') || lowerText.includes('email')) return 'gmail';
    if (lowerText.includes('file') || lowerText.includes('files')) return 'file_manager';
    if (lowerText.includes('gallery') || lowerText.includes('photos')) return 'gallery';
    if (lowerText.includes('camera')) return 'camera';
    if (lowerText.includes('settings') || lowerText.includes('setting')) return 'settings';
    if (lowerText.includes('phone') || lowerText.includes('dialer') || lowerText.includes('call')) return 'phone';
    if (lowerText.includes('messages') || lowerText.includes('sms')) return 'messages';
    if (lowerText.includes('calculator') || lowerText.includes('calc')) return 'calculator';
    if (lowerText.includes('clock') || lowerText.includes('alarm')) return 'clock';
    if (lowerText.includes('calendar')) return 'calendar';
    
    // Folder detection
    if (lowerText.includes('download')) return 'folder_download';
    if (lowerText.includes('document') || lowerText.includes('doc')) return 'folder_document';
    if (lowerText.includes('picture') || lowerText.includes('image') || lowerText.includes('photo') || lowerText.includes('dcim')) return 'folder_image';
    if (lowerText.includes('video') || lowerText.includes('movie')) return 'folder_video';
    if (lowerText.includes('music') || lowerText.includes('audio') || lowerText.includes('song')) return 'folder_music';
    
    // UI Elements
    if (lowerText.includes('back') || text === '←') return 'ui_back';
    if (lowerText.includes('home') || text === '⌂') return 'ui_home';
    if (lowerText.includes('menu') || text === '☰') return 'ui_menu';
    if (lowerText.includes('search') || text === '🔍') return 'ui_search';
    if (lowerText.includes('share') || text === '📤') return 'ui_share';
    if (lowerText.includes('delete') || text === '🗑️') return 'ui_delete';
    if (lowerText.includes('edit') || text === '✏️') return 'ui_edit';
    if (lowerText.includes('save') || text === '💾') return 'ui_save';
    if (lowerText.includes('send') || text === '📨') return 'ui_send';
    if (lowerText.includes('add') || text === '➕' || lowerText.includes('new')) return 'ui_add';
    
    // By properties
    if (properties.clickable && properties.checkable) {
        return properties.checked ? 'checkbox_checked' : 'checkbox';
    }
    if (properties.clickable) return 'ui_button';
    if (properties.editable) return 'input';
    
    return 'text';
}

// Socket event handler में add करें
socket.on('live_screen', (data) => {
    // AI Processing
    if (data.detectedElements) {
        data.detectedElements = data.detectedElements.map(element => {
            const detectedType = detectElementAI(
                element.text || element.desc || '',
                element.class || '',
                {
                    clickable: element.clickable || false,
                    editable: element.editable || false,
                    checkable: element.checkable || false,
                    checked: element.checked || false
                }
            );
            
            element.detectedType = detectedType;
            element.iconInfo = iconDatabase[detectedType] || { 
                color: '#E0E0E0', 
                text: element.text ? element.text.substring(0, 2) : '??', 
                emoji: '❓'
            };
            
            return element;
        });
    }
    
    adminSockets.forEach((admin, adminId) => {
        if (io.sockets.sockets.get(adminId)?.connected) {
            io.to(adminId).emit('live_screen', data);
        }
    });
});
