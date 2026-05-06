// newtab.js

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Wallpaper Background ---
    initWallpaper();

    // --- 2. Dock Magnification Effect ---
    initDockEffect();

    // --- 3. Sliding Tool Panel ---
    initToolPanel();

    // --- 4. Speed Dial Shortcuts ---
    initSpeedDial();
});

const PRESET_WALLPAPERS = [

    // Abstract
];

function initWallpaper() {
    const bgContainer = document.getElementById('background-container');
    const toggleBtn = document.getElementById('wallpaper-toggle');
    const thumbnailsContainer = document.getElementById('wallpaper-thumbnails');
    // IndexedDB wrapper
    function openDB() {
        return new Promise((resolve, reject) => {
            console.log('IndexedDB: Opening WallpaperDB v2');
            const request = indexedDB.open('WallpaperDB', 2);

            request.onupgradeneeded = (e) => {
                console.log('IndexedDB: Upgrade needed, creating stores');
                const db = e.target.result;
                if (!db.objectStoreNames.contains('wallpapers')) {
                    db.createObjectStore('wallpapers', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('videoWallpapers')) {
                    db.createObjectStore('videoWallpapers', { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = (e) => {
                console.log('IndexedDB: Opened successfully');
                resolve(e.target.result);
            };

            request.onerror = (e) => {
                console.error('IndexedDB: Error opening DB', e);
                reject(e.target.error);
            };
        });
    }

    async function saveWallpaper(base64) {
        try {
            console.log('IndexedDB: Generating thumbnail');
            const thumbnail = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 60;
                    canvas.height = 60;
                    const ctx = canvas.getContext('2d');

                    const size = Math.min(img.width, img.height);
                    const sx = (img.width - size) / 2;
                    const sy = (img.height - size) / 2;
                    ctx.drawImage(img, sx, sy, size, size, 0, 0, 60, 60);

                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
                img.src = base64;
            });

            console.log('IndexedDB: Saving wallpaper');
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('wallpapers', 'readwrite');
                const store = tx.objectStore('wallpapers');

                const request = store.add({
                    data: base64,
                    thumbnail: thumbnail,
                    timestamp: Date.now()
                });

                request.onsuccess = () => resolve(request.result);
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (e) {
            console.error('IndexedDB: Save failed', e);
        }
    }

    async function getAllWallpapers() {
        try {
            console.log('IndexedDB: Getting all wallpapers');
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('wallpapers', 'readonly');
                const store = tx.objectStore('wallpapers');
                const request = store.getAll();

                request.onsuccess = () => resolve(request.result);
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (e) {
            console.error('IndexedDB: Get all failed', e);
            return [];
        }
    }

    async function deleteWallpaper(id) {
        try {
            console.log('IndexedDB: Deleting wallpaper', id);
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('wallpapers', 'readwrite');
                const store = tx.objectStore('wallpapers');
                const request = store.delete(id);

                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (e) {
            console.error('IndexedDB: Delete failed', e);
        }
    }

    let userWallpapersDB = [];
    let userVideoWallpapersDB = [];

    // ── Video wallpaper IndexedDB helpers ────────────────────────────────

    async function saveVideoWallpaper(blob) {
        try {
            console.log('IndexedDB: Generating video thumbnail');
            const thumbnail = await new Promise((resolve, reject) => {
                const tempVideo = document.createElement('video');
                tempVideo.preload = 'metadata';
                tempVideo.muted = true;
                tempVideo.playsInline = true;

                const objectUrl = URL.createObjectURL(blob);
                tempVideo.src = objectUrl;

                tempVideo.addEventListener('loadeddata', () => {
                    tempVideo.currentTime = Math.min(1, tempVideo.duration / 2);
                });

                tempVideo.addEventListener('seeked', () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 60;
                    canvas.height = 60;
                    const ctx = canvas.getContext('2d');

                    const vw = tempVideo.videoWidth;
                    const vh = tempVideo.videoHeight;
                    const size = Math.min(vw, vh);
                    const sx = (vw - size) / 2;
                    const sy = (vh - size) / 2;
                    ctx.drawImage(tempVideo, sx, sy, size, size, 0, 0, 60, 60);

                    URL.revokeObjectURL(objectUrl);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                });

                tempVideo.addEventListener('error', () => {
                    URL.revokeObjectURL(objectUrl);
                    reject(new Error('Failed to load video for thumbnail'));
                });

                tempVideo.load();
            });

            console.log('IndexedDB: Saving video wallpaper');
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('videoWallpapers', 'readwrite');
                const store = tx.objectStore('videoWallpapers');
                const request = store.add({
                    blob: blob,
                    thumbnail: thumbnail,
                    timestamp: Date.now()
                });
                request.onsuccess = () => resolve(request.result);
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (e) {
            console.error('IndexedDB: Video save failed', e);
        }
    }

    async function getAllVideoWallpapers() {
        try {
            console.log('IndexedDB: Getting all video wallpapers');
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('videoWallpapers', 'readonly');
                const store = tx.objectStore('videoWallpapers');
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (e) {
            console.error('IndexedDB: Get all videos failed', e);
            return [];
        }
    }

    async function getVideoWallpaper(id) {
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('videoWallpapers', 'readonly');
                const store = tx.objectStore('videoWallpapers');
                const request = store.get(id);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (e) {
            console.error('IndexedDB: Get video failed', e);
            return null;
        }
    }

    async function deleteVideoWallpaper(id) {
        try {
            console.log('IndexedDB: Deleting video wallpaper', id);
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('videoWallpapers', 'readwrite');
                const store = tx.objectStore('videoWallpapers');
                const request = store.delete(id);
                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (e) {
            console.error('IndexedDB: Video delete failed', e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────

    // References for active video object URL (to revoke when switching)
    let activeVideoObjectUrl = null;
    const videoEl = document.getElementById('video-wallpaper');

    // Load saved background or set default
    chrome.storage.local.get(['wallpaperType', 'wallpaperUrl', 'videoWallpaperId'], async (result) => {
        userWallpapersDB = await getAllWallpapers();
        userVideoWallpapersDB = await getAllVideoWallpapers();

        if (result.wallpaperType === 'video' && result.videoWallpaperId != null) {
            await setVideoWallpaper(result.videoWallpaperId, false);
            renderImageThumbnails(result.wallpaperUrl || null);
            renderVideoThumbnails(result.videoWallpaperId);
        } else {
            const savedUrl = result.wallpaperUrl || PRESET_WALLPAPERS[0];
            setWallpaper(savedUrl, false);
            renderImageThumbnails(savedUrl);
            renderVideoThumbnails(null);
        }
    });

    // Toggle picker
    toggleBtn.addEventListener('click', () => {
        thumbnailsContainer.classList.toggle('hidden');
    });

    // Close picker when clicking outside
    document.addEventListener('click', (e) => {
        if (!toggleBtn.contains(e.target) && !thumbnailsContainer.contains(e.target)) {
            thumbnailsContainer.classList.add('hidden');
        }
    });

    // Tab switching
    const tabImage = document.getElementById('wp-tab-image');
    const tabLive = document.getElementById('wp-tab-live');
    const sectionImage = document.getElementById('wp-section-image');
    const sectionLive = document.getElementById('wp-section-live');

    tabImage.addEventListener('click', () => {
        tabImage.classList.add('active');
        tabLive.classList.remove('active');
        sectionImage.style.display = 'flex';
        sectionLive.style.display = 'none';
    });

    tabLive.addEventListener('click', () => {
        tabLive.classList.add('active');
        tabImage.classList.remove('active');
        sectionLive.style.display = 'flex';
        sectionImage.style.display = 'none';
    });

    const uploadInput = document.getElementById('wallpaper-upload-input');
    uploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Url = event.target.result;

            await saveWallpaper(base64Url);
            userWallpapersDB = await getAllWallpapers();

            setWallpaper(base64Url);
            renderImageThumbnails(base64Url);
            uploadInput.value = '';
        };
        reader.readAsDataURL(file);
    });

    // Video upload handler
    const videoUploadInput = document.getElementById('video-upload-input');
    videoUploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const newId = await saveVideoWallpaper(file);
        userVideoWallpapersDB = await getAllVideoWallpapers();

        if (newId != null) {
            await setVideoWallpaper(newId);
            renderVideoThumbnails(newId);
        }
        videoUploadInput.value = '';
    });


    function setWallpaper(url, persist = true) {
        // Hide video wallpaper, restore image background
        videoEl.style.display = 'none';
        videoEl.pause();
        videoEl.src = '';
        if (activeVideoObjectUrl) {
            URL.revokeObjectURL(activeVideoObjectUrl);
            activeVideoObjectUrl = null;
        }
        bgContainer.style.backgroundImage = `url('${url}')`;
        bgContainer.style.display = '';
        if (persist) {
            chrome.storage.local.set({ wallpaperType: 'image', wallpaperUrl: url });
        }
        updateSelectedThumbnail(url);
    }

    async function setVideoWallpaper(id, persist = true) {
        const record = await getVideoWallpaper(id);
        if (!record) { console.warn('Video wallpaper not found:', id); return; }

        // Revoke previous object URL
        if (activeVideoObjectUrl) {
            URL.revokeObjectURL(activeVideoObjectUrl);
        }
        activeVideoObjectUrl = URL.createObjectURL(record.blob);

        videoEl.src = activeVideoObjectUrl;
        videoEl.style.display = 'block';
        videoEl.play().catch(() => { });

        // Hide static image background
        bgContainer.style.backgroundImage = 'none';

        if (persist) {
            chrome.storage.local.set({ wallpaperType: 'video', videoWallpaperId: id });
        }
        updateSelectedVideoThumbnail(id);
    }

    function renderImageThumbnails(currentUrl) {
        sectionImage.innerHTML = '';

        // Add upload button
        const uploadThumb = document.createElement('div');
        uploadThumb.className = 'thumbnail upload-btn';
        uploadThumb.title = 'Upload Local Image';
        uploadThumb.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>';

        uploadThumb.addEventListener('click', () => {
            document.getElementById('wallpaper-upload-input').click();
        });
        sectionImage.appendChild(uploadThumb);

        // Render user image uploads
        userWallpapersDB.forEach((record) => {
            const thumb = document.createElement('div');
            thumb.className = 'thumbnail user-thumb';
            thumb.dataset.url = record.data;
            if (record.data === currentUrl) thumb.classList.add('selected');

            const img = document.createElement('img');
            img.src = record.thumbnail;
            thumb.appendChild(img);

            const delBtn = document.createElement('div');
            delBtn.className = 'thumb-delete-btn';
            delBtn.textContent = '×';
            delBtn.title = 'Remove';
            delBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await deleteWallpaper(record.id);
                userWallpapersDB = await getAllWallpapers();
                renderImageThumbnails(currentUrl);
            });
            thumb.appendChild(delBtn);

            thumb.addEventListener('click', () => {
                setWallpaper(record.data);
                updateSelectedThumbnail(record.data);
            });

            sectionImage.appendChild(thumb);
        });

        PRESET_WALLPAPERS.forEach(url => {
            const thumb = document.createElement('div');
            thumb.className = 'thumbnail';
            thumb.dataset.url = url;
            if (url === currentUrl) thumb.classList.add('selected');

            const img = document.createElement('img');
            img.src = url;
            thumb.appendChild(img);

            thumb.addEventListener('click', () => {
                setWallpaper(url);
            });

            sectionImage.appendChild(thumb);
        });
    }

    function renderVideoThumbnails(currentVideoId) {
        sectionLive.innerHTML = '';

        // Add video upload button
        const uploadThumb = document.createElement('div');
        uploadThumb.className = 'thumbnail upload-btn';
        uploadThumb.title = 'Upload Video (.mp4 or .webm)';
        uploadThumb.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>';
        uploadThumb.addEventListener('click', () => {
            document.getElementById('video-upload-input').click();
        });
        sectionLive.appendChild(uploadThumb);

        // Render video thumbnails
        userVideoWallpapersDB.forEach((record) => {
            const thumb = document.createElement('div');
            thumb.className = 'thumbnail user-thumb';
            thumb.dataset.videoId = record.id;
            if (record.id === currentVideoId) thumb.classList.add('selected');

            const img = document.createElement('img');
            img.src = record.thumbnail;
            thumb.appendChild(img);

            // Play icon overlay
            const overlay = document.createElement('div');
            overlay.className = 'video-play-overlay';
            overlay.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
            thumb.appendChild(overlay);

            const delBtn = document.createElement('div');
            delBtn.className = 'thumb-delete-btn';
            delBtn.textContent = '×';
            delBtn.title = 'Remove';
            delBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await deleteVideoWallpaper(record.id);
                userVideoWallpapersDB = await getAllVideoWallpapers();
                // If we just deleted the active video, fall back gracefully
                if (record.id === currentVideoId) {
                    videoEl.style.display = 'none';
                    videoEl.src = '';
                    if (activeVideoObjectUrl) {
                        URL.revokeObjectURL(activeVideoObjectUrl);
                        activeVideoObjectUrl = null;
                    }
                    chrome.storage.local.remove(['wallpaperType', 'videoWallpaperId']);
                }
                renderVideoThumbnails(record.id === currentVideoId ? null : currentVideoId);
            });
            thumb.appendChild(delBtn);

            thumb.addEventListener('click', () => {
                setVideoWallpaper(record.id);
            });

            sectionLive.appendChild(thumb);
        });
    }

    function updateSelectedThumbnail(url) {
        const thumbs = sectionImage.querySelectorAll('.thumbnail');
        thumbs.forEach((thumb) => {
            if (thumb.dataset.url === url) {
                thumb.classList.add('selected');
            } else {
                thumb.classList.remove('selected');
            }
        });
    }

    function updateSelectedVideoThumbnail(id) {
        const thumbs = sectionLive.querySelectorAll('.thumbnail');
        thumbs.forEach((thumb) => {
            if (Number(thumb.dataset.videoId) === id || thumb.dataset.videoId == id) {
                thumb.classList.add('selected');
            } else {
                thumb.classList.remove('selected');
            }
        });
    }
}

const DEFAULT_TILES = [
    { name: 'Google', url: 'https://www.google.com/' },
    { name: 'YouTube', url: 'https://www.youtube.com/' },
    { name: 'GitHub', url: 'https://github.com/' },
    { name: 'Reddit', url: 'https://www.reddit.com/' },
    { name: 'Twitter', url: 'https://twitter.com/' },
    { name: 'Gmail', url: 'https://mail.google.com/' }
];


function initDockEffect() {
    const toolbar = document.getElementById('side-toolbar');
    const buttons = toolbar.querySelectorAll('.toolbar-btn');

    const BASE_SIZE = 48;       // Default button size in px
    const MAX_SIZE = 72;        // Maximum magnified size in px
    const EFFECT_RADIUS = 120;  // Distance in px over which the effect fades out
    const PROXIMITY_PAD = 60;   // Extra px around toolbar to start detecting cursor

    function resetButtons() {
        buttons.forEach(btn => {
            btn.style.width = BASE_SIZE + 'px';
            btn.style.height = BASE_SIZE + 'px';
        });
    }

    function applyMagnification(mouseY) {
        buttons.forEach(btn => {
            const rect = btn.getBoundingClientRect();
            const btnCenterY = rect.top + rect.height / 2;

            const distance = Math.abs(mouseY - btnCenterY);

            // Gaussian-ish falloff: scale goes from MAX_SIZE at distance=0 to BASE_SIZE at distance>=EFFECT_RADIUS
            const ratio = Math.max(0, 1 - (distance / EFFECT_RADIUS));
            // Smooth the curve with a cosine easing for a more natural feel
            const eased = ratio > 0 ? (Math.cos((1 - ratio) * Math.PI) + 1) / 2 : 0;
            const size = BASE_SIZE + (MAX_SIZE - BASE_SIZE) * eased;

            btn.style.width = Math.round(size) + 'px';
            btn.style.height = Math.round(size) + 'px';
        });
    }

    // Track mouse movement across the document, but only activate near the toolbar
    document.addEventListener('mousemove', (e) => {
        const toolbarRect = toolbar.getBoundingClientRect();

        // Check if cursor is within horizontal proximity of the toolbar
        const withinX = e.clientX >= toolbarRect.left - PROXIMITY_PAD &&
            e.clientX <= toolbarRect.right + PROXIMITY_PAD;
        // Check if cursor is within vertical proximity
        const withinY = e.clientY >= toolbarRect.top - PROXIMITY_PAD &&
            e.clientY <= toolbarRect.bottom + PROXIMITY_PAD;

        if (withinX && withinY) {
            applyMagnification(e.clientY);
        } else {
            resetButtons();
        }
    });

    // Ensure buttons reset if mouse leaves the window entirely
    document.addEventListener('mouseleave', () => {
        resetButtons();
    });
}


function initToolPanel() {
    const panel = document.getElementById('tool-panel');
    const panelTitle = document.getElementById('tool-panel-title');
    const panelContent = document.getElementById('tool-panel-content');
    const closeBtn = document.getElementById('tool-panel-close');
    const buttons = document.querySelectorAll('#side-toolbar .toolbar-btn[data-panel]');

    let activePanel = null; // currently open panel name

    const panelTitles = {
        notes: 'Quick Notes',
        colorpicker: 'Color Picker',
        qrcode: 'QR Code',
        unitconverter: 'Unit Converter',
        imgcompress: 'Image Compressor',
        settings: 'Settings'
    };

    function openPanel(name) {
        activePanel = name;
        panelTitle.textContent = panelTitles[name] || name;
        panelContent.innerHTML = '';
        panel.classList.add('open');

        // Render panel-specific content
        if (name === 'notes') {
            renderNotesPanel();
        } else if (name === 'colorpicker') {
            renderColorPickerPanel();
        } else if (name === 'qrcode') {
            renderQRCodePanel();
        } else if (name === 'unitconverter') {
            renderUnitConverterPanel();
        } else if (name === 'imgcompress') {
            renderImageCompressPanel();
        }

        // Highlight active button
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.panel === name);
        });
    }

    function renderNotesPanel() {
        const textarea = document.createElement('textarea');
        textarea.id = 'quick-notes-textarea';
        textarea.placeholder = 'Type your notes here…';
        textarea.spellcheck = false;

        // Load saved notes
        chrome.storage.local.get(['quickNotes'], (result) => {
            textarea.value = result.quickNotes || '';
        });

        // Auto-save on input with debounce
        let saveTimeout = null;
        textarea.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                chrome.storage.local.set({ quickNotes: textarea.value });
            }, 300);
        });

        panelContent.appendChild(textarea);
        // Focus the textarea after the panel slide animation
        setTimeout(() => textarea.focus(), 350);
    }

    function renderColorPickerPanel() {
        // -- Color preview + input --
        const previewWrapper = document.createElement('div');
        previewWrapper.className = 'cp-preview-wrapper';

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.id = 'cp-color-input';
        colorInput.value = '#6366f1';

        const previewSwatch = document.createElement('div');
        previewSwatch.id = 'cp-swatch';
        previewSwatch.style.background = colorInput.value;

        previewWrapper.appendChild(previewSwatch);
        previewWrapper.appendChild(colorInput);
        panelContent.appendChild(previewWrapper);

        // -- Value rows --
        const valuesContainer = document.createElement('div');
        valuesContainer.className = 'cp-values';

        const hexRow = createValueRow('HEX');
        const rgbRow = createValueRow('RGB');
        const hslRow = createValueRow('HSL');

        valuesContainer.appendChild(hexRow.row);
        valuesContainer.appendChild(rgbRow.row);
        valuesContainer.appendChild(hslRow.row);
        panelContent.appendChild(valuesContainer);

        // Initial update
        updateColorValues(colorInput.value);

        // Listen for color changes
        colorInput.addEventListener('input', () => {
            updateColorValues(colorInput.value);
        });

        function updateColorValues(hex) {
            previewSwatch.style.background = hex;

            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);

            const rgbStr = `rgb(${r}, ${g}, ${b})`;
            const hslStr = rgbToHsl(r, g, b);

            hexRow.valueSpan.textContent = hex.toUpperCase();
            rgbRow.valueSpan.textContent = rgbStr;
            hslRow.valueSpan.textContent = hslStr;
        }

        function createValueRow(label) {
            const row = document.createElement('div');
            row.className = 'cp-value-row';

            const labelSpan = document.createElement('span');
            labelSpan.className = 'cp-label';
            labelSpan.textContent = label;

            const valueSpan = document.createElement('span');
            valueSpan.className = 'cp-value';

            const copyBtn = document.createElement('button');
            copyBtn.className = 'cp-copy-btn';
            copyBtn.title = 'Copy';
            copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';

            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(valueSpan.textContent).then(() => {
                    copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
                        copyBtn.classList.remove('copied');
                    }, 1500);
                });
            });

            row.appendChild(labelSpan);
            row.appendChild(valueSpan);
            row.appendChild(copyBtn);

            return { row, valueSpan };
        }

        function rgbToHsl(r, g, b) {
            r /= 255; g /= 255; b /= 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;

            if (max === min) {
                h = s = 0;
            } else {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                    case g: h = ((b - r) / d + 2) / 6; break;
                    case b: h = ((r - g) / d + 4) / 6; break;
                }
            }

            return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
        }
    }

    function renderQRCodePanel() {
        // Text input
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'qr-text-input';
        input.placeholder = 'Enter text or URL…';
        panelContent.appendChild(input);

        // QR code container
        const qrContainer = document.createElement('div');
        qrContainer.id = 'qr-output';
        panelContent.appendChild(qrContainer);

        // Placeholder message
        const placeholder = document.createElement('div');
        placeholder.className = 'qr-placeholder';
        placeholder.textContent = 'Type something to generate a QR code';
        qrContainer.appendChild(placeholder);

        // Download button (hidden initially)
        const downloadBtn = document.createElement('button');
        downloadBtn.id = 'qr-download-btn';
        downloadBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download PNG';
        downloadBtn.style.display = 'none';
        panelContent.appendChild(downloadBtn);

        let qrInstance = null;
        let debounceTimer = null;

        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                generateQR(input.value.trim());
            }, 300);
        });

        downloadBtn.addEventListener('click', () => {
            const canvas = qrContainer.querySelector('canvas');
            if (!canvas) return;

            const link = document.createElement('a');
            link.download = 'qrcode.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });

        function generateQR(text) {
            // Clear previous
            qrContainer.innerHTML = '';

            if (!text) {
                const ph = document.createElement('div');
                ph.className = 'qr-placeholder';
                ph.textContent = 'Type something to generate a QR code';
                qrContainer.appendChild(ph);
                downloadBtn.style.display = 'none';
                return;
            }

            qrInstance = new QRCode(qrContainer, {
                text: text,
                width: 200,
                height: 200,
                colorDark: '#ffffff',
                colorLight: 'rgba(0,0,0,0)',
                correctLevel: QRCode.CorrectLevel.M
            });

            downloadBtn.style.display = '';
        }

        // Focus input after slide animation
        setTimeout(() => input.focus(), 350);
    }

    function renderUnitConverterPanel() {
        // ── Conversion data ──────────────────────────────────────────────
        const categories = {
            Length: {
                units: ['Meter', 'Kilometer', 'Centimeter', 'Millimeter', 'Mile', 'Yard', 'Foot', 'Inch'],
                toBase: { Meter: 1, Kilometer: 1000, Centimeter: 0.01, Millimeter: 0.001, Mile: 1609.344, Yard: 0.9144, Foot: 0.3048, Inch: 0.0254 }
            },
            Weight: {
                units: ['Kilogram', 'Gram', 'Milligram', 'Pound', 'Ounce', 'Ton'],
                toBase: { Kilogram: 1, Gram: 0.001, Milligram: 0.000001, Pound: 0.453592, Ounce: 0.0283495, Ton: 1000 }
            },
            Temperature: {
                units: ['Celsius', 'Fahrenheit', 'Kelvin'],
                toBase: null
            },
            Speed: {
                units: ['m/s', 'km/h', 'mph', 'knot', 'ft/s'],
                toBase: { 'm/s': 1, 'km/h': 1 / 3.6, 'mph': 0.44704, 'knot': 0.514444, 'ft/s': 0.3048 }
            }
        };

        function convertTemperature(value, from, to) {
            if (from === to) return value;
            let celsius;
            if (from === 'Celsius') celsius = value;
            else if (from === 'Fahrenheit') celsius = (value - 32) * 5 / 9;
            else celsius = value - 273.15;
            if (to === 'Celsius') return celsius;
            if (to === 'Fahrenheit') return celsius * 9 / 5 + 32;
            return celsius + 273.15;
        }

        function convert(value, fromUnit, toUnit, category) {
            if (isNaN(value) || value === '') return '';
            const num = parseFloat(value);
            if (category === 'Temperature') {
                return parseFloat(convertTemperature(num, fromUnit, toUnit).toPrecision(10));
            }
            const cat = categories[category];
            const baseValue = num * cat.toBase[fromUnit];
            return parseFloat((baseValue / cat.toBase[toUnit]).toPrecision(10));
        }

        // ── UI ────────────────────────────────────────────────────────────
        let currentCategory = 'Length';

        // Category selector
        const catWrapper = document.createElement('div');
        catWrapper.className = 'uc-category-wrapper';

        const catLabel = document.createElement('span');
        catLabel.className = 'uc-label';
        catLabel.textContent = 'Category';

        const catSelect = document.createElement('select');
        catSelect.id = 'uc-category-select';
        Object.keys(categories).forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            catSelect.appendChild(opt);
        });
        catWrapper.appendChild(catLabel);
        catWrapper.appendChild(catSelect);
        panelContent.appendChild(catWrapper);

        // Swap button
        const swapBtn = document.createElement('button');
        swapBtn.id = 'uc-swap-btn';
        swapBtn.title = 'Swap units';
        swapBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>';

        const fromRow = createUnitRow('from');
        const toRow = createUnitRow('to');

        const converterBody = document.createElement('div');
        converterBody.className = 'uc-body';
        converterBody.appendChild(fromRow.wrapper);
        converterBody.appendChild(swapBtn);
        converterBody.appendChild(toRow.wrapper);
        panelContent.appendChild(converterBody);

        // Result display
        const resultDisplay = document.createElement('div');
        resultDisplay.id = 'uc-result-display';
        resultDisplay.textContent = 'Enter a value to convert';
        panelContent.appendChild(resultDisplay);

        // ── Helpers ───────────────────────────────────────────────────────
        function createUnitRow(prefix) {
            const wrapper = document.createElement('div');
            wrapper.className = 'uc-row';

            const input = document.createElement('input');
            input.type = 'number';
            input.id = `uc-${prefix}-input`;
            input.placeholder = '0';
            input.className = 'uc-input';

            const select = document.createElement('select');
            select.id = `uc-${prefix}-unit`;
            select.className = 'uc-unit-select';

            wrapper.appendChild(input);
            wrapper.appendChild(select);
            return { wrapper, input, select };
        }

        function populateUnits() {
            const units = categories[currentCategory].units;
            [fromRow.select, toRow.select].forEach((sel, i) => {
                sel.innerHTML = '';
                units.forEach(u => {
                    const opt = document.createElement('option');
                    opt.value = u;
                    opt.textContent = u;
                    sel.appendChild(opt);
                });
                sel.selectedIndex = i === 0 ? 0 : Math.min(1, units.length - 1);
            });
        }

        function doConvert(direction) {
            const fromUnit = fromRow.select.value;
            const toUnit = toRow.select.value;

            if (direction === 'from') {
                const val = fromRow.input.value;
                if (val === '' || isNaN(val)) {
                    toRow.input.value = '';
                    resultDisplay.textContent = 'Enter a value to convert';
                    return;
                }
                const result = convert(val, fromUnit, toUnit, currentCategory);
                toRow.input.value = result;
                resultDisplay.textContent = `${val} ${fromUnit} = ${result} ${toUnit}`;
            } else {
                const val = toRow.input.value;
                if (val === '' || isNaN(val)) {
                    fromRow.input.value = '';
                    resultDisplay.textContent = 'Enter a value to convert';
                    return;
                }
                const result = convert(val, toUnit, fromUnit, currentCategory);
                fromRow.input.value = result;
                resultDisplay.textContent = `${result} ${fromUnit} = ${val} ${toUnit}`;
            }
        }

        // ── Events ────────────────────────────────────────────────────────
        catSelect.addEventListener('change', () => {
            currentCategory = catSelect.value;
            populateUnits();
            fromRow.input.value = '';
            toRow.input.value = '';
            resultDisplay.textContent = 'Enter a value to convert';
        });

        fromRow.input.addEventListener('input', () => doConvert('from'));
        toRow.input.addEventListener('input', () => doConvert('to'));
        fromRow.select.addEventListener('change', () => doConvert('from'));
        toRow.select.addEventListener('change', () => doConvert('from'));

        swapBtn.addEventListener('click', () => {
            const tmpUnit = fromRow.select.value;
            fromRow.select.value = toRow.select.value;
            toRow.select.value = tmpUnit;

            const tmpVal = fromRow.input.value;
            fromRow.input.value = toRow.input.value;
            toRow.input.value = tmpVal;

            if (fromRow.input.value !== '') doConvert('from');
        });

        // Init
        populateUnits();
        setTimeout(() => fromRow.input.focus(), 350);
    }

    function renderImageCompressPanel() {
        let originalFile = null;
        let originalImg = null;
        let compressedBlob = null;

        // ── Upload zone ──────────────────────────────────────────────────
        const dropZone = document.createElement('div');
        dropZone.id = 'ic-drop-zone';
        dropZone.innerHTML = `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span class="ic-drop-text">Drop image here or <em>browse</em></span>
            <span class="ic-drop-hint">PNG, JPG, WebP — any size</span>
        `;

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        panelContent.appendChild(dropZone);
        panelContent.appendChild(fileInput);

        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) handleFile(file);
        });
        fileInput.addEventListener('change', () => {
            if (fileInput.files[0]) handleFile(fileInput.files[0]);
        });

        // ── Preview ──────────────────────────────────────────────────────
        const previewContainer = document.createElement('div');
        previewContainer.id = 'ic-preview-container';
        previewContainer.style.display = 'none';

        const previewImg = document.createElement('img');
        previewImg.id = 'ic-preview-img';
        previewContainer.appendChild(previewImg);
        panelContent.appendChild(previewContainer);

        // ── Quality slider ───────────────────────────────────────────────
        const controlsWrapper = document.createElement('div');
        controlsWrapper.id = 'ic-controls';
        controlsWrapper.style.display = 'none';

        const qualityHeader = document.createElement('div');
        qualityHeader.className = 'ic-quality-header';

        const qualityLabel = document.createElement('span');
        qualityLabel.className = 'ic-label';
        qualityLabel.textContent = 'Quality';

        const qualityValue = document.createElement('span');
        qualityValue.id = 'ic-quality-value';
        qualityValue.textContent = '80%';

        qualityHeader.appendChild(qualityLabel);
        qualityHeader.appendChild(qualityValue);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = 'ic-quality-slider';
        slider.min = '1';
        slider.max = '100';
        slider.value = '80';

        controlsWrapper.appendChild(qualityHeader);
        controlsWrapper.appendChild(slider);
        panelContent.appendChild(controlsWrapper);

        // ── Stats ────────────────────────────────────────────────────────
        const statsWrapper = document.createElement('div');
        statsWrapper.id = 'ic-stats';
        statsWrapper.style.display = 'none';

        const statOriginal = createStatRow('Original', 'ic-stat-original');
        const statCompressed = createStatRow('Compressed', 'ic-stat-compressed');
        const statSavings = createStatRow('Savings', 'ic-stat-savings');

        statsWrapper.appendChild(statOriginal.row);
        statsWrapper.appendChild(statCompressed.row);
        statsWrapper.appendChild(statSavings.row);
        panelContent.appendChild(statsWrapper);

        // ── Download button ──────────────────────────────────────────────
        const downloadBtn = document.createElement('button');
        downloadBtn.id = 'ic-download-btn';
        downloadBtn.style.display = 'none';
        downloadBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Compressed
        `;
        panelContent.appendChild(downloadBtn);

        // ── Helpers ───────────────────────────────────────────────────────
        function createStatRow(label, id) {
            const row = document.createElement('div');
            row.className = 'ic-stat-row';

            const labelSpan = document.createElement('span');
            labelSpan.className = 'ic-stat-label';
            labelSpan.textContent = label;

            const valueSpan = document.createElement('span');
            valueSpan.className = 'ic-stat-value';
            valueSpan.id = id;
            valueSpan.textContent = '—';

            row.appendChild(labelSpan);
            row.appendChild(valueSpan);
            return { row, valueSpan };
        }

        function formatSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        }

        function handleFile(file) {
            originalFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    originalImg = img;
                    previewContainer.style.display = '';
                    controlsWrapper.style.display = '';
                    statsWrapper.style.display = '';
                    dropZone.style.display = 'none';
                    compress();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        function compress() {
            if (!originalImg) return;
            const quality = parseInt(slider.value, 10) / 100;

            const canvas = document.createElement('canvas');
            canvas.width = originalImg.naturalWidth;
            canvas.height = originalImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(originalImg, 0, 0);

            canvas.toBlob((blob) => {
                compressedBlob = blob;

                // Update preview
                const url = URL.createObjectURL(blob);
                previewImg.onload = () => URL.revokeObjectURL(url);
                previewImg.src = url;

                // Update stats
                const origSize = originalFile.size;
                const compSize = blob.size;
                const saved = origSize - compSize;
                const pct = origSize > 0 ? ((saved / origSize) * 100).toFixed(1) : 0;

                statOriginal.valueSpan.textContent = formatSize(origSize);
                statCompressed.valueSpan.textContent = formatSize(compSize);

                if (saved > 0) {
                    statSavings.valueSpan.textContent = `−${formatSize(saved)} (${pct}%)`;
                    statSavings.valueSpan.style.color = '#4ade80';
                } else {
                    statSavings.valueSpan.textContent = `+${formatSize(Math.abs(saved))} (larger)`;
                    statSavings.valueSpan.style.color = '#f87171';
                }

                downloadBtn.style.display = '';
            }, 'image/jpeg', quality);
        }

        // ── Events ────────────────────────────────────────────────────────
        let sliderDebounce = null;
        slider.addEventListener('input', () => {
            qualityValue.textContent = slider.value + '%';
            clearTimeout(sliderDebounce);
            sliderDebounce = setTimeout(() => compress(), 100);
        });

        downloadBtn.addEventListener('click', () => {
            if (!compressedBlob) return;
            const link = document.createElement('a');
            const baseName = originalFile.name.replace(/\.[^.]+$/, '');
            link.download = `${baseName}_compressed.jpg`;
            link.href = URL.createObjectURL(compressedBlob);
            link.click();
            setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        });
    }

    function closePanel() {
        activePanel = null;
        panel.classList.remove('open');
        buttons.forEach(btn => btn.classList.remove('active'));
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const name = btn.dataset.panel;

            if (activePanel === name) {
                // Toggle off — same button clicked again
                closePanel();
            } else if (activePanel) {
                // Different panel requested — close current, then open new
                panel.classList.remove('open');
                // Wait for close animation, then re-open with new content
                setTimeout(() => {
                    openPanel(name);
                }, 200);
            } else {
                // No panel open — open directly
                openPanel(name);
            }
        });
    });

    closeBtn.addEventListener('click', () => {
        closePanel();
    });

    // Incognito button — opens a new incognito window (no panel)
    const incognitoBtn = document.getElementById('incognito-btn');
    if (incognitoBtn) {
        incognitoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            chrome.windows.create({ incognito: true });
        });
    }
}

function initSpeedDial() {
    const container = document.getElementById('boards-container');
    const modal = document.getElementById('add-tile-modal');
    const nameInput = document.getElementById('tile-name-input');
    const urlInput = document.getElementById('tile-url-input');
    const saveBtn = document.getElementById('save-tile');
    const cancelBtn = document.getElementById('cancel-add-tile');
    const addBoardBtn = document.getElementById('add-board-btn');
    let currentTiles = [];

    // Global resize variables
    let activeResizeTile = null;
    let activeResizeIndex = -1;
    let resizeStartX = 0;
    let resizeStartY = 0;
    let resizeStartWidth = 0;
    let resizeStartHeight = 0;

    // Global resize listeners
    document.addEventListener('mousemove', (e) => {
        if (!activeResizeTile) return;

        activeResizeTile.style.transition = 'none';
        const newWidth = resizeStartWidth + e.clientX - resizeStartX;
        const newHeight = resizeStartHeight + e.clientY - resizeStartY;

        const finalWidth = Math.max(200, Math.min(newWidth, 500));
        const finalHeight = Math.max(80, newHeight);

        activeResizeTile.style.width = finalWidth + 'px';
        activeResizeTile.style.height = finalHeight + 'px';
    });

    window.addEventListener('mouseup', () => {
        if (activeResizeTile) {
            activeResizeTile.style.transition = '';
            if (activeResizeIndex >= 0) {
                currentTiles[activeResizeIndex].width = parseInt(activeResizeTile.style.width, 10);
                currentTiles[activeResizeIndex].height = parseInt(activeResizeTile.style.height, 10);
            }
            activeResizeTile = null;
            activeResizeIndex = -1;
            saveAndRender();
        }
    });

    // Read tiles from storage or use defaults
    chrome.storage.local.get(['siteTiles'], (result) => {
        currentTiles = result.siteTiles || [];
        let needsSave = false;

        if (currentTiles.length === 0) {
            currentTiles = [...DEFAULT_TILES];
            needsSave = true;
        }

        currentTiles.forEach((t, i) => {
            if (t.left === undefined || t.top === undefined) {
                const col = i % 3;
                const row = Math.floor(i / 3);
                t.left = 20 + col * 280;
                t.top = 20 + row * 180;
                needsSave = true;
            }
        });

        if (needsSave) {
            chrome.storage.local.set({ siteTiles: currentTiles });
        }
        renderTiles();
    });

    function saveAndRender() {
        const tilesToSave = currentTiles.map(t => ({
            name: t.name, url: t.url, width: t.width, height: t.height, left: t.left, top: t.top
        }));
        chrome.storage.local.set({ siteTiles: tilesToSave }, () => {
            renderTiles();
        });
    }

    function renderTiles() {
        container.innerHTML = '';
        currentTiles.forEach((tile, index) => {
            const a = document.createElement('a');
            a.href = tile.url;
            a.className = 'site-tile';
            // Apply position
            a.style.left = (tile.left || 0) + 'px';
            a.style.top = (tile.top || 0) + 'px';

            // Drag to place events
            let isDragging = false;
            let isMouseDown = false;
            let startMouseX = 0;
            let startMouseY = 0;
            let startLeft = 0;
            let startTop = 0;

            a.addEventListener('click', (e) => {
                if (isDragging || a.dataset.isResizing === 'true') {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });

            a.addEventListener('mousedown', (e) => {
                if (e.target.closest('.resize-handle') || e.target.closest('.delete-btn')) {
                    return;
                }

                e.preventDefault();
                isMouseDown = true;
                isDragging = false;

                startMouseX = e.clientX;
                startMouseY = e.clientY;
                startLeft = parseInt(a.style.left || 0, 10);
                startTop = parseInt(a.style.top || 0, 10);

                const doDrag = (eMove) => {
                    if (!isMouseDown) return;

                    const dx = eMove.clientX - startMouseX;
                    const dy = eMove.clientY - startMouseY;

                    if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                        isDragging = true;
                        a.classList.add('dragging');
                    }

                    if (isDragging) {
                        eMove.preventDefault();
                        a.style.left = (startLeft + dx) + 'px';
                        a.style.top = (startTop + dy) + 'px';
                    }
                };

                const stopDrag = () => {
                    isMouseDown = false;
                    document.removeEventListener('mousemove', doDrag);
                    document.removeEventListener('mouseup', stopDrag);

                    if (isDragging) {
                        a.classList.remove('dragging');
                        currentTiles[index].left = parseInt(a.style.left, 10);
                        currentTiles[index].top = parseInt(a.style.top, 10);
                        saveAndRender();

                        setTimeout(() => {
                            isDragging = false;
                        }, 50);
                    }
                };

                document.addEventListener('mousemove', doDrag);
                document.addEventListener('mouseup', stopDrag);
            });

            // Enter animation logic
            if (tile._isNew) {
                a.classList.add('anim-enter');
                requestAnimationFrame(() => {
                    a.classList.add('anim-enter-active');
                });
                setTimeout(() => {
                    a.classList.remove('anim-enter', 'anim-enter-active');
                    delete tile._isNew;
                }, 300);
            }

            // Header
            const header = document.createElement('div');
            header.className = 'tile-header';

            const titleSpan = document.createElement('span');
            titleSpan.textContent = tile.name;

            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.textContent = '×';
            delBtn.title = 'Remove';
            delBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                a.classList.add('anim-exit');
                setTimeout(() => {
                    currentTiles.splice(index, 1);
                    saveAndRender();
                }, 300);
            });

            header.appendChild(titleSpan);
            header.appendChild(delBtn);

            // Body
            const body = document.createElement('div');
            body.className = 'tile-body';

            const img = document.createElement('img');
            try {
                let urlStr = tile.url;
                if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
                    urlStr = 'https://' + urlStr;
                }
                const domain = new URL(urlStr).hostname;
                img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
            } catch (e) {
                img.src = '';
            }
            img.alt = `${tile.name} icon`;

            const linkSpan = document.createElement('span');
            try {
                let urlStr = tile.url;
                if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
                    urlStr = 'https://' + urlStr;
                }
                linkSpan.textContent = new URL(urlStr).hostname.replace('www.', '');
            } catch (e) {
                linkSpan.textContent = tile.url;
            }

            body.appendChild(img);
            body.appendChild(linkSpan);

            a.appendChild(header);
            a.appendChild(body);

            // Apply saved dimensions
            if (tile.width) a.style.width = tile.width + 'px';
            if (tile.height) a.style.height = tile.height + 'px';

            // Custom resize handle
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'resize-handle';
            resizeHandle.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 21 21 21 21 13"></polyline><line x1="21" y1="21" x2="10" y2="10"></line></svg>';

            attachResizeListener(a, resizeHandle, index);

            a.appendChild(resizeHandle);

            container.appendChild(a);
        });
    }

    function attachResizeListener(tileElement, handleElement, index) {
        handleElement.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            tileElement.dataset.isResizing = 'true';
            activeResizeTile = tileElement;
            activeResizeIndex = index;

            resizeStartX = e.clientX;
            resizeStartY = e.clientY;
            resizeStartWidth = parseInt(document.defaultView.getComputedStyle(activeResizeTile).width, 10);
            resizeStartHeight = parseInt(document.defaultView.getComputedStyle(activeResizeTile).height, 10);

            const stopLocal = () => {
                setTimeout(() => { tileElement.dataset.isResizing = 'false'; }, 50);
                window.removeEventListener('mouseup', stopLocal);
            };
            window.addEventListener('mouseup', stopLocal);
        });
    }

    addBoardBtn.addEventListener('click', (e) => {
        e.preventDefault();
        nameInput.value = '';
        urlInput.value = '';
        modal.classList.remove('hidden');
        nameInput.focus();
    });

    // Modal Event Listeners
    cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    saveBtn.addEventListener('click', () => {
        const name = nameInput.value.trim();
        let url = urlInput.value.trim();

        if (name && url) {
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            currentTiles.push({ name, url, _isNew: true });
            saveAndRender();
            modal.classList.add('hidden');
        }
    });

    // Close modal on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}
