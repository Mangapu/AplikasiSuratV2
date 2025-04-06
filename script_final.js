// Database functions
async function readDB(file) {
    try {
        const response = await fetch(`database/db_handler.php?file=${file}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        console.error('Database Read Error:', e);
        return null;
    }
}

async function writeDB(file, data) {
    try {
        const response = await fetch(`database/db_handler.php?file=${file}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        return response.ok;
    } catch (e) {
        console.error('Database Write Error:', e);
        return false;
    }
}

// Initialize database
async function initDB() {
    const defaultData = [];
    if (!await readDB('surat_masuk.json')) {
        await writeDB('surat_masuk.json', defaultData);
    }
    if (!await readDB('surat_keluar.json')) {
        await writeDB('surat_keluar.json', defaultData);
    }
}

// Get current date
function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

// Save letter function
async function saveLetter(type, data) {
    const dbFile = type === 'incoming' ? 'surat_masuk.json' : 'surat_keluar.json';
    const letters = await readDB(dbFile) || [];
    
    // Validasi nomor surat duplikat
    const isDuplicate = letters.some(letter => letter.number === data.number);
    if (isDuplicate) {
        showNotification('Nomor surat sudah ada!', 'error');
        return false;
    }
    
    letters.push(data);
    const success = await writeDB(dbFile, letters);
    if (success) {
        showNotification('Surat berhasil disimpan');
        return true;
    }
    return false;
}

// Load letters function 
async function loadLetters(type) {
    const dbFile = type === 'incoming' ? 'surat_masuk.json' : 'surat_keluar.json';
    return await readDB(dbFile) || [];
}

// Initialize forms - FULL MANUAL MODE
document.addEventListener('DOMContentLoaded', async function() {
    await initDB();

    // Incoming letter form
    if (document.getElementById('incomingForm')) {
        document.getElementById('incomingDate').value = getCurrentDate();
        document.getElementById('incomingNumber').readOnly = false;
        
        document.getElementById('incomingForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = {
                number: document.getElementById('incomingNumber').value,
                date: document.getElementById('incomingDate').value,
                sender: document.getElementById('incomingSender').value,
                subject: document.getElementById('incomingSubject').value,
                notes: document.getElementById('incomingNotes').value || ''
            };
            
            if (await saveLetter('incoming', formData)) {
                alert('Surat masuk berhasil disimpan');
                this.reset();
                document.getElementById('incomingDate').value = getCurrentDate();
            }
        });
    }

    // Outgoing letter form
    if (document.getElementById('outgoingForm')) {
        document.getElementById('outgoingDate').value = getCurrentDate();
        document.getElementById('outgoingNumber').readOnly = false;
        
        document.getElementById('outgoingForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = {
                number: document.getElementById('outgoingNumber').value,
                date: document.getElementById('outgoingDate').value,
                recipient: document.getElementById('outgoingRecipient').value,
                subject: document.getElementById('outgoingSubject').value,
                notes: document.getElementById('outgoingNotes').value || ''
            };
            
            if (await saveLetter('outgoing', formData)) {
                alert('Surat keluar berhasil disimpan');
                this.reset();
                document.getElementById('outgoingDate').value = getCurrentDate();
            }
        });
    }
});