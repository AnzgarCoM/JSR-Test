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
const MEINE_NUMMER = "4917612345678"; 

let userRole = null;
let allData = { spiele: [] };

// --- AUTH ---
window.handleLogin = () => {
    const email = document.getElementById("emailInput").value.trim();
    const pw = document.getElementById("pwInput").value;
    signInWithEmailAndPassword(auth, email, pw).catch(e => alert("Login-Fehler: " + e.message));
};

window.handleRegister = () => {
    const email = document.getElementById("emailInput").value.trim();
    const pw = document.getElementById("pwInput").value;
    createUserWithEmailAndPassword(auth, email, pw).catch(e => alert(e.message));
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

// --- APP ---
function startApp() {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("mainContent").style.display = "block";
    document.getElementById("userStatus").innerText = "Modus: " + (userRole === 'admin' ? "Admin" : "Schiri");
    if (userRole === 'admin') document.querySelectorAll('.admin-only').forEach(e => e.style.display = 'inline-block');

    onSnapshot(DOC_REF, (snap) => {
        if (snap.exists()) {
            let data = snap.data();
            // FEHLERSCHUTZ: Falls 'spiele' kein Array ist, reparieren
            allData.spiele = Array.isArray(data.spiele) ? data.spiele : [];
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

    allData.spiele.forEach((item, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><input type="date" value="${item.date || ''}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'date',this.value)"></td>
            <td><input type="text" value="${item.time || ''}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'time',this.value)"></td>
            <td><input type="text" value="${item.hall || ''}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'hall',this.value)"></td>
            <td><input type="text" value="${item.age || ''}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'age',this.value)"></td>
            <td><input type="text" value="${item.jsr1 || ''}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'jsr1',this.value)"></td>
            <td><input type="text" value="${item.jsr2 || ''}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'jsr2',this.value)"></td>
            <td>
                <select ${!isAdmin?'disabled':''} onchange="updateRow(${i},'status',this.value)">
                    <option value="Offen" ${item.status==='Offen'?'selected':''}>Offen</option>
                    <option value="Besetzt" ${item.status==='Besetzt'?'selected':''}>Besetzt</option>
                </select>
            </td>
            <td><button class="whatsapp-btn" onclick="sendWhatsApp('${item.date}','${item.age}')">Melden</button></td>
            ${isAdmin ? `<td><button onclick="deleteEntry(${i})">🗑️</button></td>` : ''}
        `;
        tbody.appendChild(tr);
    });
}

window.updateRow = async (i, k, v) => {
    if (userRole !== 'admin') return;
    // Sicherstellen, dass wir auf ein Objekt zugreifen
    if (typeof allData.spiele[i] !== 'object') allData.spiele[i] = {};
    allData.spiele[i][k] = v;
    await setDoc(DOC_REF, { spiele: allData.spiele });
};

window.addEntry = async () => {
    if (userRole !== 'admin') return;
    // Falls 'spiele' durch Fehler in Firebase zum String wurde, hier fixen:
    if (!Array.isArray(allData.spiele)) allData.spiele = [];
    
    allData.spiele.push({ date: "", time: "", hall: "", age: "", jsr1: "", jsr2: "", status: "Offen" });
    await setDoc(DOC_REF, { spiele: allData.spiele });
};

window.deleteEntry = async (i) => {
    if (confirm("Löschen?")) {
        allData.spiele.splice(i, 1);
        await setDoc(DOC_REF, { spiele: allData.spiele });
    }
};

window.sendWhatsApp = (d, a) => {
    const text = encodeURIComponent(`Ich möchte das Spiel am ${d} (${a}) pfeifen.`);
    window.open(`https://wa.me/${MEINE_NUMMER}?text=${text}`, '_blank');
};

function updateDashboard() {
    const offen = allData.spiele.filter(s => s.status === 'Offen').length;
    document.getElementById("dashboard").innerHTML = `
        <div class="stat-card" style="background:#3182ce;">${allData.spiele.length} Gesamt</div>
        <div class="stat-card" style="background:#e53e3e;">${offen} Offen</div>
    `;
}