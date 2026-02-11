import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Deine Firebase Konfiguration
const firebaseConfig = {
    apiKey: "AIzaSyCdFAyOvZb05CEXfVezonRUMvN4zb9xcoo",
    authDomain: "test-jsr1.firebaseapp.com",
    projectId: "test-jsr1",
    storageBucket: "test-jsr1.firebasestorage.app",
    messagingSenderId: "25804824117",
    appId: "1:25804824117:web:f6c2c1430c6227807fdb7c",
    measurementId: "G-0FRWEN958M"
};

// Initialisierung
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Verweis auf deine Test-Datenbank
const DOC_REF = doc(db, "plan", "test_struktur");
// DEINE ADMIN E-MAIL
const ADMIN_EMAIL = "SGMisburgJSR@outlook.de";

let userRole = null;
let allData = { spiele: [] };
let isRegistrationMode = false;

// --- AUTH FUNKTIONEN ---

window.toggleAuthMode = () => {
    isRegistrationMode = !isRegistrationMode;
    const title = document.getElementById("authTitle");
    const container = document.getElementById("authButtons");
    
    if (isRegistrationMode) {
        title.innerText = "Registrieren";
        container.innerHTML = `
            <button onclick="handleRegister()" class="full-btn" style="background: #38a169;">Konto erstellen</button>
            <p style="margin: 15px 0 5px 0; font-size: 0.8rem;">Schon ein Konto?</p>
            <button onclick="toggleAuthMode()" class="full-btn" style="background: #718096;">Zum Login</button>
        `;
    } else {
        title.innerText = "Login";
        container.innerHTML = `
            <button onclick="handleLogin()" class="full-btn">Einloggen</button>
            <p style="margin: 15px 0 5px 0; font-size: 0.8rem;">Neu hier?</p>
            <button onclick="toggleAuthMode()" class="full-btn" style="background: #718096;">Konto erstellen</button>
        `;
    }
};

window.handleLogin = () => {
    const email = document.getElementById("emailInput").value.trim();
    const pw = document.getElementById("pwInput").value;
    signInWithEmailAndPassword(auth, email, pw).catch(e => alert("Login-Fehler: " + e.message));
};

window.handleRegister = () => {
    const email = document.getElementById("emailInput").value.trim();
    const pw = document.getElementById("pwInput").value;
    if(pw.length < 6) { alert("Passwort muss min. 6 Zeichen haben!"); return; }
    createUserWithEmailAndPassword(auth, email, pw).catch(e => alert("Registrierungs-Fehler: " + e.message));
};

window.handleLogout = () => signOut(auth).then(() => location.reload());

// Beobachtet den Login-Status
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Prüfen ob Admin (Groß-/Kleinschreibung ignorieren zur Sicherheit)
        userRole = (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'schiri';
        console.log("Eingeloggt als:", user.email, "Rolle:", userRole);
        startApp();
    } else {
        document.getElementById("loginSection").style.display = "block";
        document.getElementById("mainContent").style.display = "none";
    }
});

// --- APP LOGIK ---

function startApp() {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("mainContent").style.display = "block";
    document.getElementById("userStatus").innerText = userRole === 'admin' ? "Admin-Bereich" : "Schiedsrichter (Lese-Modus)";
    
    // Admin-Buttons anzeigen
    if (userRole === 'admin') {
        document.querySelectorAll('.admin-only').forEach(e => e.style.display = 'inline-block');
    }

    // Daten aus Firestore laden
    onSnapshot(DOC_REF, (snap) => {
        if (snap.exists()) {
            allData = snap.data();
            renderTable();
            updateDashboard();
        } else if (userRole === 'admin') {
            // Falls das Dokument fehlt, leg es an
            setDoc(DOC_REF, { spiele: [] });
        }
    });
}

function renderTable() {
    const tbody = document.querySelector("#spieleTable tbody");
    tbody.innerHTML = "";
    const isAdmin = (userRole === 'admin');

    allData.spiele.forEach((item, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><input type="date" value="${item.date || ''}" ${!isAdmin ? 'disabled' : ''} onchange="updateRow(${i},'date',this.value)"></td>
            <td><input type="text" value="${item.time || ''}" ${!isAdmin ? 'disabled' : ''} onchange="updateRow(${i},'time',this.value)"></td>
            <td><input type="text" value="${item.hall || ''}" ${!isAdmin ? 'disabled' : ''} onchange="updateRow(${i},'hall',this.value)"></td>
            <td><input type="text" value="${item.age || ''}" ${!isAdmin ? 'disabled' : ''} onchange="updateRow(${i},'age',this.value)"></td>
            <td><input type="text" value="${item.jsr1 || ''}" ${!isAdmin ? 'disabled' : ''} onchange="updateRow(${i},'jsr1',this.value)"></td>
            <td><input type="text" value="${item.jsr2 || ''}" ${!isAdmin ? 'disabled' : ''} onchange="updateRow(${i},'jsr2',this.value)"></td>
            <td><input type="text" value="${item.bemerkung || ''}" ${!isAdmin ? 'disabled' : ''} onchange="updateRow(${i},'bemerkung',this.value)"></td>
            <td>
                <select ${!isAdmin ? 'disabled' : ''} onchange="updateRow(${i},'status',this.value)">
                    <option value="Offen" ${item.status === 'Offen' ? 'selected' : ''}>Offen</option>
                    <option value="Besetzt" ${item.status === 'Besetzt' ? 'selected' : ''}>Besetzt</option>
                </select>
            </td>
            ${isAdmin ? `<td><button onclick="deleteEntry(${i})" class="del-btn">🗑️</button></td>` : ''}
        `;
        tbody.appendChild(tr);
    });
}

// --- DATEN-ÄNDERUNGEN ---

window.updateRow = async (i, k, v) => {
    if (userRole !== 'admin') return;
    allData.spiele[i][k] = v;
    await setDoc(DOC_REF, allData);
};

window.addEntry = async () => {
    if (userRole !== 'admin') return;
    const neu = { date: "", time: "", hall: "", age: "", jsr1: "", jsr2: "", bemerkung: "", status: "Offen" };
    allData.spiele.push(neu);
    await setDoc(DOC_REF, allData);
};

window.deleteEntry = async (i) => {
    if (userRole === 'admin' && confirm("Eintrag wirklich löschen?")) {
        allData.spiele.splice(i, 1);
        await setDoc(DOC_REF, allData);
    }
};

function updateDashboard() {
    const offen = allData.spiele.filter(s => s.status === 'Offen').length;
    const gesamt = allData.spiele.length;
    document.getElementById("dashboard").innerHTML = `
        <div class="stat-card blue-card"><span>${gesamt}</span><br>Gesamt</div>
        <div class="stat-card red-card"><span>${offen}</span><br>Offen</div>
        <div class="stat-card green-card"><span>${gesamt-offen}</span><br>Besetzt</div>
    `;
}