/* =========================================
   CHORDFLOW — JAVASCRIPT
========================================= */

let transposeAmount = 0;

let mediaRecorder = null;
let audioChunks = [];
let audioBlob = null;

let recordingTimer = null;
let recordingSeconds = 0;


/* =========================================
   API KEY VISIBILITY
========================================= */

function toggleApiKey() {
  const input = document.getElementById("apiKey");
  const button = document.querySelector(".api-wrapper button");

  if (input.type === "password") {
    input.type = "text";
    button.textContent = "Hide";
  } else {
    input.type = "password";
    button.textContent = "Show";
  }
}


/* =========================================
   DEMO MODE
========================================= */

function loadDemo() {
  document.getElementById("songName").value = "Perfect";
  document.getElementById("singerName").value = "Ed Sheeran";
  document.getElementById("instrument").value = "guitar";

  generateSong(true);
}


/* =========================================
   GENERATE SONG
========================================= */

async function generateSong(isDemo = false) {

  const songName =
    document.getElementById("songName").value.trim();

  const singerName =
    document.getElementById("singerName").value.trim();

  const instrument =
    document.getElementById("instrument").value;

  const apiKey =
    document.getElementById("apiKey").value.trim();


  if (!songName) {
    alert("Please enter a song name.");
    return;
  }


  if (!singerName) {
    alert("Please enter the singer or artist name.");
    return;
  }


  /*
    Demo mode works without an API.

    For real AI generation, we will connect this
    function to a backend API later.

    NEVER put a private production API key directly
    into frontend JavaScript.
  */

  if (!isDemo && !apiKey) {

    const useDemo = confirm(
      "No API key was entered.\n\n" +
      "Would you like to load a demo chord sheet instead?"
    );

    if (!useDemo) {
      return;
    }

    isDemo = true;
  }


  const workspace =
    document.getElementById("workspace");

  workspace.style.display = "block";


  document.getElementById("outputSong").textContent =
    songName;

  document.getElementById("outputArtist").textContent =
    singerName;


  const instrumentIcons = {
    guitar: "🎸",
    piano: "🎹",
    flute: "🪈",
    ukulele: "🎵",
    violin: "🎻",
    keyboard: "🎹"
  };


  const instrumentName =
    instrument.charAt(0).toUpperCase() +
    instrument.slice(1);


  document.getElementById("outputInstrument").textContent =
    `${instrumentIcons[instrument] || "🎵"} ${instrumentName}`;


  document.getElementById("sheetTitle").textContent =
    songName;

  document.getElementById("sheetArtist").textContent =
    singerName;


  if (isDemo) {

    generateDemoChords(songName, singerName);

  } else {

    await generateWithAPI(
      songName,
      singerName,
      instrument,
      apiKey
    );
  }


  workspace.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


/* =========================================
   DEMO CHORD GENERATION
========================================= */

function generateDemoChords(songName, singerName) {

  const songContent =
    document.getElementById("songContent");


  /*
    Generic demo progression.

    This is intentionally not reproducing copyrighted
    lyrics. Real lyrics/chords should come from a
    properly licensed or user-provided source.
  */

  songContent.innerHTML = `

    <div class="song-line">

      <div class="chords">
        G &nbsp;&nbsp;&nbsp; D &nbsp;&nbsp;&nbsp; Em &nbsp;&nbsp;&nbsp; C
      </div>

      <div class="lyrics">
        [Demo] Your first line goes here
      </div>

    </div>


    <div class="song-line">

      <div class="chords">
        G &nbsp;&nbsp;&nbsp; D &nbsp;&nbsp;&nbsp; C
      </div>

      <div class="lyrics">
        [Demo] Your second line goes here
      </div>

    </div>


    <div class="song-line">

      <div class="chords">
        Em &nbsp;&nbsp;&nbsp; C &nbsp;&nbsp;&nbsp; G &nbsp;&nbsp;&nbsp; D
      </div>

      <div class="lyrics">
        [Demo] Your chorus line goes here
      </div>

    </div>


    <div class="song-line">

      <div class="chords">
        C &nbsp;&nbsp;&nbsp; G &nbsp;&nbsp;&nbsp; D &nbsp;&nbsp;&nbsp; Em
      </div>

      <div class="lyrics">
        [Demo] Continue your song here
      </div>

    </div>

  `;


  document.getElementById("bpm").textContent =
    "100 BPM";
}


/* =========================================
   API GENERATION
========================================= */

async function generateWithAPI(
  songName,
  singerName,
  instrument,
  apiKey
) {

  const songContent =
    document.getElementById("songContent");


  songContent.innerHTML = `

    <div class="song-line">

      <div class="lyrics">
        ⏳ Generating your chord sheet...
      </div>

    </div>

  `;


  try {

    /*
      IMPORTANT:

      Do NOT directly send a secret production API key
      from a public frontend.

      Instead, your future setup should look like:

          Frontend
             ↓
          Your Backend
             ↓
          AI API

      Example endpoint:

          /api/generate

      The backend can securely store the API key.
    */


    const response = await fetch("/api/generate", {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({

        song: songName,

        artist: singerName,

        instrument: instrument,

        apiKey: apiKey

      })

    });


    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}`
      );
    }


    const data = await response.json();


    displayGeneratedSong(data);


  } catch (error) {

    console.error(error);


    songContent.innerHTML = `

      <div class="song-line">

        <div class="lyrics">
          ⚠️ AI generation is not connected yet.
        </div>

        <div class="lyrics">
          Your frontend is working. Connect the
          <strong>/api/generate</strong> backend endpoint
          to enable real AI generation.
        </div>

      </div>

    `;

  }
}


/* =========================================
   DISPLAY AI RESULT
========================================= */

function displayGeneratedSong(data) {

  const songContent =
    document.getElementById("songContent");


  if (!data || !data.lines) {

    songContent.innerHTML = `

      <div class="song-line">

        <div class="lyrics">
          No chord data was returned.
        </div>

      </div>

    `;

    return;
  }


  songContent.innerHTML = "";


  data.lines.forEach(line => {

    const songLine =
      document.createElement("div");

    songLine.className =
      "song-line";


    const chords =
      document.createElement("div");

    chords.className =
      "chords";

    chords.textContent =
      line.chords || "";


    const lyrics =
      document.createElement("div");

    lyrics.className =
      "lyrics";

    lyrics.textContent =
      line.lyrics || "";


    songLine.appendChild(chords);
    songLine.appendChild(lyrics);

    songContent.appendChild(songLine);

  });


  if (data.bpm) {

    document.getElementById("bpm").textContent =
      `${data.bpm} BPM`;

  }

}


/* =========================================
   TABS
========================================= */

function showTab(tabId, clickedButton) {

  const tabs =
    document.querySelectorAll(".tab-content");

  tabs.forEach(tab => {
    tab.style.display = "none";
  });


  const selectedTab =
    document.getElementById(tabId);

  if (selectedTab) {
    selectedTab.style.display = "block";
  }


  const buttons =
    document.querySelectorAll(".tab");

  buttons.forEach(button => {
    button.classList.remove("active");
  });


  if (clickedButton) {
    clickedButton.classList.add("active");
  }
}


/* =========================================
   TRANSPOSE
========================================= */

function transpose(amount) {

  transposeAmount += amount;


  /*
    Keep transpose within a practical range.
  */

  if (transposeAmount > 12) {
    transposeAmount = 12;
  }


  if (transposeAmount < -12) {
    transposeAmount = -12;
  }


  document.getElementById("transposeValue").textContent =
    transposeAmount > 0
      ? `+${transposeAmount}`
      : transposeAmount;


  applyTranspose();
}


/* =========================================
   CHORD TRANSPOSITION
========================================= */

function applyTranspose() {

  const chordElements =
    document.querySelectorAll(".chords");


  chordElements.forEach(element => {

    /*
      Store the original chord progression
      the first time we see it.
    */

    if (!element.dataset.original) {

      element.dataset.original =
        element.textContent;

    }


    const original =
      element.dataset.original;


    element.textContent =
      transposeChordText(
        original,
        transposeAmount
      );

  });
}


function transposeChordText(text, amount) {

  if (amount === 0) {
    return text;
  }


  const notes = [
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


  /*
    Supports common chord forms such as:

      C
      Am
      G7
      F#m
      Bb

    This is a simple client-side transposer.
  */

  return text.replace(
    /\b([A-G](?:#|b)?)(m|maj7|maj|min|dim|aug|sus2|sus4|7|9|11|13)?\b/g,
    (match, note, suffix = "") => {

      let normalizedNote = note;


      const flatMap = {
        Db: "C#",
        Eb: "D#",
        Gb: "F#",
        Ab: "G#",
        Bb: "A#"
      };


      if (flatMap[normalizedNote]) {
        normalizedNote =
          flatMap[normalizedNote];
      }


      const index =
        notes.indexOf(normalizedNote);


      if (index === -1) {
        return match;
      }


      const newIndex =
        (index + amount + 12) % 12;


      return notes[newIndex] + suffix;

    }
  );
}


/* =========================================
   COPY CHORDS
========================================= */

async function copyChords() {

  const songContent =
    document.getElementById("songContent");


  const text =
    songContent.innerText.trim();


  if (!text) {

    alert("There are no chords to copy.");

    return;
  }


  try {

    await navigator.clipboard.writeText(text);

    alert("Chord sheet copied!");

  } catch (error) {

    console.error(error);

    alert(
      "Could not copy automatically. " +
      "Please select and copy the text manually."
    );

  }
}


/* =========================================
   MICROPHONE PERMISSION
========================================= */

async function requestMicrophone() {

  if (!navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia) {

    alert(
      "Your browser does not support microphone recording."
    );

    return null;
  }


  try {

    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: true
      });

    return stream;

  } catch (error) {

    console.error(error);

    alert(
      "Microphone permission was denied or unavailable."
    );

    return null;
  }
}


/* =========================================
   START / STOP RECORDING
========================================= */

async function toggleRecording() {

  if (
    mediaRecorder &&
    mediaRecorder.state === "recording"
  ) {

    stopRecording();

    return;
  }


  const stream =
    await requestMicrophone();


  if (!stream) {
    return;
  }


  audioChunks = [];


  mediaRecorder =
    new MediaRecorder(stream);


  mediaRecorder.ondataavailable = event => {

    if (event.data.size > 0) {
      audioChunks.push(event.data);
    }

  };


  mediaRecorder.onstop = () => {

    audioBlob =
      new Blob(
        audioChunks,
        {
          type: "audio/webm"
        }
      );


    const audioURL =
      URL.createObjectURL(audioBlob);


    const audioPlayer =
      document.getElementById("audioPlayer");


    audioPlayer.src =
      audioURL;


    audioPlayer.style.display =
      "block";


    document.querySelector(".record-actions")
      .style.display = "flex";


    /*
      Stop microphone access.
    */

    stream.getTracks().forEach(track => {
      track.stop();
    });

  };


  mediaRecorder.start();


  startRecordingTimer();


  const button =
    document.getElementById("recordButton");


  button.textContent =
    "⏹️ Stop Recording";

}


/* =========================================
   STOP RECORDING
========================================= */

function stopRecording() {

  if (
    mediaRecorder &&
    mediaRecorder.state === "recording"
  ) {

    mediaRecorder.stop();

  }


  stopRecordingTimer();


  const button =
    document.getElementById("recordButton");


  button.textContent =
    "🔴 Start Recording";
}


/* =========================================
   RECORDING TIMER
========================================= */

function startRecordingTimer() {

  recordingSeconds = 0;


  updateTimer();


  recordingTimer =
    setInterval(() => {

      recordingSeconds++;

      updateTimer();

    }, 1000);
}


function stopRecordingTimer() {

  if (recordingTimer) {

    clearInterval(recordingTimer);

    recordingTimer = null;

  }
}


function updateTimer() {

  const minutes =
    Math.floor(recordingSeconds / 60)
      .toString()
      .padStart(2, "0");


  const seconds =
    (recordingSeconds % 60)
      .toString()
      .padStart(2, "0");


  document.getElementById("timer").textContent =
    `${minutes}:${seconds}`;
}


/* =========================================
   DOWNLOAD RECORDING
========================================= */

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
    "chordflow-recording.webm";


  document.body.appendChild(link);

  link.click();

  link.remove();


  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}


/* =========================================
   DELETE RECORDING
========================================= */

function deleteRecording() {

  audioBlob = null;

  audioChunks = [];


  const audioPlayer =
    document.getElementById("audioPlayer");


  audioPlayer.pause();

  audioPlayer.removeAttribute("src");

  audioPlayer.load();


  audioPlayer.style.display =
    "none";


  document.querySelector(".record-actions")
    .style.display = "none";


  document.getElementById("timer").textContent =
    "00:00";


  recordingSeconds = 0;
}


/* =========================================
   INITIALIZATION
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    console.log(
      "🎵 ChordFlow initialized."
    );

  }
);