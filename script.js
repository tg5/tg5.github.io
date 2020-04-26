console.clear();

document.documentElement.addEventListener('mousedown', () => {
  if (Tone.context.state !== 'running') Tone.context.resume();
});


// change this seed for a new song.
noise.seed(200);

// ugh this shits a mess.

// basically, we get musical key data (root, major/minor) and generate a scale.
// then that scale of notes is sorted so that the best notes for the key are distributed towards the center of the array
// and the "worst" eg. 2nd, 4th are distributed towards the perimeter of the array.
// then we grab one with perlin noise when the time comes.

class App {
  constructor(params) {
    // generate a scale
    this.scale = new Scale({ seed: 100 });
    // the overall gain 0-1 (silenced on pause)
    this.level = 1;
    // how deep the line/bar chart history is
    this.hist = 1000;
    // an array of line/bar chart history
    this.hist_arr = [];
    // set the length of the history array
    this.hist_arr.length = this.hist;
    // load the tonejs transport
    this.setTransport();
    // load the tonejs synth
    this.setSynth();
    // load the tonejs drum synth
    this.setDrum();
    // load the dom keyboard
    this.setOutput();
    // load the background canvas
    this.setCanvas();
    // playing state
    this.playing = false;
    // grab the toggle
    this.toggle = document.querySelector(`#${params.toggle_id}`);
    // click the toggle
    this.toggle.addEventListener('click', e => {this.onClick(e);});
    // start the animation frame loop
    this.onFrame();
  }

  // toggle play state
  onClick(e) {
    if (this.playing) {
      this.onPause();
      this.playing = false;
    } else {
      this.onPlay();
      this.playing = true;
    }
  }

  // on play event
  onPlay() {
    this.gain.gain.value = this.level;
    Tone.Transport.start();
    this.toggle.classList.add('active');
  }

  // on pause event
  onPause() {
    this.gain.gain.value = 0;
    Tone.Transport.pause();
    this.toggle.classList.remove('active');
  }

  // play is called each time a note is needed on the tonejs transport schedule
  play(time) {
    // grab the perlin index for the note
    let note_index = Math.floor(this.noise * this.scale.synth.length);
    // determine that notes position from center to get a score
    let dist_from_center = Math.round(Math.abs(note_index / (this.scale.synth.length / 2) - 1) * 10) / 10;
    // we want to choose shorter lengths for weaker notes.
    // this will push the selection to the end of the array for weakest notes
    let array_length = this.note_lens.length - Math.ceil(this.note_lens.length * dist_from_center);
    // the relative index
    let note_len_index = Math.floor(this.noise * array_length) + this.note_lens.length - array_length;
    // grab the note
    let note = this.scale.synth[note_index];
    // make an identifier eg "C4"
    let id = note.note + note.octave;
    // find the active div(s)
    let el_rm = document.querySelectorAll(`div.active`);
    // remove the class from the active divs
    for (let i = 0; i < el_rm.length; i++) {
      el_rm[i].classList.remove('active');
    }
    // find the new active div
    let el_t = document.querySelector(`#note-${id}`);
    // add the class to the active div
    el_t.classList.add('active');
    // increase the clock
    this.clock += this.rate;
    // select the note length
    this.note_len_n = this.note_len_ns[note_len_index];
    // set the note_len to be used to determine hold. 1m = 32 * 32n
    this.note_len = 32 / this.note_lens[note_len_index];
    // trigger the note on the tonejs synth
    this.synth.triggerAttackRelease(`${note.note}${note.octave}`, this.note_len_n, time);
  }

  // on each request animation frame
  onFrame() {
    // set the base x position
    let x = this.w;
    // set the base y
    let y = this.playing ? this.h - this.noise * this.h : this.h;

    // to preserve max array length we shift it.
    if (this.hist_arr.length >= this.hist) this.hist_arr.shift();
    // push the latest note to the array
    this.hist_arr.push({ x: x, y: y });
    // clear the canvas
    this.ctx.clearRect(0, 0, this.w, this.h);

    // the outline path color
    this.ctx.strokeStyle = '#333';
    // the bar fill color
    this.ctx.fillStyle = '#292929';
    // the outline path line width
    this.ctx.lineWidth = 2;
    // start the path
    this.ctx.beginPath();
    // we need to "moveTo" once, so we toggle this value to do that
    let last = false;
    // for each item in history
    this.hist_arr.forEach((v, i) => {
      // some history values are empty until we have framed the history length
      if (v) {
        // relative x position for the history item
        let local_x = x * (i / this.hist_arr.length);
        // height normalized to bottom to middle
        let h = this.h - v.y;
        // width for the item is 1 / history count
        let w = this.w * (1 / this.hist);
        // fill in the rectangle
        this.ctx.fillRect(local_x, v.y, w, h);
        // find the next item for a lineTo
        let next = this.hist_arr[i + 1];
        // if last item, there is no next
        if (next) {
          // only need to moveTo once.
          if (!last) {
            // move to
            this.ctx.moveTo(local_x, v.y);
            // prevent this from being called again in this frame
            last = true;
          }
          // find the next x
          let next_x = next.x * ((i + 1) / this.hist_arr.length);
          // draw the line to
          this.ctx.lineTo(next_x, next.y);
        }
      }
    });
    // stroke the line
    this.ctx.stroke();
    // call this ish again
    window.requestAnimationFrame(() => {
      this.onFrame();
    });
  }

  // loading the canvas element
  setCanvas() {
    this.cvs = document.querySelector('#canvas');
    this.ctx = this.cvs.getContext('2d');
    this.w = window.innerWidth * 2;
    this.h = window.innerHeight * 2;
    this.cvs.width = this.w;
    this.cvs.height = this.h;
  }

  // loading the synth keyboard
  setOutput() {
    this.synth_output = document.querySelector('#synth');
    this.scale.scale.forEach(note => {
      let id = note.note + note.octave;
      let el = document.querySelector(`#note-${id}`);
      if (!el) {
        el = document.createElement('div');
        el.id = `note-${id}`;
        el.innerHTML = '<span>' + id.replace('b', '<sup>♭</sup>') + '</span>';
        this.synth_output.appendChild(el);
      }
    });
  }

  // loading the tonejs transport
  setTransport() {
    // global gain
    this.gain = new Tone.Gain(this.level).toMaster();
    // will repeat every 32nd note
    this.res = '32n';
    // starting note length (needs to be non-null)
    this.note_len_n = '16n';
    // note len will be the integer value of the current note
    this.note_len = null;
    // all potential note lengths, shittier key notes will ignore the beginning of this array
    // depending on how shitty they are
    // that way less important notes occur more quickly
    this.note_lens = [1, 2, 4, 8, 16];
    // we want to hold the "32n" notation of our lengths in here
    this.note_len_ns = [];
    // for each integer, create teh "n" string
    this.note_lens.forEach(nl => {this.note_len_ns.push(nl + 'n');});
    // start the clock at zero
    this.clock = 0;
    // the rate. the higher this is, the more random
    // the lower this is, the more frequent repeats.
    // this is honed in. changing it drastically will make things worse
    this.rate = 0.1;
    // we count sustain to know when to fire the next note
    this.sustain = 0;
    // current beat used for the drumkit
    this.beat = 0;
    // set the bpm
    Tone.Transport.bpm.value = 100;
    // drum kick tone at root of key, 1st octave
    this.kick = `${this.scale.root}1`;
    // drum snare tone at root of key, 4th octave
    this.snare = `${this.scale.root}4`;
    // drum hihat tone at 3rd of key, 5th octave
    let hat_note = this.scale.scale[2];
    this.hat = `${hat_note.note}5`;
    // schedule the repeat
    Tone.Transport.scheduleRepeat(time => {
      this.onTransport(time);
    }, this.res);
  }

  // on transport schedule (every 32nd note)
  onTransport(time) {
    // drum programming
    // every 16 32nd notes (every 1, 3 in measure) 
    if (this.beat % 16 === 0) {
      // if it is the first beat and note the first of the fourth measure
      if (this.beat === 0 || this.beat % 128 !== 0) {
        // kickdrum
        this.onKick(time);
      }
      // every 16 32nd notes + 8 offset (every 2, 4 in measure) 
    } else if ((this.beat + 8) % 16 === 0) {
      this.onSnare(time);
      // every 4 32nd notes + 4 offset (every "and+" in measure, 1 "+" 2 "+" 3 "+"...) 
      // syncopation
    } else if ((this.beat + 4) % 4 === 0) {
      this.onHat(time);
    }
    // pickup kick every 4 measures with 14 offset
    if ((this.beat + 14) % 64 === 0) {
      this.onKick(time);
      // pickup snares every 4 measures with 6 and 12 offset (around the 8 offset snare above)
    } else if ((this.beat + 6) % 64 === 0 || (this.beat + 12) % 64 === 0) {
      this.onSnare(time);
    }

    // count the 32nd beat
    this.beat++;

    // play the synth if is not sustaining
    if (this.sustain < this.note_len) {
      // we are sustaining
      this.sustain++;
    } else {
      // get the next noise
      this.noise = noise.perlin2(this.clock, this.clock) * 0.5 + 0.5;
      // reset sustain
      this.sustain = 0;
      // play the note
      this.play(time);
    }
  }

  // drum synth triggers and dom classes for css animation
  onKick(time) {
    document.body.classList.add('kick');
    setTimeout(() => {
      document.body.classList.remove('kick');
    }, 100);
    this.drum.triggerAttack(this.kick, time);
  }

  onSnare(time) {
    document.body.classList.add('snare');
    setTimeout(() => {
      document.body.classList.remove('snare');
    }, 100);
    this.drum.triggerAttack(this.snare, time);
  }

  onHat(time) {
    document.body.classList.add('hat');
    setTimeout(() => {
      document.body.classList.remove('hat');
    }, 100);
    this.drum.triggerAttack(this.hat, time);
  }

  // build the drum tonejs synth
  setDrum() {
    var gain = new Tone.Gain(0.6);

    var filter = new Tone.AutoFilter(1, 200);
    filter.filter.Q.value = 3;


    var dist = new Tone.Distortion(1);
    dist.wet.value = 0.7;

    var del = new Tone.PingPongDelay('4n', 0.2);
    del.wet.value = 0.1;

    this.drum = new Tone.DrumSynth();
    this.drum.set({
      pitchDecay: 0.05,
      octaves: 3,
      oscillator: {
        type: 'triangle' },

      envelope: {
        attack: 0.001,
        decay: 0.2,
        sustain: 0.01,
        release: 0.01,
        attackCurve: 'exponential' } });



    gain.connect(this.gain);
    dist.connect(gain);
    del.connect(dist);
    filter.connect(del);
    this.drum.connect(filter);
  }

  // build the main tonejs synth
  setSynth() {
    var gain = new Tone.Gain(0.7);

    var chorus = new Tone.Chorus();
    chorus.frequency.value = 0.5;

    var bit = new Tone.BitCrusher(6);
    bit.wet.value = 0;

    this.synth = new Tone.PolySynth(6, Tone.SimpleAM);
    this.synth.set({
      carrier: {
        oscillator: {
          type: 'triangle' },

        envelope: {
          attack: 0.001,
          decay: 0.1,
          sustain: 1,
          release: 0.5 } } });




    gain.connect(this.gain);
    bit.connect(gain);
    this.synth.connect(bit);
  }}


// creating a scale
class Scale {
  constructor(params) {
    let notes = 'C Db D Eb E F Gb G Ab A Bb B'.split(' ');
    let synth_noise = noise.perlin3(params.seed, notes.length, 0.2) * 0.5 + 0.5;
    this.min_oct = 2;
    this.max_oct = 5;
    // randomly set a root
    this.root = notes[Math.floor(synth_noise * notes.length)];
    this.scale = [];
    this.synth = [];
    // randomly set a mode
    this.mode = 'maj min'.split(' ')[Math.floor(synth_noise * 2)];
    this.initialize();
  }

  // generate the scale
  initialize() {
    // generate the scale
    var steps_lib = this.genStepsLib();
    var notes_lib = this.genNotesLib();
    // priorities per step (higher = better for the key)
    var influence = [3, 0, 3, 1, 3, 1, 1];
    var steps = steps_lib;
    let octaves = this.max_oct - this.min_oct;
    var start = notes_lib.indexOf(this.root + this.min_oct);
    // var last_note = octaves * 8;
    var last_note = octaves * 8;
    let synth_common = [];
    synth_common.length = influence.sort()[influence.length - 1] + 1;
    for (let o = 0; o < last_note; o++) {
      let index = start + steps[o % steps.length] + Math.floor(o / steps.length) * 12;
      let infl = influence[o % steps.length];
      if (!synth_common[infl]) synth_common[infl] = [];
      let note = notes_lib[index];
      if (note) {
        let obj = { note: note.match(/[^\d]+/)[0], octave: note.match(/\d/)[0] };
        this.scale.push(obj);
        synth_common[infl].push(obj);
      }
    }

    let synth_adj_l = [];
    let synth_adj_r = [];

    for (let t = 0; t < synth_common.length; t++) {
      let common = synth_common[t];
      if (!common) continue;
      for (let i = 0; i < common.length; i++) {
        let arr = i % 2 === 0 ? synth_adj_l : synth_adj_r;
        arr.push(common[i]);
      }
    }

    synth_adj_l.reverse();

    this.synth = synth_adj_l.concat(synth_adj_r);
  }

  // set the notes for the key
  genStepsLib() {
    // generate major and minor integer step arrays from whole/half notation
    // whole/half note steps for minor and major
    var mode = {
      maj: 'W W H W W W H',
      min: 'W H W W H W W' }[
    this.mode].split(' ');

    // generating an array of integers based on W/H step notation
    // will contain all steps
    var steps = [0];
    // loop through
    for (let s = 0; s < mode.length; s++) {
      let key = mode[s];
      let last_step = steps[steps.length - 1];
      let item = key === 'W' ? last_step + 2 : last_step + 1;
      steps.push(item);
    }
    return steps;
  }

  // generate every possible note/octave pairing in order
  genNotesLib() {
    var notes = [];
    for (let i = 0; i < 9; i++) {
      var n = 'C Db D Eb E F Gb G Ab A Bb B'.split(' ');
      for (let x = 0; x < n.length; x++) notes.push(n[x] + i);
    }
    return notes;
  }}


let app = new App({
  toggle_id: 'play' });


console.log(app.scale.root, app.scale.mode, app.scale.synth.map(i => {return i.note;}));