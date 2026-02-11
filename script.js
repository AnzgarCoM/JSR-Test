import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCdFAyOvZb05CEXfVezonRUMvN4zb9xcoo",
    authDomain: "test-jsr1.firebaseapp.com",
    projectId: "test-jsr1",
    storageBucket: "test-jsr1.firebasestorage.app",
    messagingSenderId: "25804824117",
    appId: "1:25804824117:web:f6c2c1430c6227807fdb7c",
    measurementId: "G-0FRWEN958M"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const DOC_REF = doc(db, "plan", "test_struktur");
const ADMIN_EMAIL = "deine-admin@email.de"; // HIER DEINE EMAIL EINTRAGEN!

let userRole = null;
let allData = { spiele: [] };
let calendar = null;
let isRegistrationMode = false;

// AUTH LOGIK
window.toggleAuthMode = () => {
    isRegistrationMode = !isRegistrationMode;
    document.getElementById("authTitle").innerText = isRegistrationMode ? "Registrieren" : "Login";
    const btnContainer = document.getElementById("authButtons");
    if (isRegistrationMode) {
        btnContainer.innerHTML = `
            <button onclick="handleRegister()" class="full-btn" style="background: #38a169;">Konto erstellen</button>
            <p style="margin: 15px 0 5px 0; font-size: 0.9rem;">Bereits ein Konto?</p>
            <button onclick="toggleAuthMode()" class="full-btn" style="background: #718096;">Zum Login</button>`;
    } else { location.reload(); }
};

window.handleLogin = () => {
    const email = document.getElementById("emailInput").value;
    const pw = document.getElementById("pwInput").value;
    signInWithEmailAndPassword(auth, email, pw).catch(e => alert("Login fehlgeschlagen: " + e.message));
};

window.handleRegister = () => {
    const email = document.getElementById("emailInput").value;
    const pw = document.getElementById("pwInput").value;
    if(pw.length < 6) { alert("Passwort zu kurz!"); return; }
    createUserWithEmailAndPassword(auth, email, pw).catch(e => alert("Registrierung fehlgeschlagen: " + e.message));
};

window.handleLogout = () => signOut(auth).then(() => location.reload());

onAuthStateChanged(auth, (user) => {
    if (user) {
        userRole = (user.email === ADMIN_EMAIL) ? 'admin' : 'schiri';
        startApp();
    } else {
        document.getElementById("loginSection").style.display = "block";
        document.getElementById("mainContent").style.display = "none";
    }
});

function startApp() {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("mainContent").style.display = "block";
    document.getElementById("userStatus").innerText = userRole === 'admin' ? "Admin" : "Schiedsrichter";
    if (userRole === 'admin') document.querySelectorAll('.admin-only').forEach(e => e.style.display = 'block');

    const isMobile = window.innerWidth < 800;
    calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
        initialView: isMobile ? 'listMonth' : 'dayGridMonth',
        locale: 'de', height: 'auto'
    });
    calendar.render();

    onSnapshot(DOC_REF, (snap) => {
        if (snap.exists()) {
            allData = snap.data();
            renderAll();
        } else if (userRole === 'admin') {
            setDoc(DOC_REF, { spiele: [] });
        }
    });
}

function renderAll() {
    renderTable("spieleTable", allData.spiele);
    renderMobileCards("spieleMobile", allData.spiele);
    updateDashboard();
    updateCalendar();
}

function renderTable(id, data) {
    const tbody = document.querySelector(`#${id} tbody`);
    tbody.innerHTML = "";
    data.forEach((item, i) => {
        const tr = document.createElement("tr");
        const isAdmin = userRole === 'admin';
        tr.innerHTML = `
            <td><input type="date" value="${item.date}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'date',this.value)"></td>
            <td><input type="text" value="${item.time}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'time',this.value)"></td>
            <td><input type="text" value="${item.hall}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'hall',this.value)"></td>
            <td><input type="text" value="${item.age}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'age',this.value)"></td>
            <td><input type="text" value="${item.jsr1}" onchange="updateRow(${i},'jsr1',this.value)"></td>
            <td><input type="text" value="${item.jsr2}" onchange="updateRow(${i},'jsr2',this.value)"></td>
            <td><input type="text" value="${item.bemerkung}" onchange="updateRow(${i},'bemerkung',this.value)"></td>
            <td><select onchange="updateRow(${i},'status',this.value)">
                <option value="Offen" ${item.status==='Offen'?'selected':''}>Offen</option>
                <option value="Besetzt" ${item.status==='Besetzt'?'selected':''}>Besetzt</option>
            </select></td>
            ${isAdmin ? `<td><button onclick="deleteEntry(${i})">🗑️</button></td>` : ''}
        `;
        tbody.appendChild(tr);
    });
}

function renderMobileCards(id, data) {
    const container = document.getElementById(id);
    container.innerHTML = "";
    data.forEach((item, i) => {
        const div = document.createElement("div");
        div.className = `mobile-card ${item.status==='Offen'?'offen':'besetzt'}`;
        div.innerHTML = `<strong>${item.date || 'Kein Datum'}</strong> - ${item.time || ''}<br>${item.age} | ${item.hall}<br>JSR: ${item.jsr1 || 'Offen'}<br>Status: ${item.status}`;
        container.appendChild(div);
    });
}

window.updateRow = async (i, k, v) => {
    allData.spiele[i][k] = v;
    await setDoc(DOC_REF, allData);
};

window.addEntry = async () => {
    if(userRole !== 'admin') return;
    allData.spiele.push({ date: "", time: "", hall: "", age: "", jsr1: "", jsr2: "", bemerkung: "", status: "Offen" });
    await setDoc(DOC_REF, allData);
};

window.deleteEntry = async (i) => {
    if(userRole === 'admin' && confirm("Löschen?")) {
        allData.spiele.splice(i, 1);
        await setDoc(DOC_REF, allData);
    }
};

function updateDashboard() {
    const offen = allData.spiele.filter(s => s.status === 'Offen').length;
    const gesamt = allData.spiele.length;
    document.getElementById("dashboard").innerHTML = `
        <div class="stat-card blue-card"><span>${gesamt}</span><br><small>Gesamt</small></div>
        <div class="stat-card red-card"><span>${offen}</span><br><small>Offen</small></div>
        <div class="stat-card green-card"><span>${gesamt-offen}</span><br><small>Besetzt</small></div>`;
}

function updateCalendar() {
    calendar.removeAllEvents();
    allData.spiele.forEach(s => {
        if (s.date) calendar.addEvent({ title: s.age, start: s.date, color: s.status==='Offen'?'#e53e3e':'#3182ce' });
    });
}