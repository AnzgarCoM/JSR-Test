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

let userRole = null;
let allData = { spiele: [] };

// --- AUTH ---
window.handleLogin = () => {
    const email = document.getElementById("emailInput").value.trim();
    const pw = document.getElementById("pwInput").value;
    signInWithEmailAndPassword(auth, email, pw).catch(e => alert("Fehler: " + e.message));
};

window.forgotPassword = () => {
    const email = document.getElementById("emailInput").value.trim();
    if(!email) return alert("Bitte E-Mail eingeben!");
    sendPasswordResetEmail(auth, email).then(() => alert("Link zum Zurücksetzen gesendet!")).catch(e => alert(e.message));
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        userRole = (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'schiri';
        document.getElementById("loginSection").style.display = "none";
        document.getElementById("mainContent").style.display = "block";
        startApp();
    } else {
        document.getElementById("loginSection").style.display = "block";
        document.getElementById("mainContent").style.display = "none";
    }
});

window.handleLogout = () => signOut(auth).then(() => location.reload());

// --- CORE APP ---
function startApp() {
    document.getElementById("userStatus").innerText = "Eingeloggt: " + auth.currentUser.email + " (" + userRole + ")";
    if(userRole === 'admin') document.querySelectorAll('.admin-only').forEach(e => e.style.display = 'inline-block');

    onSnapshot(DOC_REF, (snap) => {
        if (snap.exists()) {
            allData = snap.data();
            renderTable();
            updateDashboard();
        }
    });
}

function renderTable() {
    const tbody = document.querySelector("#spieleTable tbody");
    tbody.innerHTML = "";
    const isAdmin = (userRole === 'admin');
    const heute = new Date().toISOString().split('T')[0];

    // SORTIERUNG: Nach Datum aufsteigend
    const sortierteSpiele = [...allData.spiele].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortierteSpiele.forEach((item, originalIndex) => {
        // ARCHIV: Nur heutige oder zukünftige Spiele anzeigen
        if (item.date && item.date < heute && !isAdmin) return; 

        const tr = document.createElement("tr");
        if(item.date < heute) tr.style.opacity = "0.5"; // Vergangene Spiele für Admin ausgrauen

        tr.innerHTML = `
            <td><input type="date" value="${item.date}" ${!isAdmin?'disabled':''} onchange="updateRow(${originalIndex},'date',this.value)"></td>
            <td><input type="text" value="${item.time}" ${!isAdmin?'disabled':''} onchange="updateRow(${originalIndex},'time',this.value)"></td>
            <td><input type="text" value="${item.hall}" ${!isAdmin?'disabled':''} onchange="updateRow(${originalIndex},'hall',this.value)"></td>
            <td><input type="text" value="${item.age}" ${!isAdmin?'disabled':''} onchange="updateRow(${originalIndex},'age',this.value)"></td>
            <td><input type="text" value="${item.jsr1}" ${!isAdmin?'disabled':''} onchange="updateRow(${originalIndex},'jsr1',this.value)"></td>
            <td><input type="text" value="${item.jsr2}" ${!isAdmin?'disabled':''} onchange="updateRow(${originalIndex},'jsr2',this.value)"></td>
            <td>
                <select ${!isAdmin?'disabled':''} onchange="updateRow(${originalIndex},'status',this.value)">
                    <option value="Offen" ${item.status==='Offen'?'selected':''}>Offen</option>
                    <option value="Besetzt" ${item.status==='Besetzt'?'selected':''}>Besetzt</option>
                </select>
            </td>
            <td>
                ${!isAdmin && item.status === 'Offen' ? `<button class="request-btn" onclick="sendRequest('${item.date}', '${item.age}')">Übernehmen</button>` : '-'}
            </td>
            ${isAdmin ? `<td><button onclick="deleteEntry(${originalIndex})">🗑️</button></td>` : ''}
        `;
        tbody.appendChild(tr);
    });
}

// INTERESSE-BUTTON: Öffnet E-Mail Programm
window.sendRequest = (date, team) => {
    const subject = encodeURIComponent("JSR Einsatzmeldung");
    const body = encodeURIComponent(`Hallo Admin,\n\nich möchte gerne das Spiel am ${date} bei der ${team} pfeifen.\n\nSchiri: ${auth.currentUser.email}`);
    window.location.href = `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`;
};

window.updateRow = async (i, k, v) => {
    if(userRole !== 'admin') return;
    allData.spiele[i][k] = v;
    await setDoc(DOC_REF, allData);
};

window.addEntry = async () => {
    allData.spiele.push({ date: "", time: "", hall: "", age: "", jsr1: "", jsr2: "", status: "Offen" });
    await setDoc(DOC_REF, allData);
};

window.deleteEntry = async (i) => {
    if(confirm("Löschen?")) {
        allData.spiele.splice(i, 1);
        await setDoc(DOC_REF, allData);
    }
};

function updateDashboard() {
    const offen = allData.spiele.filter(s => s.status === 'Offen').length;
    document.getElementById("dashboard").innerHTML = `
        <div class="stat-card blue"><span>${allData.spiele.length}</span><br>Gesamt</div>
        <div class="stat-card red"><span>${offen}</span><br>Offen</div>
        <div class="stat-card green"><span>${allData.spiele.length - offen}</span><br>Besetzt</div>
    `;
}