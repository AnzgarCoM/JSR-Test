import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const WHATSAPP_NUMMER = "4915204500763";

let userRole = null;
let allData = { spiele: [] };

// AUTH
window.handleLogin = () => {
    const email = document.getElementById("emailInput").value.trim();
    const pw = document.getElementById("pwInput").value;
    signInWithEmailAndPassword(auth, email, pw).catch(e => alert("Fehler: " + e.message));
};

window.handleLogout = () => signOut(auth).then(() => location.reload());

onAuthStateChanged(auth, (user) => {
    if (user) {
        userRole = (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'schiri';
        startApp();
    } else {
        document.getElementById("loginSection").style.display = "block";
        document.getElementById("mainContent").style.display = "none";
        document.getElementById("logoutBtn").style.display = "none";
    }
});

function startApp() {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("mainContent").style.display = "block";
    document.getElementById("logoutBtn").style.display = "block";
    document.getElementById("userStatus").innerText = userRole === 'admin' ? "👑 Administrator" : "🏃 Schiedsrichter-Bereich";
    
    if (userRole === 'admin') document.querySelectorAll('.admin-only').forEach(e => e.style.display = 'inline-block');

    onSnapshot(DOC_REF, (snap) => {
        if (snap.exists()) {
            allData.spiele = Array.isArray(snap.data().spiele) ? snap.data().spiele : [];
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
        
        // Turnier-Erkennung: Wenn "Turnier" im Namen steht, Zeile gelb färben
        if (item.age && item.age.toLowerCase().includes("turnier")) {
            tr.classList.add("is-tournament");
        }

        tr.innerHTML = `
            <td><input type="date" value="${item.date || ''}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'date',this.value)"></td>
            <td><input type="text" value="${item.time || ''}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'time',this.value)"></td>
            <td><input type="text" value="${item.hall || ''}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'hall',this.value)"></td>
            <td><input type="text" value="${item.age || ''}" placeholder="z.B. Turnier oder mB-Jugend" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'age',this.value)"></td>
            <td><input type="text" value="${item.jsr1 || ''}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'jsr1',this.value)"></td>
            <td><input type="text" value="${item.jsr2 || ''}" ${!isAdmin?'disabled':''} onchange="updateRow(${i},'jsr2',this.value)"></td>
            <td>
                <select ${!isAdmin?'disabled':''} onchange="updateRow(${i},'status',this.value)" style="font-weight:bold; color:${item.status==='Offen'?'#e53e3e':'#38a169'}">
                    <option value="Offen" ${item.status==='Offen'?'selected':''}>Offen</option>
                    <option value="Besetzt" ${item.status==='Besetzt'?'selected':''}>Besetzt</option>
                </select>
            </td>
            <td>
                ${item.status === 'Offen' ? 
                `<button class="whatsapp-btn" onclick="sendWhatsApp('${item.date}','${item.time}','${item.hall}','${item.age}')">Melden 🟢</button>` : 
                '<span style="color:#718096">Besetzt</span>'}
            </td>
            ${isAdmin ? `<td><button onclick="deleteEntry(${i})" style="background:none; border:none; cursor:pointer;">🗑️</button></td>` : ''}
        `;
        tbody.appendChild(tr);
    });
}

window.updateRow = async (i, k, v) => {
    if (userRole !== 'admin') return;
    allData.spiele[i][k] = v;
    await setDoc(DOC_REF, { spiele: allData.spiele });
};

window.addEntry = async () => {
    if (userRole !== 'admin') return;
    allData.spiele.unshift({ date: "", time: "", hall: "", age: "", jsr1: "", jsr2: "", status: "Offen" });
    await setDoc(DOC_REF, { spiele: allData.spiele });
};

window.deleteEntry = async (i) => {
    if (confirm("Löschen?")) {
        allData.spiele.splice(i, 1);
        await setDoc(DOC_REF, { spiele: allData.spiele });
    }
};

window.sendWhatsApp = (d, t, h, a) => {
    const text = encodeURIComponent(`Hallo! Ich möchte folgendes pfeifen:\n\n📅 Datum: ${d}\n⏰ Zeit: ${t}\n🏢 Halle: ${h}\n⚽ Spiel/Turnier: ${a}\n\nIst das noch frei?`);
    window.open(`https://wa.me/${WHATSAPP_NUMMER}?text=${text}`, '_blank');
};

function updateDashboard() {
    const offen = allData.spiele.filter(s => s.status === 'Offen').length;
    document.getElementById("dashboard").innerHTML = `
        <div class="stat-card" style="background:#3182ce;">${allData.spiele.length} Spiele gesamt</div>
        <div class="stat-card" style="background:#e53e3e;">${offen} Offene Spiele</div>
    `;
}
