/* =========================================================
   CHORDFLOW AI — COMPLETE SCRIPT
========================================================= */


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let geminiApiKey = "";
let geminiConnected = false;

let transposeAmount = 0;

let mediaRecorder = null;
let audioChunks = [];
let audioBlob = null;

let recordingTimer = null;
let recordingSeconds = 0;


/* =========================================================
   API KEY SHOW / HIDE
========================================================= */

function toggleApiKey() {

  const input =
    document.getElementById("apiKey");

  const button =
    document.querySelector(
      ".api-wrapper .secondary-btn"
    );

  if (!input) return;

  if (input.type === "password") {

    input.type = "text";

    if (button) {
      button.textContent = "Hide";
    }

  } else {

    input.type = "password";

    if (button) {
      button.textContent = "Show";
    }
  }
}


/* =========================================================
   GEMINI CONNECTION
========================================================= */

async function connectGemini() {

  const input =
    document.getElementById("apiKey");

  const button =
    document.getElementById("connectButton");

  const status =
    document.getElementById("connectionStatus");

  if (!input) return;

  const key =
    input.value.trim();

  if (!key) {

    if (status) {

      status.style.display = "block";
      status.style.color = "#ff6b81";
      status.textContent =
        "❌ Enter your Gemini API key.";
    }

    return;
  }

  if (button) {

    button.disabled = true;
    button.textContent =
      "⏳ Connecting...";
  }

  if (status) {

    status.style.display = "block";
    status.style.color = "#8ea3c7";
    status.textContent =
      "🔄 Checking Gemini connection...";
  }

  try {

    const response =
      await fetch(
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

    const data =
      await response.json();

    if (!response.ok) {

      throw new Error(
        data?.error?.message ||
        "Invalid Gemini API key."
      );
    }

    geminiApiKey = key;
    geminiConnected = true;

    if (status) {

      status.style.color = "#36e6a0";
      status.textContent =
        "✅ Gemini connected successfully!";
    }

    if (button) {

      button.textContent =
        "✅ Connected";

      button.disabled = false;
    }

    const songSetup =
      document.getElementById("songSetup");

    const generateButton =
      document.getElementById("generateButton");

    if (songSetup) {
      songSetup.style.display = "grid";
    }

    if (generateButton) {
      generateButton.style.display = "block";
    }

  } catch (error) {

    geminiConnected = false;
    geminiApiKey = "";

    if (status) {

      status.style.display = "block";
      status.style.color = "#ff6b81";
      status.textContent =
        "❌ " + error.message;
    }

    if (button) {

      button.disabled = false;
      button.textContent =
        "🔌 Connect";
    }
  }
}


/* =========================================================
   GENERATE SONG
========================================================= */

async function generateSong() {

  if (!geminiConnected) {

    alert(
      "Connect your Gemini API first."
    );

    return;
  }

  const song =
    document.getElementById("songName")
      ?.value.trim();

  const artist =
    document.getElementById("singerName")
      ?.value.trim();

  const instrument =
    document.getElementById("instrument")
      ?.value || "guitar";

  if (!song) {

    alert("Enter the song name.");

    return;
  }

  if (!artist) {

    alert("Enter the singer/artist.");

    return;
  }

  const workspace =
    document.getElementById("workspace");

  const content =
    document.getElementById("songContent");

  if (workspace) {
    workspace.style.display = "block";
  }

  const outputSong =
    document.getElementById("outputSong");

  const outputArtist =
    document.getElementById("outputArtist");

  const outputInstrument =
    document.getElementById(
      "outputInstrument"
    );

  const sheetTitle =
    document.getElementById("sheetTitle");

  const sheetArtist =
    document.getElementById("sheetArtist");

  if (outputSong) {
    outputSong.textContent = song;
  }

  if (outputArtist) {
    outputArtist.textContent = artist;
  }

  if (sheetTitle) {
    sheetTitle.textContent = song;
  }

  if (sheetArtist) {
    sheetArtist.textContent = artist;
  }

  const icons = {

    guitar: "🎸",
    piano: "🎹",
    flute: "🪈",
    ukulele: "🎵",
    violin: "🎻",
    keyboard: "🎹"

  };

  if (outputInstrument) {

    outputInstrument.textContent =
      `${icons[instrument] || "🎵"} ${
        instrument.charAt(0).toUpperCase() +
        instrument.slice(1)
      }`;
  }

  if (content) {

    content.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">
          🪐
        </div>

        <p>
          Gemini is generating your music...
        </p>

      </div>
    `;
  }

  try {

    const result =
      await generateWithGemini(
        song,
        artist,
        instrument
      );

    displaySong(result);

  } catch (error) {

    console.error(
      "ChordFlow generation error:",
      error
    );

    if (content) {

      content.innerHTML = `
        <div class="empty-state">

          <div class="empty-icon">
            ⚠️
          </div>

          <p>
            Generation failed.
          </p>

          <p>
            ${escapeHtml(error.message)}
          </p>

        </div>
      `;
    }
  }
}


/* =========================================================
   GEMINI GENERATION
========================================================= */

async function generateWithGemini(
  song,
  artist,
  instrument
) {

  const prompt = `

You are ChordFlow AI, a music assistant.

Song: ${song}
Artist: ${artist}
Instrument: ${instrument}

Create a useful song arrangement.

Return ONLY valid JSON.

Use exactly this structure:

{
  "bpm": 100,
  "key": "G",
  "lines": [
    {
      "section": "Intro",
      "chords": "G D Em C",
      "lyrics": "Original lyrics or user-provided lyrics"
    },
    {
      "section": "Verse 1",
      "chords": "G D Em C",
      "lyrics": "Original lyrics or user-provided lyrics"
    },
    {
      "section": "Chorus",
      "chords": "C G D Em",
      "lyrics": "Original lyrics or user-provided lyrics"
    }
  ]
}

Important:

- Return valid JSON only.
- Do not use markdown code fences.
- Do not add explanations before or after the JSON.
- Every line must contain a chords field.
- Every line must contain a lyrics field.
- If lyrics are supplied by the user, use those lyrics.
- Otherwise create ORIGINAL lyrics.
- Do not reproduce copyrighted lyrics from the requested song.
- Keep the arrangement practical for ${instrument}.
`;

  const response =
    await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json",

          "x-goog-api-key":
            geminiApiKey
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

            temperature: 0.6,

            maxOutputTokens: 3000,

            responseMimeType:
              "application/json"
          }

        })
      }
    );

  const data =
    await response.json();

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

  if (!text) {

    throw new Error(
      "Gemini returned an empty response."
    );
  }

  console.log(
    "Gemini raw response:",
    text
  );

  /*
    CLEAN GEMINI RESPONSE
  */

  text =
    text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

  /*
    FIND JSON OBJECT

    This prevents:
    Unexpected end of JSON input
  */

  const firstBrace =
    text.indexOf("{");

  const lastBrace =
    text.lastIndexOf("}");

  if (
    firstBrace === -1 ||
    lastBrace === -1 ||
    lastBrace <= firstBrace
  ) {

    throw new Error(
      "Gemini did not return valid JSON."
    );
  }

  text =
    text.substring(
      firstBrace,
      lastBrace + 1
    );

  let result;

  try {

    result =
      JSON.parse(text);

  } catch (error) {

    console.error(
      "Invalid Gemini JSON:",
      text
    );

    throw new Error(
      "Gemini returned incomplete JSON. Please try again."
    );
  }

  /*
    VALIDATE RESULT
  */

  if (
    !result ||
    !Array.isArray(result.lines)
  ) {

    throw new Error(
      "Gemini response has an invalid song format."
    );
  }

  return result;
}


/* =========================================================
   DISPLAY GENERATED SONG
========================================================= */

function displaySong(data) {

  const content =
    document.getElementById(
      "songContent"
    );

  if (!content) return;

  content.innerHTML = "";

  const bpm =
    document.getElementById("bpm");

  if (bpm && data.bpm) {

    bpm.textContent =
      `${data.bpm} BPM`;
  }

  const sheetArtist =
    document.getElementById(
      "sheetArtist"
    );

  const outputArtist =
    document.getElementById(
      "outputArtist"
    );

  if (sheetArtist && data.key) {

    const artist =
      outputArtist
        ?.textContent || "";

    sheetArtist.textContent =
      `${artist} • Key: ${data.key}`;
  }

  if (
    !data.lines ||
    data.lines.length === 0
  ) {

    content.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          🎵
        </div>

        <p>
          No song data was returned.
        </p>

      </div>

    `;

    return;
  }

  data.lines.forEach(
    (line) => {

      const row =
        document.createElement(
          "div"
        );

      row.className =
        "song-line";

      const section =
        line.section ||
        "Section";

      const chords =
        line.chords ||
        "";

      const lyrics =
        line.lyrics ||
        "";

      row.innerHTML = `

        <div
          class="song-section"
        >
          [${escapeHtml(section)}]
        </div>

        <div
          class="chords"
        >
          ${escapeHtml(chords)}
        </div>

        <div
          class="lyrics"
        >
          ${escapeHtml(lyrics)}
        </div>

      `;

      content.appendChild(row);
    }
  );

  /*
    Start with CHORDS view.
  */

  showMusicTab("chords");

  const workspace =
    document.getElementById(
      "workspace"
    );

  if (workspace) {

    workspace.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}


/* =========================================================
   CHORDS / LYRICS TABS
========================================================= */

function showMusicTab(type) {

  const chords =
    document.querySelectorAll(
      ".chords"
    );

  const lyrics =
    document.querySelectorAll(
      ".lyrics"
    );

  const tabs =
    document.querySelectorAll(
      ".music-tab"
    );

  tabs.forEach(
    tab => {

      tab.classList.remove(
        "active"
      );
    }
  );

  /*
    CHORDS TAB
  */

  if (type === "chords") {

    chords.forEach(
      element => {

        element.style.display =
          "block";
      }
    );

    lyrics.forEach(
      element => {

        element.style.display =
          "block";
      }
    );

    if (tabs[0]) {

      tabs[0].classList.add(
        "active"
      );
    }
  }

  /*
    LYRICS TAB
  */

  else if (type === "lyrics") {

    chords.forEach(
      element => {

        element.style.display =
          "none";
      }
    );

    lyrics.forEach(
      element => {

        element.style.display =
          "block";
      }
    );

    if (tabs[1]) {

      tabs[1].classList.add(
        "active"
      );
    }
  }
}


/* =========================================================
   TRANSPOSE
========================================================= */

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


function transposeChord(
  chord,
  amount
) {

  const match =
    chord.match(
      /^([A-G](?:#|b)?)(.*)$/
    );

  if (!match) {

    return chord;
  }

  let root =
    match[1];

  const rest =
    match[2];

  const flats = {

    Db: "C#",
    Eb: "D#",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#"

  };

  if (root.includes("b")) {

    root =
      flats[root] || root;
  }

  if (!(root in chordMap)) {

    return chord;
  }

  let index =
    chordMap[root] +
    amount;

  index =
    ((index % 12) + 12) % 12;

  return (
    chordNames[index] +
    rest
  );
}


function transposeSheet(
  amount
) {

  transposeAmount += amount;

  const chords =
    document.querySelectorAll(
      ".chords"
    );

  chords.forEach(
    element => {

      const original =
        element.textContent.trim();

      if (!original) return;

      const words =
        original.split(/\s+/);

      const newWords =
        words.map(
          word =>
            transposeChord(
              word,
              amount
            )
        );

      element.textContent =
        newWords.join(" ");
    }
  );

  const display =
    document.getElementById(
      "transposeValue"
    );

  if (display) {

    display.textContent =
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


/* =========================================================
   COPY
========================================================= */

function copyChords() {

  const title =
    document.getElementById(
      "sheetTitle"
    )?.textContent || "";

  const artist =
    document.getElementById(
      "sheetArtist"
    )?.textContent || "";

  const content =
    document.getElementById(
      "songContent"
    )?.innerText || "";

  const text =
`${title}
${artist}

${content}`;

  if (
    navigator.clipboard &&
    navigator.clipboard.writeText
  ) {

    navigator.clipboard
      .writeText(text)
      .then(() => {

        showCopySuccess();

      })
      .catch(() => {

        alert(
          "Unable to copy."
        );
      });

  } else {

    alert(
      "Clipboard is not supported."
    );
  }
}


function showCopySuccess() {

  const button =
    document.getElementById(
      "copyButton"
    );

  if (!button) return;

  const oldText =
    button.textContent;

  button.textContent =
    "✅ Copied!";

  setTimeout(
    () => {

      button.textContent =
        oldText;

    },
    1500
  );
}


/* =========================================================
   DEMO MODE
========================================================= */

function loadDemo() {

  const workspace =
    document.getElementById(
      "workspace"
    );

  if (workspace) {

    workspace.style.display =
      "block";
  }

  const outputSong =
    document.getElementById(
      "outputSong"
    );

  const outputArtist =
    document.getElementById(
      "outputArtist"
    );

  const outputInstrument =
    document.getElementById(
      "outputInstrument"
    );

  const sheetTitle =
    document.getElementById(
      "sheetTitle"
    );

  const sheetArtist =
    document.getElementById(
      "sheetArtist"
    );

  const bpm =
    document.getElementById(
      "bpm"
    );

  if (outputSong) {

    outputSong.textContent =
      "ChordFlow Demo";
  }

  if (outputArtist) {

    outputArtist.textContent =
      "ChordFlow AI";
  }

  if (outputInstrument) {

    outputInstrument.textContent =
      "🎸 Guitar";
  }

  if (sheetTitle) {

    sheetTitle.textContent =
      "ChordFlow Demo";
  }

  if (sheetArtist) {

    sheetArtist.textContent =
      "ChordFlow AI • Key: G";
  }

  if (bpm) {

    bpm.textContent =
      "100 BPM";
  }

  displaySong({

    bpm: 100,

    key: "G",

    lines: [

      {
        section: "Intro",
        chords: "G D Em C",
        lyrics:
          "A new day begins"
      },

      {
        section: "Verse",
        chords: "G D Em C",
        lyrics:
          "Walking through the night"
      },

      {
        section: "Pre-Chorus",
        chords: "Am Em C D",
        lyrics:
          "I can feel the light"
      },

      {
        section: "Chorus",
        chords: "C G D Em",
        lyrics:
          "We keep moving on"
      },

      {
        section: "Bridge",
        chords: "Em C G D",
        lyrics:
          "Nothing can stop us"
      }

    ]

  });
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

    return false;
  }

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
      () => {

        audioBlob =
          new Blob(
            audioChunks,
            {
              type:
                "audio/webm"
            }
          );

        const audioURL =
          URL.createObjectURL(
            audioBlob
          );

        const player =
          document.getElementById(
            "audioPlayer"
          );

        if (player) {

          player.src =
            audioURL;

          player.style.display =
            "block";
        }

        stream
          .getTracks()
          .forEach(
            track =>
              track.stop()
          );
      };

    return true;

  } catch (error) {

    console.error(
      "Microphone error:",
      error
    );

    alert(
      "Microphone permission is required."
    );

    return false;
  }
}


/* =========================================================
   START / STOP RECORDING
========================================================= */

async function toggleRecording() {

  const button =
    document.getElementById(
      "recordButton"
    );

  if (!mediaRecorder) {

    const ready =
      await requestMicrophone();

    if (!ready) return;
  }

  if (
    mediaRecorder.state ===
    "inactive"
  ) {

    audioChunks = [];

    mediaRecorder.start();

    recordingSeconds = 0;

    startTimer();

    if (button) {

      button.textContent =
        "⏹ Stop Recording";

      button.classList.add(
        "recording"
         } else {
      stopRecording();
    }
  }
}


/* =========================================================
   RECORDING TIMER
========================================================= */

function startTimer() {

  clearInterval(recordingTimer);

  updateTimer();

  recordingTimer = setInterval(() => {

    recordingSeconds++;

    updateTimer();

  }, 1000);
}


function updateTimer() {

  const timer =
    document.getElementById("recordTimer");

  if (!timer) return;

  const minutes =
    Math.floor(recordingSeconds / 60);

  const seconds =
    recordingSeconds % 60;

  timer.textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}


/* =========================================================
   DOWNLOAD RECORDING
========================================================= */

function downloadRecording() {

  if (!audioBlob) {

    alert("Record something first.");

    return;
  }

  const url =
    URL.createObjectURL(audioBlob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    "chordflow-recording.webm";

  document.body.appendChild(link);

  link.click();

  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}


/* =========================================================
   DELETE RECORDING
========================================================= */

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


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

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

    const tabs =
      document.querySelectorAll(".music-tab");

    if (tabs.length >= 2) {

      tabs[0].classList.add("active");

      tabs[1].classList.remove("active");
    }

  }
);