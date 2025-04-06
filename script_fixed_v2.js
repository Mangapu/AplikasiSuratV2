// Fungsi dasar database
function readDB(file) {
    try {
        const data = localStorage.getItem(file);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Database Read Error:', e);
        return null;
    }
}

function writeDB(file, data) {
    try {
        localStorage.setItem(file, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('Database Write Error:', e);
        return false;
    }
}

// Inisialisasi database
async function initDB() {
    const defaultData = [];
    if (!await readDB('surat_masuk.json')) {
        await writeDB('surat_masuk.json', defaultData);
    }
    if (!await readDB('surat_keluar.json')) {
        await writeDB('surat_keluar.json', defaultData);
    }
}

// Fungsi untuk menampilkan notifikasi
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg ${
        type === 'error' ? 'bg-red-500' : 'bg-green-500'
    } text-white`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Fungsi untuk mendapatkan tanggal sekarang
function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

// Fungsi untuk menyimpan surat dengan validasi
async function saveLetter(type, data) {
    const dbFile = type === 'incoming' ? 'surat_masuk.json' : 'surat_keluar.json';
    const letters = await readDB(dbFile) || [];
    
    // Validasi nomor surat duplikat
    if (letters.some(letter => letter.number === data.number)) {
        showNotification('Nomor surat sudah ada!', 'error');
        return false;
    }
    
    letters.push(data);
    const success = await writeDB(dbFile, letters);
    if (success) {
        showNotification('Surat berhasil disimpan!');
        return true;
    }
    return false;
}

// Fungsi untuk menampilkan daftar surat
async function displayLetters(type, searchTerm = '') {
    const dbFile = type === 'incoming' ? 'surat_masuk.json' : 'surat_keluar.json';
    let letters = await readDB(dbFile) || [];
    const tableBody = document.getElementById(`${type}List`);
    
    // Filter letters if search term exists
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        letters = letters.filter(letter => 
            letter.number.toLowerCase().includes(term) ||
            letter.date.includes(term) ||
            (type === 'incoming' 
                ? letter.sender.toLowerCase().includes(term)
                : letter.recipient.toLowerCase().includes(term)) ||
            letter.subject.toLowerCase().includes(term)
        );
    }
    
    tableBody.innerHTML = '';
    
    letters.forEach((letter, index) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="py-2 px-4 border">${letter.number}</td>
            <td class="py-2 px-4 border">${letter.date}</td>
            <td class="py-2 px-4 border">${type === 'incoming' ? letter.sender : letter.recipient}</td>
            <td class="py-2 px-4 border">${letter.subject}</td>
            <td class="py-2 px-4 border">
                <button onclick="deleteLetter('${type}', ${index})" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Fungsi untuk menangani pencarian
function setupSearch() {
    const searchIncoming = document.getElementById('searchIncoming');
    if (searchIncoming) {
        searchIncoming.addEventListener('input', (e) => {
            displayLetters('incoming', e.target.value);
        });
    }
    
    const searchOutgoing = document.getElementById('searchOutgoing');
    if (searchOutgoing) {
        searchOutgoing.addEventListener('input', (e) => {
            displayLetters('outgoing', e.target.value);
        });
    }
}

// Fungsi untuk ekspor data ke Excel
async function exportToExcel(type) {
    const dbFile = type === 'incoming' ? 'surat_masuk.json' : 'surat_keluar.json';
    const letters = await readDB(dbFile) || [];
    
    if (letters.length === 0) {
        showNotification('Tidak ada data untuk diekspor', 'error');
        return;
    }

    // Format data untuk Excel
    const excelData = letters.map(letter => {
        if (type === 'incoming') {
            return {
                'No. Surat': letter.number,
                'Tanggal': letter.date,
                'Pengirim': letter.sender,
                'Perihal': letter.subject,
                'Keterangan': letter.notes || ''
            };
        } else {
            return {
                'No. Surat': letter.number,
                'Tanggal': letter.date,
                'Tujuan': letter.recipient,
                'Perihal': letter.subject,
                'Keterangan': letter.notes || ''
            };
        }
    });

    // Buat workbook dan worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, type === 'incoming' ? 'Surat Masuk' : 'Surat Keluar');
    
    // Ekspor file
    const fileName = type === 'incoming' 
        ? `surat_masuk_${new Date().toISOString().split('T')[0]}.xlsx`
        : `surat_keluar_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    showNotification('Data berhasil diekspor');
}

// Fungsi untuk menghapus surat
async function deleteLetter(type, index) {
    if (confirm('Apakah Anda yakin ingin menghapus surat ini?')) {
        const dbFile = type === 'incoming' ? 'surat_masuk.json' : 'surat_keluar.json';
        const letters = await readDB(dbFile) || [];
        letters.splice(index, 1);
        await writeDB(dbFile, letters);
        await displayLetters(type);
        showNotification('Surat berhasil dihapus');
    }
}

// Fungsi untuk toggle mobile menu
function setupMobileMenu() {
    const menuButton = document.querySelector('.md\\:hidden');
    const navLinks = document.querySelector('.hidden.md\\:flex');

    if (menuButton && navLinks) {
        menuButton.addEventListener('click', () => {
            navLinks.classList.toggle('hidden');
            navLinks.classList.toggle('flex');
            navLinks.classList.toggle('flex-col');
            navLinks.classList.toggle('absolute');
            navLinks.classList.toggle('top-16');
            navLinks.classList.toggle('right-4');
            navLinks.classList.toggle('bg-blue-700');
            navLinks.classList.toggle('p-4');
            navLinks.classList.toggle('rounded-lg');
            navLinks.classList.toggle('z-50');
        });
    }
}

// Inisialisasi form
document.addEventListener('DOMContentLoaded', async function() {
    await initDB();
    setupSearch();
    setupMobileMenu();
    
    // Form surat masuk
    if (document.getElementById('incomingForm')) {
        document.getElementById('incomingDate').value = getCurrentDate();
        // Field nomor sudah bisa diisi karena atribut readonly dihapus dari HTML
        
        document.getElementById('incomingForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                number: document.getElementById('incomingNumber').value.trim(),
                date: document.getElementById('incomingDate').value,
                sender: document.getElementById('incomingSender').value.trim(),
                subject: document.getElementById('incomingSubject').value.trim(),
                notes: document.getElementById('incomingNotes').value.trim()
            };
            
            if (await saveLetter('incoming', formData)) {
                this.reset();
                document.getElementById('incomingDate').value = getCurrentDate();
                await displayLetters('incoming');
            }
        });
        
        await displayLetters('incoming');
    }
    
    // Form surat keluar
    if (document.getElementById('outgoingForm')) {
        document.getElementById('outgoingDate').value = getCurrentDate();
        // Field nomor sudah bisa diisi karena atribut readonly dihapus dari HTML
        
        document.getElementById('outgoingForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                number: document.getElementById('outgoingNumber').value.trim(),
                date: document.getElementById('outgoingDate').value,
                recipient: document.getElementById('outgoingRecipient').value.trim(),
                subject: document.getElementById('outgoingSubject').value.trim(),
                notes: document.getElementById('outgoingNotes').value.trim()
            };
            
            if (await saveLetter('outgoing', formData)) {
                this.reset();
                document.getElementById('outgoingDate').value = getCurrentDate();
                await displayLetters('outgoing');
            }
        });
        
        await displayLetters('outgoing');
    }
});
