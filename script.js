/* =========================================================
   KRIX MUSIC — FRONTEND ONLY
   Gemini API + Music Search + Chords + Lyrics + Recorder
   ========================================================= */

let apiKey = "";
let currentSong = null;
let transposeAmount = 0;

let mediaRecorder = null;
let audioChunks = [];
let audioBlob = null;
let recordingStartTime = null;
let timerInterval = null;

/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}

function setButtonLoading(button, text = "Working") {
    if (!button) return;

    button.disabled = true;
    button.dataset.originalText = button.innerHTML;

    button.innerHTML = `
        ${text}
        <span class="loading-dots">
            <i></i><i></i><i></i>
        </span>
    `;
}

function restoreButton(button) {
    if (!button) return;

    button.disabled = false;

    if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
    }
}

function showMessage(message, type = "info") {
    const box = $("connectionMessage");

    if (!box) return;

    box.textContent = message;
    box.className = `connection-message ${type}`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* =========================================================
   GEMINI API
   ========================================================= */

async function callGemini(prompt) {
    if (!apiKey) {
        throw new Error("Please enter your Gemini API key first.");
    }

    const model = "gemini-3.6-flash";

    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const response = await fetch(url, {
        method: "POST",

        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
        },

        body: JSON.stringify({
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ],

            generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json"
            }
        })
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("Gemini error:", data);

        throw new Error(
            data?.error?.message ||
            `Gemini API request failed (${response.status})`
        );
    }

    const text =
        data?.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("")
            .trim();

    if (!text) {
        throw new Error("Gemini returned an empty response.");
    }

    try {
        return JSON.parse(text);
    } catch {
        console.error("Invalid JSON from Gemini:", text);
        throw new Error("KRIX received an invalid response from Gemini.");
    }
}

/* =========================================================
   TEST CONNECTION
   ========================================================= */

async function testConnection() {
    const input = $("apiKey");
    const button = $("testConnectionButton");

    const key = input?.value.trim();

    if (!key) {
        showMessage("Enter your Gemini API key first.", "error");
        return;
    }

    apiKey = key;

    setButtonLoading(button, "Testing");

    showMessage("Connecting to Gemini...", "info");

    try {
        const url =
            "https://generativelanguage.googleapis.com/v1beta/models";

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "x-goog-api-key": apiKey
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data?.error?.message ||
                `Connection failed (${response.status})`
            );
        }

        showMessage(
            "✓ KRIX is connected successfully.",
            "success"
        );

    } catch (error) {
        console.error(error);

        apiKey = "";

        showMessage(
            "✕ Connection failed: " + error.message,
            "error"
        );
    } finally {
        restoreButton(button);
    }
}

/* =========================================================
   FIND SONG
   ========================================================= */

async function findSong() {
    const songInput = $("songName");
    const artistInput = $("artistName");
    const instrumentInput = $("instrument");
    const button = $("findButton");

    const song = songInput?.value.trim();
    const artist = artistInput?.value.trim();
    const instrument = instrumentInput?.value || "guitar";

    if (!apiKey) {
        showMessage(
            "Test your Gemini API key before searching.",
            "error"
        );
        return;
    }

    if (!song) {
        alert("Enter a song name.");
        return;
    }

    setButtonLoading(button, "Finding");

    try {
        const prompt = `
You are KRIX, an AI music assistant.

Find information about this song:

Song: ${song}
Artist: ${artist || "Unknown"}
Instrument: ${instrument}

Return ONLY valid JSON.

Use this exact structure:

{
  "title": "Song title",
  "artist": "Artist",
  "key": "Musical key",
  "bpm": 100,
  "instrument": "${instrument}",
  "chords": [
    {
      "section": "Verse",
      "chords": ["C", "G", "Am", "F"]
    }
  ],
  "lyrics": "Only provide lyrics that are legally displayable. Do not reproduce full copyrighted lyrics that were not supplied by the user."
}

IMPORTANT:
- Do not invent song information if you are uncertain.
- Prefer accurate musical information.
- Chords must be suitable for the selected instrument.
- Keep chords separate from lyrics.
- Do NOT mix chords into the lyrics field.
- Do NOT include markdown.
`;

        const result = await callGemini(prompt);

        currentSong = result;
        transposeAmount = 0;

        displaySong(result);

        const workspace = $("workspace");

        if (workspace) {
            workspace.style.display = "block";
            workspace.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }

        showMessage(
            "✓ Song found by KRIX.",
            "success"
        );

    } catch (error) {
        console.error(error);

        showMessage(
            "✕ " + error.message,
            "error"
        );

    } finally {
        restoreButton(button);
    }
}

/* =========================================================
   DISPLAY SONG
   ========================================================= */

function displaySong(data) {
    if (!data) return;

    const title = $("songTitle");
    const artist = $("songArtist");
    const key = $("songKey");
    const bpm = $("songBpm");

    if (title) {
        title.textContent = data.title || "Unknown Song";
    }

    if (artist) {
        artist.textContent = data.artist || "";
    }

    if (key) {
        key.textContent = data.key || "Unknown";
    }

    if (bpm) {
        bpm.textContent = data.bpm
            ? `${data.bpm} BPM`
            : "BPM unavailable";
    }

    renderChords(data);
    renderLyrics(data);

    showMusicTab("chords");
}

/* =========================================================
   CHORDS
   ========================================================= */

function renderChords(data) {
    const container = $("chordsContent");

    if (!container) return;

    if (!Array.isArray(data.chords) || data.chords.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                No chord information found.
            </div>
        `;
        return;
    }

    container.innerHTML = data.chords
        .map(section => {
            const chords = Array.isArray(section.chords)
                ? section.chords
                : [];

            return `
                <div class="chord-section">
                    <h3>${escapeHtml(section.section || "Section")}</h3>

                    <div class="chord-list">
                        ${chords.map(chord => `
                            <span class="chord">
                                ${escapeHtml(
                                    transposeChord(chord, transposeAmount)
                                )}
                            </span>
                        `).join("")}
                    </div>
                </div>
            `;
        })
        .join("");
}

/* =========================================================
   LYRICS
   ========================================================= */

function renderLyrics(data) {
    const container = $("lyricsContent");

    if (!container) return;

    const lyrics = data.lyrics || "";

    if (!lyrics.trim()) {
        container.innerHTML = `
            <div class="empty-state">
                Lyrics are not available for display.
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="lyrics-text">
            ${escapeHtml(lyrics).replace(/\n/g, "<br>")}
        </div>
    `;
}

/* =========================================================
   TABS
   ========================================================= */

function showMusicTab(type) {
    const chordsTab = $("chordsTab");
    const lyricsTab = $("lyricsTab");

    const chordsContent = $("chordsContent");
    const lyricsContent = $("lyricsContent");

    if (type === "chords") {
        chordsTab?.classList.add("active");
        lyricsTab?.classList.remove("active");

        if (chordsContent) {
            chordsContent.style.display = "block";
        }

        if (lyricsContent) {
            lyricsContent.style.display = "none";
        }

    } else {
        lyricsTab?.classList.add("active");
        chordsTab?.classList.remove("active");

        if (lyricsContent) {
            lyricsContent.style.display = "block";
        }

        if (chordsContent) {
            chordsContent.style.display = "none";
        }
    }
}

/* =========================================================
   CHORD TRANSPOSITION
   ========================================================= */

const chromaticNotes = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B"
];

const flatToSharp = {
    "Db": "C#",
    "Eb": "D#",
    "Gb": "F#",
    "Ab": "G#",
    "Bb": "A#"
};

function transposeChord(chord, amount) {
    if (!chord || amount === 0) {
        return chord;
    }

    const match = chord.match(
        /^([A-G](?:#|b)?)(.*)$/
    );

    if (!match) {
        return chord;
    }

    let root = match[1];
    const suffix = match[2];

    root = flatToSharp[root] || root;

    const index = chromaticNotes.indexOf(root);

    if (index === -1) {
        return chord;
    }

    const newIndex =
        (index + amount + 12) % 12;

    return chromaticNotes[newIndex] + suffix;
}

function transpose(step) {
    transposeAmount += step;

    if (currentSong) {
        renderChords(currentSong);
    }

    const display = $("transposeValue");

    if (display) {
        display.textContent =
            transposeAmount > 0
                ? `+${transposeAmount}`
                : transposeAmount;
    }
}

/* =========================================================
   COPY CHORDS
   ========================================================= */

async function copyChords() {
    if (!currentSong?.chords) {
        return;
    }

    const text = currentSong.chords
        .map(section => {
            const chords = section.chords || [];

            return `${section.section || "Section"}\n` +
                chords
                    .map(chord =>
                        transposeChord(
                            chord,
                            transposeAmount
                        )
                    )
                    .join("  ");
        })
        .join("\n\n");

    try {
        await navigator.clipboard.writeText(text);

        showMessage(
            "✓ Chords copied.",
            "success"
        );

    } catch {
        alert("Could not copy chords.");
    }
}

/* =========================================================
   RECORDER
   ========================================================= */

async function requestMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) {
        alert(
            "Your browser does not support microphone recording."
        );
        return null;
    }

    try {
        return await navigator.mediaDevices.getUserMedia({
            audio: true
        });

    } catch (error) {
        console.error(error);

        alert(
            "Microphone permission was denied or unavailable."
        );

        return null;
    }
}

async function toggleRecording() {
    const button = $("recordButton");

    if (mediaRecorder &&
        mediaRecorder.state === "recording") {

        stopRecording();
        return;
    }

    const stream = await requestMicrophone();

    if (!stream) return;

    audioChunks = [];
    audioBlob = null;

    try {
        mediaRecorder = new MediaRecorder(stream);

    } catch (error) {
        console.error(error);

        alert(
            "Recording is not supported in this browser."
        );

        stream.getTracks().forEach(
            track => track.stop()
        );

        return;
    }

    mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
            audioChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = finishRecording;

    mediaRecorder.start();

    recordingStartTime = Date.now();

    timerInterval = setInterval(
        updateTimer,
        1000
    );

    if (button) {
        button.textContent = "⏹ Stop";
        button.classList.add("recording");
    }

    const timer = $("recordingTimer");

    if (timer) {
        timer.textContent = "00:00";
    }
}

function stopRecording() {
    if (!mediaRecorder) return;

    if (mediaRecorder.state === "recording") {
        mediaRecorder.stop();
    }

    mediaRecorder.stream
        ?.getTracks()
        .forEach(track => track.stop());

    clearInterval(timerInterval);

    const button = $("recordButton");

    if (button) {
        button.textContent = "🔴 Record";
        button.classList.remove("recording");
    }
}

function finishRecording() {
    audioBlob = new Blob(
        audioChunks,
        {
            type: mediaRecorder?.mimeType ||
                "audio/webm"
        }
    );

    const audioUrl =
        URL.createObjectURL(audioBlob);

    const audio = $("recordedAudio");

    if (audio) {
        audio.src = audioUrl;
        audio.style.display = "block";
    }

    const downloadButton =
        $("downloadRecording");

    const deleteButton =
        $("deleteRecording");

    if (downloadButton) {
        downloadButton.style.display =
            "inline-flex";
    }

    if (deleteButton) {
        deleteButton.style.display =
            "inline-flex";
    }

    mediaRecorder = null;
}

function updateTimer() {
    if (!recordingStartTime) return;

    const elapsed =
        Math.floor(
            (Date.now() - recordingStartTime) /
            1000
        );

    const minutes =
        Math.floor(elapsed / 60)
            .toString()
            .padStart(2, "0");

    const seconds =
        (elapsed % 60)
            .toString()
            .padStart(2, "0");

    const timer = $("recordingTimer");

    if (timer) {
        timer.textContent =
            `${minutes}:${seconds}`;
    }
}

function downloadRecording() {
    if (!audioBlob) {
        alert("There is no recording to download.");
        return;
    }

    const url =
        URL.createObjectURL(audioBlob);

    const link =
        document.createElement("a");

    link.href = url;
    link.download =
        `KRIX-recording-${Date.now()}.webm`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
}

function deleteRecording() {
    audioBlob = null;
    audioChunks = [];

    const audio = $("recordedAudio");

    if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        audio.style.display = "none";
    }

    $("downloadRecording")?.style.setProperty(
        "display",
        "none"
    );

    $("deleteRecording")?.style.setProperty(
        "display",
        "none"
    );

    const timer = $("recordingTimer");

    if (timer) {
        timer.textContent = "00:00";
    }
}

/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const apiInput = $("apiKey");

    if (apiInput) {
        apiInput.addEventListener(
            "input",
            () => {
                apiKey = apiInput.value.trim();
            }
        );
    }

    showMusicTab("chords");

});