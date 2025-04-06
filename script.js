// Database functions
async function readDB(file) {
    try {
        const response = await fetch(`database/db_handler.php?file=${file}`);
        if (!response.ok) {
            if (response.status === 404) {
                return null; // File not found is acceptable for initialization
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (e) {
        console.error('Database Read Error:', e);
        showNotification('Gagal memuat data', 'error');
        return null;
    }
}

async function writeDB(file, data) {
    try {
        const response = await fetch(`database/db_handler.php?file=${file}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save data');
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error('Server failed to process request');
        }
        
        return true;
    } catch (e) {
        console.error('Database Error:', e);
        showNotification(`Gagal menyimpan data: ${e.message}`, 'error');
        return false;
    }
}

// Initialize database
async function initDB() {
    const defaultCounters = { incoming: 0, outgoing: 0 };
    const defaultLetters = [];
    
    if (!await readDB('counters.json')) {
        await writeDB('counters.json', defaultCounters);
    }
    
    if (!await readDB('surat_masuk.json')) {
        await writeDB('surat_masuk.json', defaultLetters);
    }
    
    if (!await readDB('surat_keluar.json')) {
        await writeDB('surat_keluar.json', defaultLetters);
    }
}

// Get current date for forms
function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}


// Save letter to database with unique number validation
async function saveLetter(type, data) {
    const dbFile = type === 'incoming' ? 'surat_masuk.json' : 'surat_keluar.json';
    const letters = await readDB(dbFile) || [];
    
    // Check for duplicate number
    const isDuplicate = letters.some(letter => letter.number === data.number);
    if (isDuplicate) {
        showNotification('Error: Nomor surat sudah ada!', 'error');
        return false;
    }
    
    letters.push(data);
    return await writeDB(dbFile, letters);
}

// Load letters from database
async function loadLetters(type) {
    const dbFile = type === 'incoming' ? 'surat_masuk.json' : 'surat_keluar.json';
    return await readDB(dbFile) || [];
}

// Search functionality
function setupSearch(type) {
    const searchId = type === 'incoming' ? 'searchIncoming' : 'searchOutgoing';
    const searchInput = document.getElementById(searchId);
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll(`#${type}List tr`);
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }
}

// Display letters in table
async function displayLetters(type) {
    try {
        const letters = await loadLetters(type) || [];
        const tableBody = document.getElementById(`${type}List`);
        tableBody.innerHTML = '';

        if (letters.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="py-4 text-center text-gray-500">
                        Belum ada data surat
                    </td>
                </tr>`;
            return;
        }

        letters.forEach((letter, index) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="py-3 px-4">${letter.number || '-'}</td>
                <td class="py-3 px-4">${letter.date || '-'}</td>
                <td class="py-3 px-4">${type === 'incoming' ? (letter.sender || '-') : (letter.recipient || '-')}</td>
                <td class="py-3 px-4">${letter.subject || '-'}</td>
                <td class="py-3 px-4">
                    <button onclick="viewLetter('${type}', ${index})" class="text-blue-600 hover:text-blue-800 mr-2">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="deleteLetter('${type}', ${index})" class="text-red-600 hover:text-red-800">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error displaying letters:', error);
        showNotification('Gagal memuat daftar surat', 'error');
    }
}

// View letter details
function viewLetter(type, index) {
    const letters = loadLetters(type);
    const letter = letters[index];
    
    alert(`Detail Surat:\n\nNomor: ${letter.number}\nTanggal: ${letter.date}\n${
        type === 'incoming' ? 'Pengirim' : 'Tujuan'}: ${
        type === 'incoming' ? letter.sender : letter.recipient}\nPerihal: ${letter.subject}\nKeterangan: ${letter.notes || '-'}`);
}

// Delete letter
function deleteLetter(type, index) {
    if (confirm('Apakah Anda yakin ingin menghapus surat ini?')) {
        const storageKey = type === 'incoming' ? 'incomingLetters' : 'outgoingLetters';
        const letters = loadLetters(type);
        letters.splice(index, 1);
        localStorage.setItem(storageKey, JSON.stringify(letters));
        displayLetters(type);
        showNotification('Surat berhasil dihapus');
    }
}

// Export to Excel
function exportToExcel(type) {
    const letters = loadLetters(type);
    if (letters.length === 0) {
        showNotification('Tidak ada data untuk diekspor', 'error');
        return;
    }

    const headers = ['No', 'Nomor Surat', 'Tanggal', type === 'incoming' ? 'Pengirim' : 'Tujuan', 'Perihal', 'Keterangan'];
    const wsData = letters.map((letter, index) => [
        index + 1,
        letter.number,
        letter.date,
        type === 'incoming' ? letter.sender : letter.recipient,
        letter.subject,
        letter.notes || '-'
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...wsData]);
    XLSX.utils.book_append_sheet(wb, ws, type === 'incoming' ? 'Surat Masuk' : 'Surat Keluar');
    
    const fileName = `Data_Surat_${type === 'incoming' ? 'Masuk' : 'Keluar'}_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showNotification(`Data berhasil diekspor ke ${fileName}`);
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';
    notification.className = `fixed bottom-4 right-4 ${bgColor} text-white px-4 py-2 rounded shadow-lg`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize forms
document.addEventListener('DOMContentLoaded', async function() {
    await initDB();
    setupSearch('incoming');
    setupSearch('outgoing');
    // Incoming letter form
    if (document.getElementById('incomingForm')) {
        document.getElementById('incomingDate').value = getCurrentDate();
        
        // Set field nomor surat ke mode manual
        document.getElementById('incomingNumber').readOnly = false;
        document.getElementById('incomingNumber').classList.remove('bg-gray-100');
        document.getElementById('incomingNumber').classList.add('bg-white');
        
        document.getElementById('incomingForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const letterData = {
                number: document.getElementById('incomingNumber').value,
                date: document.getElementById('incomingDate').value,
                sender: document.getElementById('incomingSender').value,
                subject: document.getElementById('incomingSubject').value,
                notes: document.getElementById('incomingNotes').value
            };
            
            if (saveLetter('incoming', letterData)) {
                showNotification('Surat masuk berhasil disimpan');
                this.reset();
        document.getElementById('incomingDate').value = getCurrentDate();
                displayLetters('incoming');
            } else {
                // Keep the form data if validation fails
                document.getElementById('incomingNumber').value = letterData.number;
                document.getElementById('incomingDate').value = letterData.date;
                document.getElementById('incomingSender').value = letterData.sender;
                document.getElementById('incomingSubject').value = letterData.subject;
                document.getElementById('incomingNotes').value = letterData.notes || '';
            }
        });
        
        displayLetters('incoming');
    }
    
    // Outgoing letter form
    if (document.getElementById('outgoingForm')) {
        document.getElementById('outgoingDate').value = getCurrentDate();
        
        // Set field nomor surat ke mode manual
        document.getElementById('outgoingNumber').readOnly = false;
        document.getElementById('outgoingNumber').classList.remove('bg-gray-100');
        document.getElementById('outgoingNumber').classList.add('bg-white');
        
        document.getElementById('outgoingForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const letterData = {
                number: document.getElementById('outgoingNumber').value,
                date: document.getElementById('outgoingDate').value,
                recipient: document.getElementById('outgoingRecipient').value,
                subject: document.getElementById('outgoingSubject').value,
                notes: document.getElementById('outgoingNotes').value
            };
            
            if (saveLetter('outgoing', letterData)) {
                showNotification('Surat keluar berhasil disimpan');
                this.reset();
        document.getElementById('outgoingDate').value = getCurrentDate();
                displayLetters('outgoing');
            } else {
                // Keep the form data if validation fails
                document.getElementById('outgoingNumber').value = letterData.number;
                document.getElementById('outgoingDate').value = letterData.date;
                document.getElementById('outgoingRecipient').value = letterData.recipient;
                document.getElementById('outgoingSubject').value = letterData.subject;
                document.getElementById('outgoingNotes').value = letterData.notes || '';
            }
        });
        
        displayLetters('outgoing');
    }
});