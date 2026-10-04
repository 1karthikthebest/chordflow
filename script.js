/* =====================================================
   KRIX MUSIC
   FRONTEND ENGINE
===================================================== */


let apiKey = "";

let transposeAmount = 0;

let mediaRecorder = null;

let audioChunks = [];

let audioBlob = null;

let recordingTimer = null;

let recordingSeconds = 0;


/* =====================================================
   API CONNECTION
===================================================== */

async function testConnection() {

  const keyInput =
    document.getElementById("apiKey");

  const button =
    document.getElementById(
      "testConnectionButton"
    );

  const message =
    document.getElementById(
      "connectionMessage"
    );


  const key =
    keyInput.value.trim();


  if (!key) {

    message.textContent =
      "Enter your API key first.";

    setConnectionState(
      "error",
      "API key required"
    );

    return;

  }


  button.disabled = true;

  button.innerHTML = `
    Testing
    <span class="loading-dots">
      <i></i><i></i><i></i>
    </span>
  `;


  message.textContent =
    "KRIX is checking the connection";


  try {

    const response =
      await fetch(
        "/api/test-connection",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            apiKey: key
          })

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Connection failed."
      );

    }


    apiKey = key;


    setConnectionState(
      "connected",
      "KRIX API Connected"
    );


    message.textContent =
      "✓ KRIX is ready to search music.";

  } catch (error) {

    console.error(error);


    apiKey = "";


    setConnectionState(
      "error",
      "Connection Failed"
    );


    message.textContent =
      error.message ||
      "Unable to connect to the API.";

  } finally {

    button.disabled = false;

    button.innerHTML =
      "Test Connection";

  }

}


/* =====================================================
   CONNECTION UI
===================================================== */

function setConnectionState(
  state,
  text
) {

  const status =
    document.getElementById(
      "connectionStatus"
    );

  const label =
    document.getElementById(
      "connectionText"
    );


  status.classList.remove(
    "connected",
    "error"
  );


  if (state) {

    status.classList.add(
      state
    );

  }


  label.textContent = text;

}


/* =====================================================
   FIND SONG
===================================================== */

async function findSong() {

  const song =
    document
      .getElementById("songName")
      .value
      .trim();


  const artist =
    document
      .getElementById("artistName")
      .value
      .trim();


  const instrument =
    document
      .getElementById("instrument")
      .value;


  const button =
    document.getElementById(
      "findButton"
    );


  const buttonText =
    document.getElementById(
      "findButtonText"
    );


  const loader =
    document.getElementById(
      "findLoader"
    );


  const status =
    document.getElementById(
      "searchStatus"
    );


  if (!apiKey) {

    status.textContent =
      "Connect the KRIX API first.";

    setConnectionState(
      "error",
      "API Not Connected"
    );

    return;

  }


  if (!song) {

    status.textContent =
      "Enter a song name.";

    return;

  }


  if (!artist) {

    status.textContent =
      "Enter the artist / singer.";

    return;

  }


  button.disabled = true;

  buttonText.style.display =
    "none";

  loader.style.display =
    "inline-flex";


  status.textContent =
    "KRIX is searching the music universe";


  const workspace =
    document.getElementById(
      "workspace"
    );


  workspace.style.display =
    "block";


  document.getElementById(
    "outputSong"
  ).textContent = song;


  document.getElementById(
    "outputArtist"
  ).textContent = artist;


  document.getElementById(
    "outputInstrument"
  ).textContent =
    getInstrumentLabel(
      instrument
    );


  document.getElementById(
    "songContent"
  ).innerHTML = `

    <div style="
      text-align:center;
      padding:45px 10px;
      color:#8995ad;
    ">

      <div style="
        font-size:28px;
        margin-bottom:12px;
      ">
        ◌
      </div>

      <div>
        KRIX is searching
        <span class="loading-dots">
          <i></i><i></i><i></i>
        </span>
      </div>

    </div>

  `;


  try {

    const response =
      await fetch(
        "/api/search-song",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            apiKey: apiKey,

            song: song,

            artist: artist,

            instrument: instrument

          })

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "KRIX could not find the song."
      );

    }


    displaySong(data);


    status.textContent =
      "✓ KRIX found the song";


  } catch (error) {

    console.error(error);


    document.getElementById(
      "songContent"
    ).innerHTML = `

      <div style="
        text-align:center;
        padding:40px 10px;
        color:#ff7189;
      ">

        ⚠️ ${escapeHtml(
          error.message ||
          "KRIX search failed."
        )}

      </div>

    `;


    status.textContent =
      "KRIX could not complete the search.";

  } finally {

    button.disabled = false;

    buttonText.style.display =
      "inline";

    loader.style.display =
      "none";

  }

}


/* =====================================================
   DISPLAY SONG
===================================================== */

function displaySong(data) {

  const content =
    document.getElementById(
      "songContent"
    );


  content.innerHTML = "";


  document.getElementById(
    "sheetTitle"
  ).textContent =
    data.title ||
    document.getElementById(
      "songName"
    ).value;


  document.getElementById(
    "sheetArtist"
  ).textContent =
    `${data.artist || document.getElementById("artistName").value} • Key: ${data.key || "--"}`;


  document.getElementById(
    "bpm"
  ).textContent =
    `${data.bpm || "--"} BPM`;


  if (
    !data.lines ||
    !Array.isArray(data.lines)
  ) {

    throw new Error(
      "KRIX returned an invalid song format."
    );

  }


  data.lines.forEach(
    line => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "song-line";


      row.innerHTML = `

        <div class="song-section">
          ${escapeHtml(
            line.section ||
            "Section"
          )}
        </div>


        <div class="chords">

          ${escapeHtml(
            line.chords ||
            ""
          )}

        </div>


        <div class="lyrics">

          ${escapeHtml(
            line.lyrics ||
            ""
          )}

        </div>

      `;


      content.appendChild(
        row
      );

    }
  );


  transposeAmount = 0;


  document.getElementById(
    "transposeValue"
  ).textContent = "0";


  showMusicTab("chords");

}


/* =====================================================
   TABS
===================================================== */

function showMusicTab(type) {

  const chords =
    document.querySelectorAll(
      ".chords"
    );


  const lyrics =
    document.querySelectorAll(
      ".lyrics"
    );


  const chordsTab =
    document.getElementById(
      "chordsTab"
    );


  const lyricsTab =
    document.getElementById(
      "lyricsTab"
    );


  chordsTab.classList.remove(
    "active"
  );


  lyricsTab.classList.remove(
    "active"
  );


  if (type === "lyrics") {

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


    lyricsTab.classList.add(
      "active"
    );


  } else {

    chords.forEach(
      element => {

        element.style.display =
          "block";

      }
    );


    lyrics.forEach(
      element => {

        element.style.display =
          "none";

      }
    );


    chordsTab.classList.add(
      "active"
    );

  }

}


/* =====================================================
   INSTRUMENT
===================================================== */

function getInstrumentLabel(
  instrument
) {

  const icons = {

    guitar: "🎸 Guitar",

    piano: "🎹 Piano",

    flute: "🪈 Flute",

    ukulele: "🎵 Ukulele",

    violin: "🎻 Violin",

    keyboard: "🎹 Keyboard"

  };


  return (
    icons[instrument] ||
    instrument
  );

}


/* =====================================================
   TRANSPOSE
===================================================== */

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
      flats[root] ||
      root;

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


function transpose(amount) {

  transposeAmount += amount;


  document
    .querySelectorAll(".chords")
    .forEach(
      element => {

        const words =
          element.textContent
            .trim()
            .split(/\s+/);


        element.textContent =
          words
            .map(
              chord =>
                transposeChord(
                  chord,
                  amount
                )
            )
            .join(" ");

      }
    );


  document.getElementById(
    "transposeValue"
  ).textContent =

    transposeAmount > 0
      ? `+${transposeAmount}`
      : transposeAmount;

}


/* =====================================================
   COPY
===================================================== */

function copySheet() {

  const title =
    document.getElementById(
      "sheetTitle"
    ).textContent;


  const artist =
    document.getElementById(
      "sheetArtist"
    ).textContent;


  const content =
    document.getElementById(
      "songContent"
    ).innerText;


  navigator.clipboard
    .writeText(
      `${title}\n${artist}\n\n${content}`
    )
    .then(
      () => {

        alert(
          "✓ KRIX sheet copied!"
        );

      }
    )
    .catch(
      () => {

        alert(
          "Unable to copy."
        );

      }
    );

}


/* =====================================================
   RECORDING
===================================================== */

async function requestMicrophone() {

  try {

    const stream =
      await navigator.mediaDevices
        .getUserMedia({
          audio: true
        });


    mediaRecorder =
      new MediaRecorder(
        stream
      );


    audioChunks = [];


    mediaRecorder.ondataavailable =
      event => {

        if (
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
                mediaRecorder.mimeType ||
                "audio/webm"
            }
          );


        const url =
          URL.createObjectURL(
            audioBlob
          );


        const audio =
          document.getElementById(
            "recordedAudio"
          );


        audio.src = url;

        audio.style.display =
          "block";


        document.getElementById(
          "downloadRecording"
        ).style.display =
          "inline-block";


        document.getElementById(
          "deleteRecording"
        ).style.display =
          "inline-block";

      };


    return true;

  } catch (error) {

    console.error(error);

    alert(
      "Microphone permission is required."
    );

    return false;

  }

}


async function toggleRecording() {

  const button =
    document.getElementById(
      "recordButton"
    );


  const indicator =
    document.getElementById(
      "recordingIndicator"
    );


  const waveform =
    document.querySelector(
      ".waveform"
    );


  if (!mediaRecorder) {

    const allowed =
      await requestMicrophone();


    if (!allowed) {
      return;
    }

  }


  if (
    mediaRecorder.state ===
    "inactive"
  ) {

    audioChunks = [];

    recordingSeconds = 0;

    updateTimer();


    mediaRecorder.start();


    recordingTimer =
      setInterval(
        updateTimer,
        1000
      );


    button.textContent =
      "⏹ Stop";


    button.classList.add(
      "recording"
    );


    indicator.textContent =
      "RECORDING";


    indicator.classList.add(
      "active"
    );


    waveform.classList.add(
      "active"
    );


  } else {

    mediaRecorder.stop();


    clearInterval(
      recordingTimer
    );


    button.textContent =
      "🔴 Record";


    button.classList.remove(
      "recording"
    );


    indicator.textContent =
      "READY";


    indicator.classList.remove(
      "active"
    );


    waveform.classList.remove(
      "active"
    );

  }

}


function updateTimer() {

  const timer =
    document.getElementById(
      "recordingTimer"
    );


  const minutes =
    Math.floor(
      recordingSeconds / 60
    );


  const seconds =
    recordingSeconds % 60;


  timer.textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;


  recordingSeconds++;

}


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


  link.href = url;

  link.download =
    "KRIX-recording.webm";


  document.body.appendChild(
    link
  );


  link.click();

  link.remove();


  setTimeout(
    () => URL.revokeObjectURL(url),
    1000
  );

}


function deleteRecording() {

  audioBlob = null;


  const audio =
    document.getElementById(
      "recordedAudio"
    );


  audio.pause();

  audio.removeAttribute(
    "src"
  );

  audio.load();


  audio.style.display =
    "none";


  document.getElementById(
    "downloadRecording"
  ).style.display =
    "none";


  document.getElementById(
    "deleteRecording"
  ).style.display =
    "none";


  document.getElementById(
    "recordingTimer"
  ).textContent =
    "00:00";


  recordingSeconds = 0;

}


/* =====================================================
   SECURITY
===================================================== */

function escapeHtml(value) {

  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


/* =====================================================
   STARTUP
===================================================== */

console.log(
  "🚀 KRIX Music Assistant ready."
);