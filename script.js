import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCdFAyOvZb05CEXfVezonRUMvN4zb9xcoo",
    authDomain: "test-jsr1.firebaseapp.com",
    projectId: "test-jsr1",
    storageBucket: "test-jsr1.firebasestorage.app",
    messagingSenderId: "25804824117",
    appId: "1:25804824117:web:f6c2c1430c6227807fdb7c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const DOC_REF = doc(db, "plan", "test_struktur");
const ADMIN_EMAIL = "sgmisburgjsr@outlook.de"; // Deine Admin-Mail
const WHATSAPP_NUMMER = "491761234567"; // DEINE NUMMER HIER (mit 49 ohne +)

let userRole = null;
let allData = { spiele: [] };
let isRegistrationMode = false;

// --- AUTH LOGIK ---

window.toggleAuthMode = () => {
    isRegistrationMode = !isRegistrationMode;
    document.getElementById("authTitle").innerText = isRegistrationMode ? "Registrieren" : "Login";
    document.getElementById("authButtons").innerHTML = isRegistrationMode ? 
        `<button onclick="handleRegister()" class="full-btn" style="background: #38a169;">Konto erstellen</button><button onclick="location.reload()" class="secondary-btn" style="margin-top:10px;">Zurück</button>` : 
        `<button onclick="handleLogin()" class="full-btn">Einloggen</button><button onclick="toggleAuthMode()" class="secondary-btn" style="margin-top:10px;">Konto erstellen</button>`;
};

window.handleLogin = () => {
    const email = document.getElementById("emailInput").value.trim();
    const pw = document.getElementById("pwInput").value;
    signInWithEmailAndPassword(auth, email, pw).catch(e => alert("Fehler: " + e.message));
};

window.handleRegister = () => {
    const email = document.getElementById("emailInput").value.trim();
    const pw = document.getElementById("pwInput").value;
    createUserWithEmailAndPassword(auth, email, pw).catch(e => alert("Fehler: " + e.message));
};

window.forgotPassword = () => {
    const email = document.getElementById("emailInput").value.trim();
    if(!email) return alert("Bitte E-Mail eingeben!");
    sendPasswordResetEmail(auth, email).then(() => alert("Email zum Zurücksetzen gesendet!")).catch(e => alert(e.message));
};

window.handleLogout = () => signOut(auth).then(() => location.reload());

onAuthStateChanged(auth, (user) => {
    if (user) {
        userRole = (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'schiri';
        startApp();
    } else {
        document.getElementById("loginSection").style.display = "block";
        document.getElementById("mainContent").style.display = "none";
    }
});

// --- HAUPT APP ---

function startApp() {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("mainContent").style.display = "block";
    document.getElementById("userStatus").innerText = userRole === 'admin' ? "👑 Admin-Modus" : "🏃 Schiedsrichter-Modus";
    
    if (userRole === 'admin') {
        document.querySelectorAll('.admin-only').forEach(e => e.style.display = 'inline-block');
    }

    onSnapshot(DOC_REF, (snap) => {
        if (snap.exists()) {
            allData = snap.data();
            renderTable();
            updateDashboard();
        } else if (userRole === 'admin') {
            setDoc(DOC_REF, { spiele: [] });
        }
    });
}

function renderTable() {
    const tbody = document.querySelector("#spieleTable tbody");
    tbody.innerHTML = "";
    const isAdmin = (userRole === 'admin');
    const heute = new Date().toISOString().split('T')[0];

    // SORTIERUNG: Datum aufsteigend
    const sortierteSpiele = [...allData.spiele].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortierteSpiele.forEach((item, i) => {
        // ARCHIV: Vergangene Spiele für Schiris ausblenden
        if (item.date && item.date < heute && !isAdmin) return;

        const tr = document.createElement("tr");
        if(item.date < heute) tr.style.background = "#f7fafc"; // Altes Spiel markieren

        tr.innerHTML = `
            <td><input type="date" value="${item.date}" ${!isAdmin ? 'disabled' : ''} onchange="updateRow(${i},'date',this.value)"></td>
            <td><input type="text" value="${item.time}" ${!isAdmin ? 'disabled' : ''} onchange="updateRow(${i},'time',this.value)"></td>
            <td><input type="text" value="${item.hall}" ${!isAdmin ? 'disabled' : ''} onchange="updateRow(${i},'hall',this.value)"></td>
            <td><input type="text" value="${item.age}" ${!isAdmin ? 'disabled' : ''} onchange="updateRow(${i},'age',this.value)"></td>
            <td><input type="text" value="${item.jsr1}" ${!isAdmin ? 'disabled' : ''} onchange="updateRow(${i},'jsr1',this.value)"></td>
            <td><input type="text" value="${item.jsr2}" ${!isAdmin ? 'disabled' : ''} onchange="updateRow(${i},'jsr2',this.value)"></td>
            <td>
                <select ${!isAdmin ? 'disabled' : ''} onchange="updateRow(${i},'status',this.value)" class="${item.status==='Offen'?'status-offen':'status-besetzt'}">
                    <option value="Offen" ${item.status==='Offen'?'selected':''}>Offen</option>
                    <option value="Besetzt" ${item.status==='Besetzt'?'selected':''}>Besetzt</option>
                </select>
            </td>
            <td>
                ${!isAdmin && item.status === 'Offen' ? 
                `<button class="whatsapp-btn" onclick="sendWhatsApp('${item.date}','${item.time}','${item.age}','${item.hall}')">Melden 🟢</button>` : 
                (isAdmin ? '<small>Admin</small>' : '---')}
            </td>
            ${isAdmin ? `<td><button onclick="deleteEntry(${i})" style="color:red; background:none; border:none; cursor:pointer;">🗑️</button></td>` : ''}
        `;
        tbody.appendChild(tr);
    });
}

// WhatsApp Funktion
window.sendWhatsApp = (date, time, age, hall) => {
    const text = `Hallo! Ich würde gerne folgendes Spiel pfeifen:\n📅 Datum: ${date}\n⏰ Zeit: ${time}\n⚽ Spiel: ${age}\n🏢 Halle: ${hall}\n\nIst das noch frei?`;
    window.open(`https://wa.me/${WHATSAPP_NUMMER}?text=${encodeURIComponent(text)}`, '_blank');
};

// Datenbank Funktionen
window.updateRow = async (i, k, v) => {
    if (userRole !== 'admin') return;
    allData.spiele[i][k] = v;
    await setDoc(DOC_REF, allData);
};

window.addEntry = async () => {
    if (userRole !== 'admin') return;
    allData.spiele.push({ date: "", time: "", hall: "", age: "", jsr1: "", jsr2: "", status: "Offen" });
    await setDoc(DOC_REF, allData);
};

window.deleteEntry = async (i) => {
    if (userRole === 'admin' && confirm("Löschen?")) {
        allData.spiele.splice(i, 1);
        await setDoc(DOC_REF, allData);
    }
};

function updateDashboard() {
    const offen = allData.spiele.filter(s => s.status === 'Offen').length;
    document.getElementById("dashboard").innerHTML = `
        <div class="stat-card" style="background:#3182ce;"><span>${allData.spiele.length}</span>Spiele</div>
        <div class="stat-card" style="background:#e53e3e;"><span>${offen}</span>Offen</div>
        <div class="stat-card" style="background:#38a169;"><span>${allData.spiele.length - offen}</span>Besetzt</div>
    `;
}