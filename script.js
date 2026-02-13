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
const MEINE_NUMMER = "4917612345678"; // Deine Nummer hier!

let userRole = null;
let allData = { spiele: [] };

// --- LOGIN LOGIK ---
window.handleLogin = () => {
    const email = document.getElementById("emailInput").value.trim();
    const pw = document.getElementById("pwInput").value;
    signInWithEmailAndPassword(auth, email, pw).catch(e => alert("Fehler: " + e.message));
};

window.handleRegister = () => {
    const email = document.getElementById("emailInput").value.trim();
    const pw = document.getElementById("pwInput").value;
    createUserWithEmailAndPassword(auth, email, pw).then(() => alert("Konto erstellt!")).catch(e => alert(e.message));
};

window.forgotPassword = () => {
    const email = document.getElementById("emailInput").value.trim();
    if(!email) return alert("E-Mail eingeben!");
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

// --- HAUPT APP ---
function startApp() {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("mainContent").style.display = "block";
    document.getElementById("userStatus").innerText = userRole === 'admin' ? "Admin Modus 👑" : "Schiri Modus 🏃";
    
    if (userRole === 'admin') {
        document.querySelectorAll('.admin-only').forEach(e => e.style.display = 'inline-block');
    }

    onSnapshot(DOC_REF, (snap) => {
        if (snap.exists()) {
            allData = snap.data();
            renderTable();
            updateDashboard();
        } else if (userRole === 'admin') {
            // Initiales Dokument erstellen, falls gelöscht
            setDoc(DOC_REF, { spiele: [] });
        }
    });
}

function renderTable() {
    const tbody = document.querySelector("#spieleTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    const isAdmin = (userRole === 'admin');
    const heute = new Date().toISOString().split('T')[0];
    const spieleListe = allData.spiele || [];

    // Sortierung
    const sortierteSpiele = [...spieleListe].sort((a, b) => {
        return new Date(a.date || '9999-12-31') - new Date(b.date || '9999-12-31');
    });

    sortierteSpiele.forEach((item, i) => {
        if (item.date && item.date < heute && !isAdmin) return;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><input type="date" value="${item.date || ''}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'date',this.value)"></td>
            <td><input type="text" value="${item.time || ''}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'time',this.value)"></td>
            <td><input type="text" value="${item.hall || ''}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'hall',this.value)"></td>
            <td><input type="text" value="${item.age || ''}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'age',this.value)"></td>
            <td><input type="text" value="${item.jsr1 || ''}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'jsr1',this.value)"></td>
            <td><input type="text" value="${item.jsr2 || ''}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'jsr2',this.value)"></td>
            <td>
                <select ${!isAdmin?'disabled':''} onchange="updateRow(${i},'status',this.value)" class="${item.status==='Offen'?'status-offen':'status-besetzt'}">
                    <option value="Offen" ${item.status==='Offen'?'selected':''}>Offen</option>
                    <option value="Besetzt" ${item.status==='Besetzt'?'selected':''}>Besetzt</option>
                </select>
            </td>
            <td>
                <button class="whatsapp-btn" onclick="sendWhatsApp('${item.date || ''}','${item.time || ''}','${item.age || ''}','${item.hall || ''}')">Melden 🟢</button>
            </td>
            ${isAdmin ? `<td><button onclick="deleteEntry(${i})" style="color:red; background:none; border:none; cursor:pointer;">🗑️</button></td>` : ''}
        `;
        tbody.appendChild(tr);
    });
}

window.sendWhatsApp = (d, t, a, h) => {
    const msg = `Anmeldung JSR:\nDatum: ${d}\nZeit: ${t}\nSpiel: ${a}\nHalle: ${h}`;
    window.open(`https://wa.me/${MEINE_NUMMER}?text=${encodeURIComponent(msg)}`, '_blank');
};

window.updateRow = async (i, k, v) => {
    if (userRole !== 'admin') return;
    allData.spiele[i][k] = v;
    await setDoc(DOC_REF, allData);
};

window.addEntry = async () => {
    if (userRole !== 'admin') return;
    const neu = { date: "", time: "", hall: "", age: "", jsr1: "", jsr2: "", status: "Offen" };
    allData.spiele.push(neu);
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
        <div class="stat-card" style="background:#3182ce;"><b>${allData.spiele.length}</b> Gesamt</div>
        <div class="stat-card" style="background:#e53e3e;"><b>${offen}</b> Offen</div>
        <div class="stat-card" style="background:#38a169;"><b>${allData.spiele.length - offen}</b> Besetzt</div>
    `;
}