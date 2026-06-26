lucide.createIcons();

// Backend loyihangizning Render havolasi
const API_URL = 'https://rlfrontend.onrender.com';

let currentMode = 'reading';
let cardCounter = 0;

function switchTab(mode) {
    currentMode = mode;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${mode}`).classList.add('active');
    document.getElementById('cards-container').innerHTML = '';
    cardCounter = 0;
    updateCardCount();
}

function updateCardCount() {
    document.getElementById('card-count').innerText = cardCounter;
}

function addNewCard() {
    if (cardCounter >= 10) {
        alert("Maksimal 10 ta card qo'shish mumkin!");
        return;
    }
    cardCounter++;
    updateCardCount();

    const container = document.getElementById('cards-container');
    const cardId = `card-${cardCounter}`;

    const cardHtml = `
        <div class="task-card" id="${cardId}">
            <div class="card-header">
                <span>Task #${cardCounter}</span>
                <button type="button" class="delete-btn" onclick="removeCard('${cardId}')">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>

            <div class="media-input" onclick="document.getElementById('img-input-${cardId}').click()">
                <i data-lucide="image" class="icon"></i>
                <span id="img-label-${cardId}">Upload Task Image</span>
                <input type="file" name="images" id="img-input-${cardId}" accept="image/*" style="display:none;" onchange="previewFile('${cardId}', 'img')">
            </div>

            ${currentMode === 'listening' ? `
            <div class="media-input audio-input" onclick="document.getElementById('audio-input-${cardId}').click()">
                <i data-lucide="music" class="icon"></i>
                <span id="audio-label-${cardId}">Upload Audio File</span>
                <input type="file" name="audios" id="audio-input-${cardId}" accept="audio/*" style="display:none;" onchange="previewFile('${cardId}', 'audio')">
            </div>
            ` : ''}

            <div class="ai-output-placeholder" id="output-${cardId}">
                <p class="empty-text">Answers will appear here...</p>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', cardHtml);
    lucide.createIcons();
}

function removeCard(cardId) {
    document.getElementById(cardId).remove();
    cardCounter--;
    updateCardCount();
}

function previewFile(cardId, type) {
    const input = document.getElementById(`${type}-input-${cardId}`);
    const label = document.getElementById(`${type}-label-${cardId}`);
    if (input.files.length > 0) {
        label.innerText = input.files[0].name;
        label.parentElement.classList.add('uploaded');
    }
}

// Javoblar jadvalini chiqarish
function renderAnswerTable(answers) {
    if (!answers || Object.keys(answers).length === 0) {
        return `<p style="color:#ff453a; font-size:13px;">AI javob qaytarmadi. Rasmni aniqroq qiling.</p>`;
    }

    const rows = Object.entries(answers)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([num, word]) => `
            <tr>
                <td class="ans-num">${num}</td>
                <td class="ans-word">${word}</td>
            </tr>
        `).join('');

    return `
        <div class="answer-table-wrap">
            <p class="ans-title">✅ Javoblar</p>
            <table class="answer-table">
                <thead><tr><th>#</th><th>Javob</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

// Transcript bloki
function renderTranscript(transcript) {
    if (!transcript) return '';
    return `
        <div class="transcript-wrap">
            <details>
                <summary class="transcript-toggle">🎧 Audio Transcript ko'rish</summary>
                <div class="transcript-text">${transcript}</div>
            </details>
        </div>
    `;
}

// Form submit
document.getElementById('main-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (cardCounter === 0) return alert("Kamida 1 ta card qo'shing!");

    const formData = new FormData();
    formData.append('mode', currentMode);

    const taskCards = document.querySelectorAll('.task-card');
    taskCards.forEach((card) => {
        const cardId = card.id;
        const imgFile = document.getElementById(`img-input-${cardId}`).files[0];
        if (imgFile) formData.append('images', imgFile);

        if (currentMode === 'listening') {
            const audioFile = document.getElementById(`audio-input-${cardId}`)?.files[0];
            if (audioFile) formData.append('audios', audioFile);
        }
    });

    const progContainer = document.getElementById('progress-container');
    const progBar = document.getElementById('progress-bar');
    const progText = document.getElementById('progress-text');
    progContainer.style.display = 'block';

    let progress = 0;
    progBar.style.width = '0%';
    progText.innerText = '0%';

    const interval = setInterval(() => {
        if (progress < 95) {
            progress += Math.floor(Math.random() * 5) + 2;
            if (progress > 95) progress = 95;
            progBar.style.width = progress + '%';
            progText.innerText = progress + '%';
        }
    }, 200);

    try {
        // Bu yerda localhost o'rniga Render manzili ishlatilmoqda
        const response = await fetch(`${API_URL}/api/analyze-cards`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        clearInterval(interval);
        progBar.style.width = '100%';
        progText.innerText = '100%';

        setTimeout(() => {
            progContainer.style.display = 'none';

            if (data.error) {
                alert("Xatolik: " + data.error);
                return;
            }

            taskCards.forEach((card, index) => {
                const cardId = card.id;
                const outputDiv = document.getElementById(`output-${cardId}`);
                const result = data.results?.[index];

                if (result) {
                    outputDiv.innerHTML =
                        renderAnswerTable(result.answers) +
                        renderTranscript(result.transcript);
                } else {
                    outputDiv.innerHTML = `<p style="color:#ff453a;">No data returned for this card.</p>`;
                }
            });
        }, 400);

    } catch (err) {
        clearInterval(interval);
        progContainer.style.display = 'none';
        alert('Serverga ulanishda xatolik! Backend (Render) ishlab turganini va CORS sozlamalarini tekshiring.');
    }
});
