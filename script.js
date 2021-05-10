console.clear();

// SETUP ------------------

const rowLength = 8; //beats per loop
const notes = [
//seen as different notes down the sequencer
"C2 E2 G3 C3 Bb3 C3 E4 G4 C4".split(" "),
"C#2 F2 G#3 C#3 C3 C#3 F4 G#4 C#4".split(" "),
"c#3 f#2 a#3 d#3 f3 f#3 c4 c#4 g#4 ".split(" ")];


// sets initial parameters for beatgenerator function
let builder = {
  number: 2, //2-5
  direction: "up", //up/down
  notes: 0, //index of notes array to play from
  threshold: 3, //starting max number of  notes in sequencer (goes up and down dynamically)
  thresholdMax: 20 // limits total notes in sequencer
};

let started = false; //audio context autoplay workaround

let loop;

// ------- ------------------

document.addEventListener("click", () => {
  if (started) return;
  started = true;
  toggleTone();

  const BPM = 240;
  const instruments = [];
  const gain = new Tone.Gain(0.2);
  gain.toDestination();
  const rows = [...document.querySelectorAll("#sequencer div")];
  const boxes = [...document.querySelectorAll("input")];

  rows.forEach((row, i) =>
  // instruments.push(
  //   new Tone.Synth({
  //     oscillator: {
  //       type: "triangle"
  //     },
  //     envelope: {
  //       attack: 0.05,
  //       decay: 0.3,
  //       sustain: 0.3 * 0.3 * i, //to vary the instruments a bit
  //       release: 1
  //     }
  //   })
  // )
  instruments.push(
  new Tone.MembraneSynth({
    pitchDecay: 0.001,
    octaves: 10,
    oscillator: {
      type: "triangle" },

    envelope: {
      attack: 0.005,
      decay: 0.6,
      sustain: 0.3 * 0.2 * i,
      release: 1.4,
      attackCurve: "exponential" } })));




  instruments.forEach(instrument => instrument.connect(gain));

  let step = 0;
  Tone.start();
  Tone.Transport.bpm.value = BPM;
  console.log(Tone.Transport.bpm.value);

  Tone.Transport.start();
  loop = Tone.Transport.scheduleRepeat(repeat, "8n");

  function repeat(time) {
    rows.forEach((row, i) => {
      let box = row.querySelector(`input:nth-child(${step % rowLength + 1})`);
      if (box.checked) {
        instruments[i].triggerAttackRelease(
        notes[builder.notes][i],
        "8n",
        time);

      }
      updateDOM(box);
    });

    step++;
    beatGenerator();
  }

  function beatGenerator() {
    //randomly add new box(es) at end(time) of each measure

    if (step % rowLength === 0) {
      for (let i = 0; i < 2; i++) {
        let randomBox = boxes[Math.floor(Math.random() * boxes.length)];
        randomBox.checked = !randomBox.checked;
      }
    }
    // clear some boxes if threshold has been exceeded
    let checkedBoxes = [...document.querySelectorAll("input:checked")];

    if (checkedBoxes.length > builder.threshold) {
      checkedBoxes.forEach((box, i) => {
        i % builder.number === 0 ? box.checked = false : null;
      });

      //resets upperlimit of checked notes to 4 when maximum is reached
      if (builder.threshold > builder.thresholdMax) {
        builder.threshold = 3;
        checkedBoxes.forEach((box, i) => {
          i > 3 ? box.checked = false : null;
        });
      } else {
        builder.threshold += 2;
      }

      //conditions for changing notes played
      if (builder.number === 3 && builder.direction === "up") {
        builder.notes = 2;
      } else if (builder.number % 2 === 0) {
        builder.notes = 1;
      } else {
        builder.notes = 0;
      }

      //conditions for increasing/decreasing builder number (determines how many boxes are unticked)
      if (builder.number === 2) {
        builder.number++;
        builder.direction = "up";
      } else if (builder.number === 6) {
        builder.number--;
        builder.direction = "down";
      } else {
        if (builder.direction === "up") {
          builder.number++;
        } else {
          builder.number--;
        }
      }
      console.log(builder);
    }
  }

  function updateDOM(box) {
    let checkedLabel = document.querySelector(`label[for="${box.id}"]`);
    if (box.checked && !checkedLabel.classList.contains("active")) {
      checkedLabel.classList.add("active");
    } else if (box.checked && checkedLabel.classList.contains("active")) {
      checkedLabel.classList.remove("active");
      void checkedLabel.offsetHeight; //restart animation 'hack'
      checkedLabel.classList.add("active");
    } else if (!box.checked && checkedLabel.classList.contains("active")) {
      checkedLabel.classList.remove("active");
    }
  }
});

//DOM build
(() => {
  const app = document.querySelector("#app");
  //create containers
  const boxes = document.createElement("div");
  boxes.setAttribute("id", "sequencer");
  const labels = document.createElement("div");
  labels.setAttribute("id", "labels");
  const stopButton = document.createElement("button");
  stopButton.addEventListener("click", () => {
    toggleTone();
  });

  stopButton.setAttribute("id", "stop-button");

  stopButton.innerText = "🎹";

  app.appendChild(boxes);
  app.appendChild(labels);
  app.appendChild(stopButton);

  const createBox = (i, j) => {
    let box = document.createElement("input");
    box.setAttribute("type", "checkbox");
    box.setAttribute("id", `box-${i}-${j}`);
    return box;
  };
  const createLabel = (i, j) => {
    let label = document.createElement("label");
    label.setAttribute("for", `box-${i}-${j}`);
    label.innerText = " ";

    return label;
  };
  for (let i = 0; i < notes[builder.notes].length; i++) {
    let boxRow = document.createElement("div");
    let labelRow = document.createElement("div");
    for (let j = 0; j < rowLength; j++) {
      boxRow.appendChild(createBox(i, j));
      labelRow.appendChild(createLabel(i, j));
    }
    boxes.appendChild(boxRow);
    labels.appendChild(labelRow);
  }
})();

function toggleTone() {
  Tone.Transport.toggle();
  const boxes = [...document.querySelectorAll("input")];
  const btn = document.querySelector("#stop-button");
  btn.innerText === "🎹" ?
  btn.innerText = "🎹" :
  btn.innerText = "🎹";
  boxes.forEach(box => box.checked = false);
}

// -------------------------------------------------------------------------------------