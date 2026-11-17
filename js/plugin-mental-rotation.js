/*
 * jsPsych 8 plugin: one mental rotation trial (Shepard & Metzler, 1971).
 * Sequence: fixation "+" -> two cube figures (until response or timeout)
 *           -> optional feedback -> blank inter-trial interval.
 * The right figure is the left figure rotated in depth ("sama"),
 * or its mirror image rotated in depth ("cermin" -> correct answer "beda").
 * Keyboard keys are always accepted; on-screen buttons are shown in "touch" mode.
 * RT is measured from the first animation frame after the figures are shown.
 */
var jsPsychMentalRotation = (function (jspsych) {
  "use strict";

  const info = {
    name: "mental-rotation",
    version: "1.0.0",
    parameters: {
      shape: { type: jspsych.ParameterType.STRING, default: undefined }, // key in FIGURES.SHAPES
      mirror: { type: jspsych.ParameterType.BOOL, default: false }, // right figure mirrored?
      az_left: { type: jspsych.ParameterType.FLOAT, default: 30 },
      az_right: { type: jspsych.ParameterType.FLOAT, default: 30 },
      elevation: { type: jspsych.ParameterType.FLOAT, default: 30 },
      key_same: { type: jspsych.ParameterType.STRING, default: "a" },
      key_diff: { type: jspsych.ParameterType.STRING, default: "l" },
      input: { type: jspsych.ParameterType.STRING, default: "keyboard" }, // "keyboard" | "touch"
      fixation_duration: { type: jspsych.ParameterType.INT, default: 500 },
      trial_duration: { type: jspsych.ParameterType.INT, default: 8000 },
      feedback: { type: jspsych.ParameterType.BOOL, default: false },
      feedback_duration: { type: jspsych.ParameterType.INT, default: 800 },
      iti: { type: jspsych.ParameterType.INT, default: 500 },
    },
    data: {
      shape: { type: jspsych.ParameterType.STRING },
      pair: { type: jspsych.ParameterType.STRING }, // "sama" | "cermin"
      az_left: { type: jspsych.ParameterType.FLOAT },
      az_right: { type: jspsych.ParameterType.FLOAT },
      response: { type: jspsych.ParameterType.STRING }, // "sama" | "beda" | null
      correct: { type: jspsych.ParameterType.BOOL },
      timeout: { type: jspsych.ParameterType.BOOL },
      rt: { type: jspsych.ParameterType.FLOAT },
      input_method: { type: jspsych.ParameterType.STRING },
      response_source: { type: jspsych.ParameterType.STRING }, // keyboard | touch | mouse | pen
      onset_source: { type: jspsych.ParameterType.STRING }, // "frame" (normal) or "fallback"
      page_hidden: { type: jspsych.ParameterType.BOOL },
    },
  };

  class MentalRotationPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      const touch = trial.input === "touch";
      const cubes = window.FIGURES.SHAPES[trial.shape];
      const K = { same: trial.key_same.toUpperCase(), diff: trial.key_diff.toUpperCase() };

      const panel = touch
        ? `<div class="mr-buttons" role="group" aria-label="Jawaban">
             <button type="button" class="mr-btn" data-r="sama">SAMA</button>
             <button type="button" class="mr-btn" data-r="beda">BEDA</button>
           </div>`
        : `<div class="mr-legend" aria-hidden="true">
             <div class="key"><kbd>${K.same}</kbd><small>SAMA</small></div>
             <div class="key"><kbd>${K.diff}</kbd><small>BEDA</small></div>
           </div>`;

      display_element.innerHTML = `
        <div class="mr-wrap">
          <div class="mr-stage" id="mr-stage">
            <div class="mr-pair" id="mr-pair" hidden>
              <div class="mr-fig"><canvas id="mr-left" aria-label="Bentuk kiri"></canvas></div>
              <div class="mr-fig"><canvas id="mr-right" aria-label="Bentuk kanan"></canvas></div>
            </div>
            <div class="mr-msg" id="mr-msg" aria-live="polite">+</div>
          </div>
          ${panel}
        </div>`;
      const stage = display_element.querySelector("#mr-stage");
      const pair = display_element.querySelector("#mr-pair");
      const msg = display_element.querySelector("#mr-msg");
      const buttons = Array.from(display_element.querySelectorAll(".mr-btn"));

      // Draw both figures now (hidden) so they appear instantly after the fixation.
      const s = layout(stage, pair);
      window.FIGURES.draw(display_element.querySelector("#mr-left"), {
        cubes: cubes, az: trial.az_left, el: trial.elevation, size: s, mirror: false,
      });
      window.FIGURES.draw(display_element.querySelector("#mr-right"), {
        cubes: cubes, az: trial.az_right, el: trial.elevation, size: s, mirror: trial.mirror,
      });

      let onset = null;
      let onsetSource = null;
      let done = false;
      const timers = [];
      const later = (fn, ms) => timers.push(setTimeout(fn, ms));

      const respond = (resp, evTime, source) => {
        if (done || onset === null) return;
        done = true;
        const now = performance.now();
        const t = evTime && evTime > onset && evTime <= now + 1 ? evTime : now;
        finish(resp, Math.round(t - onset), source);
      };
      const onKey = (e) => {
        if (e.repeat) return;
        const k = (e.key || "").toLowerCase();
        const r = k === trial.key_same ? "sama" : k === trial.key_diff ? "beda" : null;
        if (r) {
          e.preventDefault();
          respond(r, e.timeStamp, "keyboard");
        }
      };
      const onTap = (e) => {
        e.preventDefault();
        const b = e.currentTarget;
        b.classList.add("pressed");
        respond(b.dataset.r, e.timeStamp, e.pointerType || "touch");
      };
      const noMenu = (e) => e.preventDefault();
      const cleanup = () => {
        document.removeEventListener("keydown", onKey);
        buttons.forEach((b) => b.removeEventListener("pointerdown", onTap));
        display_element.removeEventListener("contextmenu", noMenu);
      };

      const finish = (response, rt, source) => {
        timers.forEach(clearTimeout);
        cleanup();
        const timeout = response === null;
        const correctResp = trial.mirror ? "beda" : "sama";
        const correct = !timeout && response === correctResp;
        const data = {
          shape: trial.shape,
          pair: trial.mirror ? "cermin" : "sama",
          az_left: trial.az_left,
          az_right: trial.az_right,
          response: response,
          correct: correct,
          timeout: timeout,
          rt: timeout ? null : rt,
          input_method: trial.input,
          response_source: source || null,
          onset_source: onsetSource,
          page_hidden: document.hidden,
        };
        const end = () => {
          pair.hidden = true;
          msg.hidden = false;
          msg.textContent = "";
          msg.className = "mr-msg";
          buttons.forEach((b) => b.classList.remove("pressed"));
          setTimeout(() => this.jsPsych.finishTrial(data), trial.iti);
        };
        if (trial.feedback) {
          pair.hidden = true;
          msg.hidden = false;
          msg.className = "mr-msg mr-feedback " + (correct ? "ok" : "bad");
          msg.innerHTML = timeout
            ? "Terlalu lambat"
            : correct
            ? "✓ Benar"
            : `✗ Salah<span>Jawaban yang benar: ${correctResp.toUpperCase()}</span>`;
          setTimeout(end, trial.feedback_duration + (correct ? 0 : 600));
        } else {
          end();
        }
      };

      document.addEventListener("keydown", onKey);
      buttons.forEach((b) => b.addEventListener("pointerdown", onTap));
      display_element.addEventListener("contextmenu", noMenu);

      later(() => {
        msg.hidden = true;
        pair.hidden = false;
        let started = false;
        const start = (fromFrame) => {
          if (started) return;
          started = true;
          onset = performance.now();
          onsetSource = fromFrame ? "frame" : "fallback";
          later(() => {
            if (!done) {
              done = true;
              finish(null, null, null);
            }
          }, trial.trial_duration);
        };
        requestAnimationFrame(() => start(true));
        later(() => start(false), 100);
      }, trial.fixation_duration);
    }
  }

  // Pick side-by-side or stacked, whichever gives the bigger figures; returns figure size in px.
  function layout(stage, pair) {
    const pad = 16, gap = 12;
    const W = stage.clientWidth - 2 * pad;
    const H = stage.clientHeight - 2 * pad;
    const side = Math.min((W - gap) / 2, H);
    const stack = Math.min(W, (H - gap) / 2);
    const stacked = stack > side * 1.15;
    pair.classList.toggle("stacked", stacked);
    return Math.max(120, Math.floor(Math.min(stacked ? stack : side, 440)));
  }

  MentalRotationPlugin.info = info;
  return MentalRotationPlugin;
})(jsPsychModule);
