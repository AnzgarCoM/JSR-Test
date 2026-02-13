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
const ADMIN_EMAIL = "sgmisburgjsr@outlook.de";
const MEINE_NUMMER = "4915204500763"; // <--- HIER DEINE HANDYNUMMER EINTRAGEN (49 vorne)

let userRole = null;
let allData = { spiele: [] };
let isRegistrationMode = false;

// --- LOGIN & AUTH ---
window.handleLogin = () => {
    const email = document.getElementById("emailInput").value.trim();
    const pw = document.getElementById("pwInput").value;
    signInWithEmailAndPassword(auth, email, pw).catch(e => alert("Login-Fehler: " + e.message));
};

window.handleRegister = () => {
    const email = document.getElementById("emailInput").value.trim();
    const pw = document.getElementById("pwInput").value;
    createUserWithEmailAndPassword(auth, email, pw).then(() => alert("Konto erstellt!")).catch(e => alert(e.message));
};

window.toggleAuthMode = () => {
    isRegistrationMode = !isRegistrationMode;
    document.getElementById("authTitle").innerText = isRegistrationMode ? "Registrieren" : "Login";
    document.getElementById("authButtons").innerHTML = isRegistrationMode ? 
        `<button onclick="handleRegister()" class="full-btn">Konto jetzt erstellen</button><button onclick="location.reload()" class="secondary-btn" style="margin-top:10px;">Zurück</button>` : 
        `<button onclick="handleLogin()" class="full-btn">Einloggen</button><button onclick="toggleAuthMode()" class="secondary-btn" style="margin-top:10px;">Registrieren</button>`;
};

window.forgotPassword = () => {
    const email = document.getElementById("emailInput").value.trim();
    if(!email) return alert("Gib erst deine E-Mail ein.");
    sendPasswordResetEmail(auth, email).then(() => alert("E-Mail gesendet!")).catch(e => alert(e.message));
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

// --- HAUPTFUNKTIONEN ---
function startApp() {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("mainContent").style.display = "block";
    document.getElementById("userStatus").innerText = userRole === 'admin' ? "Eingeloggt als Admin 👑" : "Eingeloggt als Schiedsrichter 🏃";
    
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

    // Automatische Sortierung nach Datum
    const sortierteSpiele = [...allData.spiele].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortierteSpiele.forEach((item, i) => {
        // Schiris sehen keine alten Spiele
        if (item.date && item.date < heute && !isAdmin) return;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><input type="date" value="${item.date}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'date',this.value)"></td>
            <td><input type="text" value="${item.time}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'time',this.value)"></td>
            <td><input type="text" value="${item.hall}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'hall',this.value)"></td>
            <td><input type="text" value="${item.age}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'age',this.value)"></td>
            <td><input type="text" value="${item.jsr1}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'jsr1',this.value)"></td>
            <td><input type="text" value="${item.jsr2}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'jsr2',this.value)"></td>
            <td>
                <select ${!isAdmin?'disabled':''} onchange="updateRow(${i},'status',this.value)" class="${item.status==='Offen'?'status-offen':'status-besetzt'}">
                    <option value="Offen" ${item.status==='Offen'?'selected':''}>Offen</option>
                    <option value="Besetzt" ${item.status==='Besetzt'?'selected':''}>Besetzt</option>
                </select>
            </td>
            <td>
                ${item.status === 'Offen' ? 
                `<button class="whatsapp-btn" onclick="sendWhatsApp('${item.date}','${item.time}','${item.age}','${item.hall}')">Melden 🟢</button>` : '---'}
            </td>
            ${isAdmin ? `<td><button onclick="deleteEntry(${i})" style="color:red; background:none; border:none; cursor:pointer; font-size:1.2rem;">🗑️</button></td>` : ''}
        `;
        tbody.appendChild(tr);
    });
}

window.sendWhatsApp = (date, time, age, hall) => {
    const msg = `Hallo! Ich möchte folgendes Spiel pfeifen:\n📅 Datum: ${date}\n⏰ Zeit: ${time}\n⚽ Spiel: ${age}\n🏢 Halle: ${hall}\n\nIst das noch frei?`;
    window.open(`https://wa.me/${MEINE_NUMMER}?text=${encodeURIComponent(msg)}`, '_blank');
};

window.updateRow = async (i, k, v) => {
    if (userRole !== 'admin') return;
    allData.spiele[i][k] = v;
    await setDoc(DOC_REF, allData);
};

window.addEntry = async () => {
    allData.spiele.push({ date: "", time: "", hall: "", age: "", jsr1: "", jsr2: "", status: "Offen" });
    await setDoc(DOC_REF, allData);
};

window.deleteEntry = async (i) => {
    if (confirm("Löschen?")) {
        allData.spiele.splice(i, 1);
        await setDoc(DOC_REF, allData);
    }
};

function updateDashboard() {
    const offen = allData.spiele.filter(s => s.status === 'Offen').length;
    document.getElementById("dashboard").innerHTML = `
        <div class="stat-card" style="background:#3b82f6;"><b>${allData.spiele.length}</b> Gesamt</div>
        <div class="stat-card" style="background:#ef4444;"><b>${offen}</b> Offen</div>
        <div class="stat-card" style="background:#22c55e;"><b>${allData.spiele.length - offen}</b> Besetzt</div>
    `;
}