let geminiApiKey = "";
let geminiConnected = false;

let transposeAmount = 0;

let mediaRecorder = null;
let audioChunks = [];
let audioBlob = null;
let recordingTimer = null;
let recordingSeconds = 0;


/* API KEY SHOW / HIDE */

function toggleApiKey() {

  const input = document.getElementById("apiKey");
  const button = document.querySelector(
    ".api-wrapper .secondary-btn"
  );

  if (input.type === "password") {
    input.type = "text";
    button.textContent = "Hide";
  } else {
    input.type = "password";
    button.textContent = "Show";
  }
}


/* GEMINI CONNECTION */

async function connectGemini() {

  const key = document.getElementById("apiKey").value.trim();
  const button = document.getElementById("connectButton");
  const status = document.getElementById("connectionStatus");

  if (!key) {
    status.style.display = "block";
    status.style.color = "#ff6b81";
    status.textContent = "❌ Enter your Gemini API key.";
    return;
  }

  button.disabled = true;
  button.textContent = "⏳ Connecting...";

  status.style.display = "block";
  status.style.color = "#8ea3c7";
  status.textContent = "🔄 Checking API key...";

  try {

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key
        },

        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "Reply with OK"
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
        "Invalid API key."
      );
    }

    geminiApiKey = key;
    geminiConnected = true;

    status.style.color = "#36e6a0";
    status.textContent =
      "✅ Gemini connected successfully!";

    button.textContent = "✅ Connected";
    button.disabled = false;

    document.getElementById(
      "songSetup"
    ).style.display = "grid";

    document.getElementById(
      "generateButton"
    ).style.display = "block";

  } catch (error) {

    geminiConnected = false;
    geminiApiKey = "";

    status.style.color = "#ff6b81";
    status.textContent =
      "❌ " + error.message;

    button.textContent = "🔌 Connect";
    button.disabled = false;

  }
}


/* GENERATE SONG */

async function generateSong() {

  if (!geminiConnected) {
    alert("Connect your Gemini API first.");
    return;
  }

  const song =
    document.getElementById("songName").value.trim();

  const artist =
    document.getElementById("singerName").value.trim();

  const instrument =
    document.getElementById("instrument").value;

  if (!song) {
    alert("Enter the song name.");
    return;
  }

  if (!artist) {
    alert("Enter the singer/artist.");
    return;
  }

  document.getElementById("workspace").style.display =
    "block";

  document.getElementById("outputSong").textContent =
    song;

  document.getElementById("outputArtist").textContent =
    artist;

  const icons = {
    guitar: "🎸",
    piano: "🎹",
    flute: "🪈",
    ukulele: "🎵",
    violin: "🎻",
    keyboard: "🎹"
  };

  document.getElementById(
    "outputInstrument"
  ).textContent =
    `${icons[instrument]} ${
      instrument.charAt(0).toUpperCase() +
      instrument.slice(1)
    }`;

  document.getElementById("sheetTitle").textContent =
    song;

  document.getElementById("sheetArtist").textContent =
    artist;

  const content =
    document.getElementById("songContent");

  content.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🪐</div>
      <p>Gemini is generating your chords...</p>
    </div>
  `;

  try {

    const prompt = `
You are ChordFlow, an AI music assistant.

Song: ${song}
Artist: ${artist}
Instrument: ${instrument}

Create a chord arrangement for practice.

Return ONLY JSON in this format:

{
  "bpm": 100,
  "key": "G",
  "lines": [
    {
      "section": "Verse",
      "chords": "G D Em C",
      "lyrics": "[Verse]"
    }
  ]
}

Do not reproduce copyrighted song lyrics.
Use labels such as [Verse], [Chorus], [Bridge].
Focus on useful chord progressions.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiApiKey
        },

        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],

          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1500,
            responseMimeType: "application/json"
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
        "Gemini generation failed."
      );
    }

    let text =
      data?.candidates?.[0]
        ?.content?.parts?.[0]
        ?.text;

    text = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const result = JSON.parse(text);

    displaySong(result);

  } catch (error) {

    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>Generation failed.</p>
        <p>${error.message}</p>
      </div>
    `;

  }
}


/* DISPLAY SONG */

function displaySong(data) {

  const content =
    document.getElementById("songContent");

  content.innerHTML = "";

  if (data.bpm) {
    document.getElementById("bpm").textContent =
      `${data.bpm} BPM`;
  }

  if (data.key) {
    document.getElementById("sheetArtist").textContent +=
      ` • Key: ${data.key}`;
  }

  data.lines.forEach(line => {

    const row =
      document.createElement("div");

    row.className = "song-line";

    row.innerHTML = `
      <div
        class="lyrics"
        style="
          color:#9b5cff;
          font-weight:800;
          margin-bottom:6px;
        "
      >
        [${line.section || "Section"}]
      </div>

      <div class="chords">
        ${line.chords || ""}
      </div>

      <div class="lyrics">
        ${line.lyrics || ""}
      </div>
    `;

    content.appendChild(row);
  });

  document.getElementById("workspace")
    .scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
}
/* TRANSPOSE */

const chordMap = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11
};

const chordNames = [
  "C", "C#", "D", "D#", "E", "F",
  "F#", "G", "G#", "A", "A#", "B"
];


function transposeChord(chord, amount) {

  const match = chord.match(
    /^([A-G](?:#|b)?)(.*)$/
  );

  if (!match) return chord;

  let root = match[1];
  const rest = match[2];

  if (root.includes("b")) {

    const flats = {
      Db: "C#",
      Eb: "D#",
      Gb: "F#",
      Ab: "G#",
      Bb: "A#"
    };

    root = flats[root] || root;
  }

  if (!(root in chordMap)) return chord;

  let index =
    chordMap[root] + amount;

  index =
    ((index % 12) + 12) % 12;

  return chordNames[index] + rest;
}


function transposeSheet(amount) {

  transposeAmount += amount;

  const chords =
    document.querySelectorAll(".chords");

  chords.forEach(element => {

    const original =
      element.textContent.trim();

    const words =
      original.split(/\s+/);

    const newWords =
      words.map(word =>
        transposeChord(
          word,
          amount
        )
      );

    element.textContent =
      newWords.join(" ");
  });

  const transposeDisplay =
    document.getElementById("transposeValue");

  if (transposeDisplay) {
    transposeDisplay.textContent =
      transposeAmount > 0
        ? `+${transposeAmount}`
        : transposeAmount;
  }
}


function transposeUp() {
  transposeSheet(1);
}


function transposeDown() {
  transposeSheet(-1);
}


/* COPY CHORD SHEET */

function copyChords() {

  const title =
    document.getElementById("sheetTitle")
      ?.textContent || "";

  const artist =
    document.getElementById("sheetArtist")
      ?.textContent || "";

  const content =
    document.getElementById("songContent")
      ?.innerText || "";

  const text =
`${title}
${artist}

${content}`;

  navigator.clipboard.writeText(text)
    .then(() => {

      const button =
        document.getElementById("copyButton");

      if (button) {

        const oldText =
          button.textContent;

        button.textContent =
          "✅ Copied!";

        setTimeout(() => {
          button.textContent =
            oldText;
        }, 1500);
      }

    })
    .catch(() => {
      alert("Unable to copy chord sheet.");
    });
}


/* DEMO MODE */

function loadDemo() {

  document.getElementById("workspace")
    .style.display = "block";

  document.getElementById("outputSong")
    .textContent = "Demo Song";

  document.getElementById("outputArtist")
    .textContent = "ChordFlow Demo";

  document.getElementById("outputInstrument")
    .textContent = "🎸 Guitar";

  document.getElementById("sheetTitle")
    .textContent = "Demo Song";

  document.getElementById("sheetArtist")
    .textContent = "ChordFlow Demo • Key: G";

  document.getElementById("bpm")
    .textContent = "100 BPM";

  displaySong({
    bpm: 100,
    key: "G",

    lines: [
      {
        section: "Verse",
        chords: "G D Em C",
        lyrics: "[Verse]"
      },
      {
        section: "Chorus",
        chords: "C G D Em",
        lyrics: "[Chorus]"
      },
      {
        section: "Bridge",
        chords: "Em C G D",
        lyrics: "[Bridge]"
      }
    ]
  });
}


/* MICROPHONE */

async function requestMicrophone() {

  try {

    const stream =
      await navigator.mediaDevices
        .getUserMedia({
          audio: true
        });

    mediaRecorder =
      new MediaRecorder(stream);

    audioChunks = [];

    mediaRecorder.ondataavailable =
      event => {

        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

    mediaRecorder.onstop = () => {

      audioBlob =
        new Blob(
          audioChunks,
          { type: "audio/webm" }
        );

      const audioURL =
        URL.createObjectURL(audioBlob);

      const player =
        document.getElementById("audioPlayer");

      if (player) {
        player.src = audioURL;
        player.style.display = "block";
      }
    };

    return true;

  } catch (error) {

    alert(
      "Microphone permission is required."
    );

    return false;
  }
}


/* RECORDING */

async function toggleRecording() {

  const button =
    document.getElementById("recordButton");

  if (!mediaRecorder) {

    const ready =
      await requestMicrophone();

    if (!ready) return;
  }

  if (
    mediaRecorder.state === "inactive"
  ) {

    audioChunks = [];

    mediaRecorder.start();

    recordingSeconds = 0;

    startTimer();

    button.textContent =
      "⏹ Stop Recording";

    button.classList.add("recording");

  } else {

    stopRecording();
  }
}


function stopRecording() {

  if (
    mediaRecorder &&
    mediaRecorder.state !== "inactive"
  ) {

    mediaRecorder.stop();
  }

  clearInterval(recordingTimer);

  const button =
    document.getElementById("recordButton");

  if (button) {

    button.textContent =
      "🎙 Start Recording";

    button.classList.remove(
      "recording"
    );
  }
}


/* TIMER */

function startTimer() {

  clearInterval(recordingTimer);

  updateTimer();

  recordingTimer =
    setInterval(() => {

      recordingSeconds++;

      updateTimer();

    }, 1000);
}


function updateTimer() {

  const timer =
    document.getElementById("recordTimer");

  if (!timer) return;

  const minutes =
    Math.floor(
      recordingSeconds / 60
    );

  const seconds =
    recordingSeconds % 60;

  timer.textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}


/* DOWNLOAD */

function downloadRecording() {

  if (!audioBlob) {

    alert(
      "Record something first."
    );

    return;
  }

  const url =
    URL.createObjectURL(audioBlob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download =
    "chordflow-recording.webm";

  link.click();

  URL.revokeObjectURL(url);
}


/* DELETE */

function deleteRecording() {

  audioBlob = null;
  audioChunks = [];

  const player =
    document.getElementById("audioPlayer");

  if (player) {

    player.pause();
    player.src = "";
    player.style.display = "none";
  }

  recordingSeconds = 0;

  updateTimer();
}


/* PAGE START */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const songSetup =
      document.getElementById("songSetup");

    const generateButton =
      document.getElementById("generateButton");

    const workspace =
      document.getElementById("workspace");

    if (songSetup) {
      songSetup.style.display = "none";
    }

    if (generateButton) {
      generateButton.style.display = "none";
    }

    if (workspace) {
      workspace.style.display = "none";
    }

  }
);
function showMusicTab(type) {

  const chordElements =
    document.querySelectorAll(".chords");

  const lyricElements =
    document.querySelectorAll(".lyrics");

  const tabs =
    document.querySelectorAll(".music-tab");

  tabs.forEach(tab => {
    tab.classList.remove("active");
  });

  if (type === "chords") {

    chordElements.forEach(el => {
      el.style.display = "block";
    });

    lyricElements.forEach(el => {
      el.style.display = "none";
    });

    tabs[0].classList.add("active");

  } else {

    chordElements.forEach(el => {
      el.style.display = "none";
    });

    lyricElements.forEach(el => {
      el.style.display = "block";
    });

    tabs[1].classList.add("active");
  }
}