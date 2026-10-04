/* =========================================================
   KRIX MUSIC
   FRONTEND ONLY
   No backend
   ========================================================= */

let apiKey = "";
let currentSong = null;
let transposeAmount = 0;
let activeMusicTab = "chords";

/* =========================================================
   RECORDER VARIABLES
   ========================================================= */

let mediaRecorder = null;
let audioChunks = [];
let audioBlob = null;
let recordingStartTime = null;
let timerInterval = null;


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function $(id) {
    return document.getElementById(id);
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
   STATUS
   ========================================================= */

function showMessage(message, type = "info") {

    const box = $("connectionMessage");

    if (box) {
        box.textContent = message;
        box.className =
            "connection-message " + type;
    }

    const searchStatus = $("searchStatus");

    if (searchStatus) {
        searchStatus.textContent = message;
        searchStatus.className =
            "search-status " + type;
    }
}


function setConnectionStatus(connected) {

    const text = $("connectionText");

    if (text) {
        text.textContent =
            connected
                ? "API Connected"
                : "API Not Connected";
    }

    const status = $("connectionStatus");

    if (status) {
        status.classList.toggle(
            "connected",
            connected
        );
    }
}


/* =========================================================
   BUTTON LOADING
   ========================================================= */

function startLoading(button, text) {

    if (!button) return;

    button.disabled = true;

    button.dataset.oldText =
        button.innerHTML;

    button.innerHTML = `
        ${escapeHtml(text)}
        <span class="loading-dots">
            <i></i>
            <i></i>
            <i></i>
        </span>
    `;
}


function stopLoading(button) {

    if (!button) return;

    button.disabled = false;

    if (button.dataset.oldText) {
        button.innerHTML =
            button.dataset.oldText;
    }
}


/* =========================================================
   GEMINI CONFIG
   ========================================================= */

const GEMINI_MODEL =
    "gemini-3.8-flash";

const GEMINI_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;


/* =========================================================
   GEMINI REQUEST
   ========================================================= */

async function callGemini(prompt) {

    if (!apiKey) {
        throw new Error(
            "Enter your Gemini API key first."
        );
    }

    const response = await fetch(
        GEMINI_URL,
        {
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

                    responseMimeType:
                        "application/json"
                }
            })
        }
    );


    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error(
            "KRIX received an invalid response from Gemini."
        );
    }


    if (!response.ok) {

        const message =
            data?.error?.message ||
            `Gemini error ${response.status}`;

        throw new Error(message);
    }


    const text =
        data?.candidates?.[0]
            ?.content?.parts
            ?.map(part => part.text || "")
            .join("")
            .trim();


    if (!text) {

        throw new Error(
            "Gemini returned no result."
        );
    }


    try {

        return JSON.parse(text);

    } catch (error) {

        console.error(
            "Gemini returned:",
            text
        );

        throw new Error(
            "KRIX could not read Gemini's response."
        );
    }
}


/* =========================================================
   TEST CONNECTION
   ========================================================= */

async function testConnection() {

    const input = $("apiKey");
    const button =
        $("testConnectionButton");

    const key =
        input?.value?.trim();


    if (!key) {

        showMessage(
            "Enter your Gemini API key first.",
            "error"
        );

        return;
    }


    apiKey = key;

    startLoading(
        button,
        "Testing"
    );


    showMessage(
        "Connecting to KRIX...",
        "info"
    );


    try {

        /*
         * Use a tiny GenerateContent request
         * instead of the /models endpoint.
         *
         * This tests both:
         * 1. API key
         * 2. Selected model
         */

        const response =
            await fetch(
                GEMINI_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "x-goog-api-key":
                            apiKey
                    },

                    body: JSON.stringify({

                        contents: [
                            {
                                role: "user",

                                parts: [
                                    {
                                        text:
                                            "Reply with exactly: KRIX_OK"
                                    }
                                ]
                            }
                        ],

                        generationConfig: {
                            temperature: 0
                        }
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data?.error?.message ||
                `Connection failed (${response.status})`
            );
        }


        setConnectionStatus(true);


        showMessage(
            "✓ KRIX connected successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Connection error:",
            error
        );


        setConnectionStatus(false);


        showMessage(
            "✕ " + error.message,
            "error"
        );

    } finally {

        stopLoading(button);
    }
}


/* =========================================================
   FIND SONG
   ========================================================= */

async function findSong() {

    const song =
        $("songName")?.value?.trim();

    const artist =
        $("artistName")?.value?.trim();

    const instrument =
        $("instrument")?.value ||
        "guitar";

    const button =
        $("findButton");


    if (!apiKey) {

        showMessage(
            "Connect KRIX first using Test Connection.",
            "error"
        );

        return;
    }


    if (!song) {

        showMessage(
            "Enter a song name.",
            "error"
        );

        return;
    }


    startLoading(
        button,
        "Finding"
    );


    showMessage(
        "KRIX is searching the music universe...",
        "info"
    );


    try {

        const prompt = `

You are KRIX, an AI music assistant.

Find accurate musical information for:

SONG:
${song}

ARTIST:
${artist || "Unknown"}

INSTRUMENT:
${instrument}


Return ONLY valid JSON.

Use EXACTLY this structure:

{
  "title": "Song title",
  "artist": "Artist name",
  "key": "C",
  "bpm": 100,
  "instrument": "${instrument}",
  "chords": [
    {
      "section": "Verse",
      "chords": ["C", "G", "Am", "F"]
    },
    {
      "section": "Chorus",
      "chords": ["F", "G", "C"]
    }
  ],
  "lyrics": ""
}


RULES:

1. Identify the correct song and artist.

2. Give the musical key if known.

3. Give the BPM if known.

4. Give practical chords for the selected instrument.

5. Put chords ONLY inside the chords array.

6. Keep each song section separate.

7. Do not put chords inside the lyrics field.

8. Do not invent information when you are uncertain.

9. For copyrighted songs, DO NOT reproduce the full copyrighted lyrics.
   The lyrics field must remain empty unless the user supplied the lyrics.

10. Return JSON only.

`;


        const result =
            await callGemini(prompt);


        currentSong = normalizeSong(result);


        transposeAmount = 0;


        displaySong(
            currentSong
        );


        const workspace =
            $("workspace");


        if (workspace) {

            workspace.style.display =
                "block";

            setTimeout(() => {

                workspace.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }, 100);
        }


        showMessage(
            "✓ KRIX found the song.",
            "success"
        );


    } catch (error) {

        console.error(
            "Song search error:",
            error
        );


        showMessage(
            "✕ " + error.message,
            "error"
        );

    } finally {

        stopLoading(button);
    }
}


/* =========================================================
   NORMALIZE RESULT
   ========================================================= */

function normalizeSong(data) {

    const result = {

        title:
            data?.title ||
            "Unknown Song",

        artist:
            data?.artist ||
            "Unknown Artist",

        key:
            data?.key ||
            "",

        bpm:
            data?.bpm ||
            "",

        instrument:
            data?.instrument ||
            $("instrument")?.value ||
            "guitar",

        chords:
            Array.isArray(data?.chords)
                ? data.chords
                : [],

        lyrics:
            typeof data?.lyrics === "string"
                ? data.lyrics
                : ""
    };


    /*
     * Make sure every chord section
     * has a proper chords array.
     */

    result.chords =
        result.chords.map(section => {

            return {

                section:
                    section?.section ||
                    "Section",

                chords:
                    Array.isArray(
                        section?.chords
                    )
                        ? section.chords
                        : []
            };
        });


    return result;
}


/* =========================================================
   DISPLAY SONG
   ========================================================= */

function displaySong(data) {

    if (!data) return;


    /*
     * TOP RESULT CARD
     */

    const outputSong =
        $("outputSong");

    const outputArtist =
        $("outputArtist");

    const outputInstrument =
        $("outputInstrument");

    const bpm =
        $("bpm");


    if (outputSong) {

        outputSong.textContent =
            data.title;
    }


    if (outputArtist) {

        outputArtist.textContent =
            data.artist;
    }


    if (outputInstrument) {

        outputInstrument.textContent =
            getInstrumentLabel(
                data.instrument
            );
    }


    if (bpm) {

        let bpmText =
            data.bpm
                ? `${data.bpm} BPM`
                : "-- BPM";


        if (data.key) {

            bpmText +=
                ` • ${data.key}`;
        }


        bpm.textContent =
            bpmText;
    }


    /*
     * MUSIC SHEET CARD
     */

    const sheetTitle =
        $("sheetTitle");

    const sheetArtist =
        $("sheetArtist");


    if (sheetTitle) {

        sheetTitle.textContent =
            data.title;
    }


    if (sheetArtist) {

        sheetArtist.textContent =
            data.artist;
    }


    /*
     * RESET TRANSPOSE
     */

    transposeAmount = 0;


    const transposeValue =
        $("transposeValue");


    if (transposeValue) {

        transposeValue.textContent =
            "0";
    }


    /*
     * DEFAULT TO CHORDS
     */

    activeMusicTab =
        "chords";


    showMusicTab(
        "chords"
    );
}


/* =========================================================
   INSTRUMENT LABEL
   ========================================================= */

function getInstrumentLabel(
    instrument
) {

    const labels = {

        guitar:
            "🎸 Guitar",

        piano:
            "🎹 Piano",

        flute:
            "🪈 Flute",

        ukulele:
            "🎵 Ukulele",

        violin:
            "🎻 Violin",

        keyboard:
            "🎹 Keyboard"
    };


    return (
        labels[instrument] ||
        "🎵 " + instrument
    );
}


/* =========================================================
   MUSIC TABS
   ========================================================= */

function showMusicTab(type) {

    activeMusicTab =
        type;


    const chordsTab =
        $("chordsTab");

    const lyricsTab =
        $("lyricsTab");


    if (chordsTab) {

        chordsTab.classList.toggle(
            "active",
            type === "chords"
        );
    }


    if (lyricsTab) {

        lyricsTab.classList.toggle(
            "active",
            type === "lyrics"
        );
    }


    renderMusicContent();
}


/* =========================================================
   MUSIC CONTENT
   ========================================================= */

function renderMusicContent() {

    const container =
        $("songContent");


    if (!container) return;


    if (!currentSong) {

        container.innerHTML = "";

        return;
    }


    if (
        activeMusicTab ===
        "chords"
    ) {

        renderChords(
            container
        );

    } else {

        renderLyrics(
            container
        );
    }
}


/* =========================================================
   RENDER CHORDS
   ========================================================= */

function renderChords(
    container
) {

    const sections =
        currentSong.chords;


    if (
        !Array.isArray(sections) ||
        sections.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                No chords were found.
            </div>
        `;

        return;
    }


    container.innerHTML =
        sections
            .map(section => {

                const chords =
                    Array.isArray(
                        section.chords
                    )
                        ? section.chords
                        : [];


                return `

                    <div class="chord-section">

                        <h3>
                            ${escapeHtml(
                                section.section
                            )}
                        </h3>

                        <div class="chord-list">

                            ${
                                chords.length
                                    ? chords
                                        .map(chord => {

                                            const
                                                transposed =
                                                transposeChord(
                                                    chord,
                                                    transposeAmount
                                                );

                                            return `
                                                <span class="chord">
                                                    ${escapeHtml(
                                                        transposed
                                                    )}
                                                </span>
                                            `;

                                        })
                                        .join("")
                                    : `
                                        <span>
                                            No chords
                                        </span>
                                    `
                            }

                        </div>

                    </div>

                `;

            })
            .join("");
}


/* =========================================================
   RENDER LYRICS
   ========================================================= */

function renderLyrics(
    container
) {

    const lyrics =
        currentSong.lyrics ||
        "";


    if (!lyrics.trim()) {

        container.innerHTML = `

            <div class="empty-state">

                <p>
                    Full copyrighted lyrics
                    aren't displayed by KRIX.
                </p>

                <p>
                    Chords are available in
                    the Chords tab.
                </p>

            </div>

        `;

        return;
    }


    container.innerHTML = `

        <div class="lyrics-text">

            ${escapeHtml(
                lyrics
            ).replace(
                /\n/g,
                "<br>"
            )}

        </div>

    `;
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

    Db: "C#",
    Eb: "D#",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#"
};


function transposeChord(
    chord,
    amount
) {

    if (
        !chord ||
        amount === 0
    ) {

        return chord;
    }


    const match =
        String(chord).match(
            /^([A-G](?:#|b)?)(.*)$/
        );


    if (!match) {

        return chord;
    }


    let root =
        match[1];

    const suffix =
        match[2];


    root =
        flatToSharp[root] ||
        root;


    const index =
        chromaticNotes.indexOf(
            root
        );


    if (index === -1) {

        return chord;
    }


    const newIndex =
        (
            index +
            amount +
            12
        ) % 12;


    return (
        chromaticNotes[newIndex] +
        suffix
    );
}


/* =========================================================
   TRANSPOSE BUTTON
   ========================================================= */

function transpose(step) {

    transposeAmount +=
        step;


    /*
     * Keep value between
     * -11 and +11.
     */

    if (
        transposeAmount > 11
    ) {

        transposeAmount = 11;
    }


    if (
        transposeAmount < -11
    ) {

        transposeAmount = -11;
    }


    const display =
        $("transposeValue");


    if (display) {

        if (
            transposeAmount > 0
        ) {

            display.textContent =
                "+" +
                transposeAmount;

        } else {

            display.textContent =
                String(
                    transposeAmount
                );
        }
    }


    renderMusicContent();
}


/* =========================================================
   COPY SHEET
   ========================================================= */

async function copySheet() {

    if (!currentSong) {

        alert(
            "Find a song first."
        );

        return;
    }


    let text = "";


    /*
     * COPY CHORDS
     */

    if (
        activeMusicTab ===
        "chords"
    ) {

        text =
            currentSong.chords
                .map(section => {

                    const chords =
                        section.chords
                            .map(chord =>
                                transposeChord(
                                    chord,
                                    transposeAmount
                                )
                            )
                            .join("  ");


                    return (
                        `${section.section}\n` +
                        chords
                    );

                })
                .join(
                    "\n\n"
                );


    /*
     * COPY LYRICS
     */

    } else {

        text =
            currentSong.lyrics ||
            "";
    }


    if (!text.trim()) {

        alert(
            "There is nothing to copy."
        );

        return;
    }


    try {

        await navigator.clipboard
            .writeText(text);


        showMessage(
            "✓ Copied successfully.",
            "success"
        );


    } catch (error) {

        console.error(error);

        alert(
            "Copy failed."
        );
    }
}


/* =========================================================
   MICROPHONE
   ========================================================= */

async function requestMicrophone() {

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        alert(
            "Your browser does not support microphone recording."
        );

        return null;
    }


    try {

        return await navigator
            .mediaDevices
            .getUserMedia({
                audio: true
            });


    } catch (error) {

        console.error(
            "Microphone error:",
            error
        );


        alert(
            "Microphone permission was denied."
        );


        return null;
    }
}


/* =========================================================
   START / STOP RECORDING
   ========================================================= */

async function toggleRecording() {

    const button =
        $("recordButton");


    /*
     * STOP
     */

    if (
        mediaRecorder &&
        mediaRecorder.state ===
        "recording"
    ) {

        stopRecording();

        return;
    }


    /*
     * START
     */

    const stream =
        await requestMicrophone();


    if (!stream) return;


    audioChunks = [];

    audioBlob = null;


    try {

        mediaRecorder =
            new MediaRecorder(
                stream
            );


    } catch (error) {

        console.error(error);


        stream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );


        alert(
            "Recording is not supported on this browser."
        );


        return;
    }


    mediaRecorder.ondataavailable =
        event => {

            if (
                event.data &&
                event.data.size > 0
            ) {

                audioChunks.push(
                    event.data
                );
            }
        };


    mediaRecorder.onstop =
        finishRecording;


    mediaRecorder.start();


    recordingStartTime =
        Date.now();


    timerInterval =
        setInterval(
            updateTimer,
            1000
        );


    if (button) {

        button.textContent =
            "⏹ Stop";

        button.classList.add(
            "recording"
        );
    }


    const indicator =
        $("recordingIndicator");


    if (indicator) {

        indicator.textContent =
            "RECORDING";

        indicator.classList.add(
            "active"
        );
    }


    const timer =
        $("recordingTimer");


    if (timer) {

        timer.textContent =
            "00:00";
    }
}


function stopRecording() {

    if (!mediaRecorder) {
        return;
    }


    if (
        mediaRecorder.state ===
        "recording"
    ) {

        mediaRecorder.stop();
    }


    if (
        mediaRecorder.stream
    ) {

        mediaRecorder.stream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );
    }


    clearInterval(
        timerInterval
    );


    const button =
        $("recordButton");


    if (button) {

        button.textContent =
            "🔴 Record";

        button.classList.remove(
            "recording"
        );
    }


    const indicator =
        $("recordingIndicator");


    if (indicator) {

        indicator.textContent =
            "READY";

        indicator.classList.remove(
            "active"
        );
    }
}


/* =========================================================
   FINISH RECORDING
   ========================================================= */

function finishRecording() {

    if (
        !audioChunks.length
    ) {

        mediaRecorder = null;

        return;
    }


    const mimeType =
        mediaRecorder?.mimeType ||
        "audio/webm";


    audioBlob =
        new Blob(
            audioChunks,
            {
                type: mimeType
            }
        );


    const audio =
        $("recordedAudio");


    if (audio) {

        const url =
            URL.createObjectURL(
                audioBlob
            );


        audio.src = url;

        audio.style.display =
            "block";
    }


    const download =
        $("downloadRecording");


    const deleteButton =
        $("deleteRecording");


    if (download) {

        download.style.display =
            "inline-flex";
    }


    if (deleteButton) {

        deleteButton.style.display =
            "inline-flex";
    }


    mediaRecorder =
        null;
}


/* =========================================================
   RECORDING TIMER
   ========================================================= */

function updateTimer() {

    if (!recordingStartTime) {
        return;
    }


    const elapsed =
        Math.floor(
            (
                Date.now() -
                recordingStartTime
            ) / 1000
        );


    const minutes =
        Math.floor(
            elapsed / 60
        )
        .toString()
        .padStart(
            2,
            "0"
        );


    const seconds =
        (
            elapsed % 60
        )
        .toString()
        .padStart(
            2,
            "0"
        );


    const timer =
        $("recordingTimer");


    if (timer) {

        timer.textContent =
            `${minutes}:${seconds}`;
    }
}


/* =========================================================
   DOWNLOAD RECORDING
   ========================================================= */

function downloadRecording() {

    if (!audioBlob) {

        alert(
            "No recording available."
        );

        return;
    }


    const url =
        URL.createObjectURL(
            audioBlob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        `KRIX-recording-${Date.now()}.webm`;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    setTimeout(() => {

        URL.revokeObjectURL(
            url
        );

    }, 1000);
}


/* =========================================================
   DELETE RECORDING
   ========================================================= */

function deleteRecording() {

    audioBlob = null;

    audioChunks = [];


    const audio =
        $("recordedAudio");


    if (audio) {

        audio.pause();

        audio.removeAttribute(
            "src"
        );

        audio.load();

        audio.style.display =
            "none";
    }


    const download =
        $("downloadRecording");


    const deleteButton =
        $("deleteRecording");


    if (download) {

        download.style.display =
            "none";
    }


    if (deleteButton) {

        deleteButton.style.display =
            "none";
    }


    const timer =
        $("recordingTimer");


    if (timer) {

        timer.textContent =
            "00:00";
    }


    recordingStartTime =
        null;
}


/* =========================================================
   ENTER KEY SUPPORT
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Enter"
        ) {
            return;
        }


        const active =
            document.activeElement;


        if (
            active?.id ===
            "songName" ||
            active?.id ===
            "artistName"
        ) {

            findSong();
        }
    }
);


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const input =
            $("apiKey");


        if (input) {

            input.addEventListener(
                "input",
                () => {

                    apiKey =
                        input.value.trim();

                    /*
                     * Don't say connected merely
                     * because text was entered.
                     */

                    setConnectionStatus(
                        false
                    );
                }
            );
        }


        showMusicTab(
            "chords"
        );
    }
);

            