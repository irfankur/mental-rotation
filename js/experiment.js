/* Mental Rotation Task (Bahasa Indonesia), jsPsych 8 + DataPipe */
(function () {
  "use strict";
  const CFG = window.STUDY_CONFIG;
  const FIG = window.FIGURES;
  const params = new URLSearchParams(window.location.search);

  // ?test=1 -> short version (6 practice, 8 test trials); data downloaded locally
  const TEST_MODE = params.get("test") === "1";
  const USE_PIPE = !!CFG.DATAPIPE_EXPERIMENT_ID && !TEST_MODE;

  // Live site without a DataPipe ID = data collection is paused: show a notice
  // instead of the task, so nobody does the whole task without their data being saved.
  if (!CFG.DATAPIPE_EXPERIMENT_ID && !TEST_MODE) {
    document.getElementById("jspsych-target").innerHTML = `
      <div class="shell"><div class="card">
        <p class="eyebrow">Eksperimen Psikologi</p>
        <h1>Tes Bentuk 3D</h1>
        <h2>Pengambilan data sedang dijeda</h2>
        <p>Tempat penyimpanan data penelitian ini sedang dipindahkan, jadi eksperimen belum bisa diikuti untuk sementara.</p>
        <p>Silakan buka tautan ini lagi dalam beberapa hari. Terima kasih atas minat Anda!</p>
        <p class="small muted">Pertanyaan: ${CFG.RESEARCHER_CONTACT}</p>
      </div></div>`;
    return;
  }

  // Device detection: only a suggestion; the participant confirms it.
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;
  const DETECTED = coarse || noHover ? "touch" : "keyboard";
  let INPUT = params.get("input") === "touch" || params.get("input") === "keyboard" ? params.get("input") : DETECTED;

  const KS = CFG.KEY_SAME.toUpperCase();
  const KD = CFG.KEY_DIFF.toUpperCase();
  const N_FULL = FIG.TEST_SHAPES.length * CFG.ANGLES.length * 2; // 64
  const N_TEST = TEST_MODE ? 8 : N_FULL;
  const N_PRACTICE = CFG.PRACTICE_TRIALS;
  const TOTAL_STEPS = 6 + N_PRACTICE + N_TEST; // pages + trials, for the progress bar
  let stepsDone = 0;

  const jsPsych = initJsPsych({
    display_element: "jspsych-target",
    show_progress_bar: true,
    auto_update_progress_bar: false,
    message_progress_bar: "",
    on_trial_finish: (data) => {
      if (["countdown", "fullscreen", "end", "save"].includes(data.task)) return;
      stepsDone++;
      jsPsych.progressBar.progress = Math.min(1, stepsDone / TOTAL_STEPS);
    },
  });
  if (TEST_MODE) window.__jsPsych = jsPsych; // for debugging in the browser console
  const R = jsPsych.randomization;
  const subject_id = R.randomID(10);
  const filename = `${subject_id}.csv`;
  const studyUrl = window.location.origin + window.location.pathname;

  jsPsych.data.addProperties({
    subject_id: subject_id,
    detected_input: DETECTED,
    test_mode: TEST_MODE,
    user_agent: navigator.userAgent,
    screen_w: window.screen.width,
    screen_h: window.screen.height,
    viewport_w: window.innerWidth,
    viewport_h: window.innerHeight,
    pixel_ratio: window.devicePixelRatio,
    start_time: new Date().toISOString(),
  });

  const leaveGuard = (e) => {
    e.preventDefault();
    e.returnValue = "";
  };
  window.addEventListener("beforeunload", leaveGuard);

  // ---------------------------------------------------------------- helpers
  const shell = (inner) => `<div class="shell">${inner}</div>`;
  const btn = (cls) => (choice) => `<button class="jspsych-btn ${cls || ""}">${choice}</button>`;
  const primaryLast = (choice, i) => `<button class="jspsych-btn ${i === 1 ? "primary" : ""}">${choice}</button>`;
  const keyCaps = () =>
    `<div class="keys"><div class="key"><kbd>${KS}</kbd><small>SAMA</small></div><div class="key"><kbd>${KD}</kbd><small>BEDA</small></div></div>`;
  const touchCaps = () => `<div class="keys"><span class="chip">SAMA</span><span class="chip">BEDA</span></div>`;
  const answerCaps = () => (INPUT === "touch" ? touchCaps() : keyCaps());

  // Viewing angles (5-degree grid). A view is usable when
  //  (1) no arm points almost straight at the viewer, and
  //  (2) no cube is hidden behind another arm (FIGURES.visibility >= MIN_VISIBILITY).
  // Visibility is computed lazily per figure and cached, so start-up stays fast on phones.
  const okAz = (a) => {
    const m = ((a % 90) + 90) % 90;
    return m >= CFG.AXIS_MARGIN && m <= 90 - CFG.AXIS_MARGIN;
  };
  const visCache = {};
  const goodView = (shape, mirror, az) => {
    if (!okAz(az)) return false;
    const k = `${shape}|${mirror}|${az}`;
    if (!(k in visCache)) visCache[k] = FIG.visibility(FIG.SHAPES[shape], az, CFG.ELEVATION, mirror);
    return visCache[k] >= CFG.MIN_VISIBILITY;
  };
  const wrap360 = (a) => ((a % 360) + 360) % 360;
  const sampleAz = (shape, mirror, angle) => {
    const options = [];
    for (let left = 0; left < 360; left += 5)
      [-1, 1].forEach((dir) => {
        const right = wrap360(left + dir * angle);
        if (goodView(shape, false, left) && goodView(shape, mirror, right)) options.push({ left, right, dir });
      });
    if (options.length) return R.sampleWithoutReplacement(options, 1)[0];
    // fallback (never needed with the current figures): angle rule only
    const left = 45, dir = 1;
    return { left: left, right: wrap360(left + dir * angle), dir: dir };
  };

  // Example figures drawn inside instruction pages: <canvas class="ex" data-shape data-az data-mirror>
  const drawExamples = () => {
    document.querySelectorAll("canvas.ex").forEach((c) => {
      const box = c.closest(".ex-pair");
      const size = Math.floor(Math.min(200, (box.clientWidth - 40) / 2));
      FIG.draw(c, {
        cubes: FIG.SHAPES[c.dataset.shape],
        az: Number(c.dataset.az),
        el: CFG.ELEVATION,
        size: size,
        mirror: c.dataset.mirror === "1",
      });
    });
  };
  const examplePair = (shape, azL, azR, mirror, label) => `
    <figure class="ex-wrap">
      <div class="ex-pair">
        <div class="mr-fig"><canvas class="ex" data-shape="${shape}" data-az="${azL}" data-mirror="0"></canvas></div>
        <div class="mr-fig"><canvas class="ex" data-shape="${shape}" data-az="${azR}" data-mirror="${mirror ? 1 : 0}"></canvas></div>
      </div>
      <figcaption>${label}</figcaption>
    </figure>`;

  const countdown = (label) => ({
    type: jsPsychCallFunction,
    async: true,
    func: (done) => {
      const el = jsPsych.getDisplayElement();
      let n = 3;
      const draw = () =>
        (el.innerHTML = `<div class="center-screen"><div><p class="muted">${label}</p><div class="countdown">${n}</div></div></div>`);
      draw();
      const iv = setInterval(() => {
        n--;
        if (n === 0) {
          clearInterval(iv);
          el.innerHTML = "";
          done();
        } else draw();
      }, 800);
    },
    data: { task: "countdown" },
  });

  // ------------------------------------------------------------------ trials
  // Viewing angles are chosen when the trial starts (on_start), so the
  // visibility check only runs for figures that are actually shown.
  const mrTrial = (shape, angle, mirror, extra, feedback) => {
    return {
      type: jsPsychMentalRotation,
      shape: shape,
      mirror: mirror,
      on_start: (trial) => {
        const az = sampleAz(shape, mirror, angle);
        trial.az_left = az.left;
        trial.az_right = az.right;
        trial.data.rot_dir = az.dir;
      },
      elevation: CFG.ELEVATION,
      key_same: CFG.KEY_SAME,
      key_diff: CFG.KEY_DIFF,
      input: () => INPUT,
      fixation_duration: CFG.FIXATION_MS,
      trial_duration: CFG.TRIAL_MAX_MS,
      feedback: !!feedback,
      feedback_duration: CFG.FEEDBACK_MS,
      iti: CFG.ITI_MS,
      data: Object.assign({ angle: angle }, extra),
    };
  };

  // Main task: 8 figures x 4 angles x (same | mirror) = 64 trials, one session,
  // random order with the same figure never shown twice in a row.
  const testItems = [];
  FIG.TEST_SHAPES.forEach((shape) =>
    CFG.ANGLES.forEach((angle) => [false, true].forEach((mirror) => testItems.push({ shape, angle, mirror })))
  );
  const testTrials = R.shuffleNoRepeats(testItems, (a, b) => a.shape === b.shape)
    .slice(0, N_TEST)
    .map((t) => mrTrial(t.shape, t.angle, t.mirror, { task: "test" }));

  // Practice: 6 trials (2 practice figures, angles 0/50/100, same and mirror), with feedback.
  let practiceRuns = 0;
  const practiceItems = () =>
    R.shuffle(
      Array.from({ length: N_PRACTICE }, (_, i) => ({
        shape: FIG.PRACTICE_SHAPES[i % 2],
        angle: CFG.ANGLES[Math.floor(i / 2) % 3],
        mirror: i % 2 === 1,
      }))
    );
  const practiceLoop = {
    timeline: [
      countdown("Latihan dimulai"),
      ...practiceItems().map((t) => mrTrial(t.shape, t.angle, t.mirror, { task: "practice" }, true)),
    ],
    on_timeline_start: () => practiceRuns++,
    loop_function: (data) => {
      const correct = data.filter({ task: "practice" }).select("correct").values.filter(Boolean).length;
      return correct < CFG.PRACTICE_PASS_CORRECT && practiceRuns < 2;
    },
  };

  // ----------------------------------------------------------- intro screens
  const welcome = {
    type: jsPsychHtmlButtonResponse,
    stimulus: shell(`
      <div class="card">
        <p class="eyebrow">Eksperimen Psikologi</p>
        <h1>Tes Bentuk 3D</h1>
        <p class="muted">Anda akan melihat dua bentuk tiga dimensi. Tugas Anda: tentukan apakah keduanya <b>bentuk yang sama</b> (hanya diputar) atau <b>bentuk cerminan</b>.</p>
        <div class="facts">
          <div class="fact"><b>&plusmn;8 menit</b><span>${N_PRACTICE} soal latihan + ${N_FULL} soal utama</span></div>
          <div class="fact"><b>Anonim</b><span>tanpa nama, email, atau nomor HP</span></div>
          <div class="fact"><b>Semua perangkat</b><span>HP, tablet, laptop, atau PC</span></div>
        </div>
        <h3>Sebelum mulai</h3>
        <ul class="clean">
          <li>Cari tempat yang tenang dan matikan notifikasi.</li>
          <li>Kerjakan sampai selesai dalam satu kali duduk.</li>
          <li>Di HP, gunakan posisi tegak (portrait) atau mendatar, mana saja yang nyaman.</li>
        </ul>
      </div>`),
    choices: ["Mulai"],
    button_html: btn("primary"),
    data: { task: "welcome" },
  };

  const consent = {
    type: jsPsychHtmlButtonResponse,
    stimulus: shell(`
      <div class="card">
        <p class="eyebrow">Langkah 1</p>
        <h2>Persetujuan ikut serta</h2>
        <p>Penelitian ini dilakukan oleh <b>${CFG.RESEARCHER_NAME}</b> (${CFG.INSTITUTION}) untuk mempelajari <b>cara orang membandingkan bentuk tiga dimensi</b>.</p>
        <ul class="clean">
          <li>Anda akan mengerjakan ${N_PRACTICE} soal latihan dan ${N_FULL} soal utama, lalu menjawab beberapa pertanyaan singkat tentang diri Anda.</li>
          <li>Data bersifat <b>anonim</b> dan hanya dilaporkan secara kelompok untuk keperluan ilmiah.</li>
          <li>Partisipasi sukarela. Anda boleh berhenti kapan saja dengan menutup halaman.</li>
        </ul>
        <details><summary>Syarat peserta &amp; kontak</summary>
          <p>Berusia 18 tahun ke atas dan dapat membaca bahasa Indonesia.</p>
          <p class="small muted">Pertanyaan tentang penelitian: ${CFG.RESEARCHER_CONTACT}</p>
        </details>
        <p><b>Apakah Anda bersedia ikut serta?</b></p>
      </div>`),
    choices: ["Tidak", "Ya, saya setuju"],
    button_html: primaryLast,
    data: { task: "consent" },
    on_finish: (data) => {
      data.consent = data.response === 1;
      if (!data.consent) {
        window.removeEventListener("beforeunload", leaveGuard);
        jsPsych.abortExperiment(
          shell(`<div class="card"><h2>Terima kasih</h2><p>Anda memilih untuk tidak ikut serta. Halaman ini boleh ditutup.</p></div>`)
        );
      }
    },
  };

  const DEVICES = {
    keyboard: { ico: "⌨️", title: "Keyboard", sub: "Laptop atau PC (atau tablet dengan keyboard)" },
    touch: { ico: "📱", title: "Layar sentuh", sub: "HP atau tablet: ketuk tombol di layar" },
  };
  const deviceOrder = DETECTED === "touch" ? ["touch", "keyboard"] : ["keyboard", "touch"];
  const deviceChoice = {
    type: jsPsychHtmlButtonResponse,
    css_classes: ["device-choices"],
    stimulus: shell(`
      <div class="card">
        <p class="eyebrow">Langkah 2</p>
        <h2>Bagaimana Anda akan menjawab?</h2>
        <p class="muted">Pilih cara yang benar-benar akan Anda pakai. Di laptop, keyboard lebih cepat daripada mouse.</p>
      </div>`),
    choices: deviceOrder,
    button_html: (choice) => {
      const d = DEVICES[choice];
      return `<button class="jspsych-btn choice-card"><span class="ico" aria-hidden="true">${d.ico}</span>
        <span class="txt"><b>${d.title}${choice === DETECTED ? '<span class="badge">Disarankan</span>' : ""}</b><span>${d.sub}</span></span></button>`;
    },
    data: { task: "device" },
    on_finish: (data) => {
      INPUT = deviceOrder[data.response];
      data.input_method = INPUT;
      jsPsych.data.addProperties({ input_method: INPUT });
    },
  };

  const fullscreenOn = {
    timeline: [
      {
        type: jsPsychFullscreen,
        fullscreen_mode: true,
        message: shell(`<div class="card"><h2>Mode layar penuh</h2><p class="muted">Agar tidak terganggu, tugas berjalan dalam layar penuh. Tekan <b>Esc</b> kapan saja untuk keluar.</p></div>`),
        button_label: "Masuk layar penuh",
        data: { task: "fullscreen" },
      },
    ],
    conditional_function: () => INPUT === "keyboard" && !!document.documentElement.requestFullscreen,
  };
  const fullscreenOff = {
    timeline: [{ type: jsPsychFullscreen, fullscreen_mode: false, data: { task: "fullscreen" } }],
    conditional_function: () => !!document.fullscreenElement,
  };

  const instructions = {
    type: jsPsychInstructions,
    pages: () => [
      shell(`<div class="card">
        <p class="eyebrow">Petunjuk 1 / 2</p>
        <h2>Sama atau cerminan?</h2>
        <p>Di setiap soal ada dua bentuk yang tersusun dari kubus. Bentuk kedua (di kanan, atau di bawah pada layar HP) sudah <b>diputar</b>. Bayangkan memutarnya, lalu putuskan:</p>
        ${examplePair("P1", 25, 75, false, `<b>SAMA</b>: bentuk kedua adalah bentuk pertama yang diputar.`)}
        ${examplePair("P1", 25, 75, true, `<b>BEDA</b>: bentuk kedua adalah <i>cerminan</i> bentuk pertama. Diputar ke arah mana pun, tidak akan pernah sama.`)}
      </div>`),
      shell(`<div class="card">
        <p class="eyebrow">Petunjuk 2 / 2</p>
        <h2>Cara menjawab</h2>
        ${
          INPUT === "touch"
            ? `<p>Ketuk tombol <b>SAMA</b> atau <b>BEDA</b> di bagian bawah layar.</p>`
            : `<p>Tekan <b>${KS}</b> jika <b>SAMA</b> dan <b>${KD}</b> jika <b>BEDA</b>. Letakkan jari kiri di ${KS} dan jari kanan di ${KD}.</p>`
        }
        ${answerCaps()}
        <ul class="clean">
          <li>Jawab <b>setepat dan secepat mungkin</b>. Ketepatan lebih penting, tetapi jangan berlama-lama.</li>
          <li>Setiap soal tampil paling lama ${CFG.TRIAL_MAX_MS / 1000} detik.</li>
          <li>Pertama ada <b>${N_PRACTICE} soal latihan</b> dengan umpan balik benar/salah. Jika kurang dari ${CFG.PRACTICE_PASS_CORRECT} yang benar, latihan diulang satu kali.</li>
          <li>Setelah itu ada <b>${N_TEST} soal utama</b> (sekitar 4&ndash;5 menit) tanpa jeda.</li>
        </ul>
      </div>`),
    ],
    show_clickable_nav: true,
    button_label_previous: "Kembali",
    button_label_next: "Lanjut",
    on_load: () => drawExamples(),
    on_page_change: () => drawExamples(),
    data: { task: "instructions" },
  };

  const startTest = {
    type: jsPsychHtmlButtonResponse,
    stimulus: () => {
      const last = jsPsych.data.get().filter({ task: "practice" }).last(N_PRACTICE);
      const n = last.select("correct").values.filter(Boolean).length;
      return shell(`<div class="card">
        <p class="eyebrow">Latihan selesai · ${n} dari ${N_PRACTICE} benar</p>
        <h2>Siap untuk tugas utama?</h2>
        <ul class="clean">
          <li>Ada <b>${N_TEST} soal</b> dalam satu sesi, sekitar 4&ndash;5 menit, tanpa jeda.</li>
          <li>Tidak ada lagi umpan balik.</li>
          <li>Jawab setepat dan secepat mungkin.</li>
        </ul>
        ${answerCaps()}
      </div>`);
    },
    choices: ["Mulai"],
    button_html: btn("primary"),
    data: { task: "instructions" },
  };

  // Demographics come AFTER the task, so that being asked about gender
  // cannot prime gender stereotypes before the spatial task.
  const pill = (name, value, label, required) =>
    `<label class="opt"><input type="radio" name="${name}" value="${value}" ${required ? "required" : ""}><span>${label}</span></label>`;
  const demographics = {
    type: jsPsychSurveyHtmlForm,
    html: `
      <div class="form-wrap"><div class="card">
        <p class="eyebrow">Langkah terakhir</p>
        <h2>Tentang Anda</h2>
        <div class="field">
          <label class="lbl" for="usia">Usia <span class="hint">dalam tahun (minimal 18)</span></label>
          <input id="usia" type="number" name="usia" inputmode="numeric" min="18" max="99" required>
        </div>
        <fieldset class="field"><legend>Jenis kelamin</legend>
          <div class="opts">${pill("jenis_kelamin", "laki-laki", "Laki-laki", true)}${pill("jenis_kelamin", "perempuan", "Perempuan")}</div>
        </fieldset>
        <fieldset class="field"><legend>Seberapa sering Anda bermain video game? <span class="hint">rata-rata per minggu</span></legend>
          <div class="opts">${pill("video_game", "tidak pernah", "Tidak pernah", true)}${pill("video_game", "<1 jam", "Kurang dari 1 jam")}${pill("video_game", "1-5 jam", "1–5 jam")}${pill("video_game", ">5 jam", "Lebih dari 5 jam")}</div>
        </fieldset>
        <fieldset class="field"><legend>Apakah Anda terganggu selama mengerjakan tugas tadi? <span class="hint">misalnya notifikasi, diajak bicara, atau berpindah aplikasi. Jawab jujur, tidak memengaruhi apa pun.</span></legend>
          <div class="opts">${pill("gangguan", "tidak", "Tidak", true)}${pill("gangguan", "sedikit", "Sedikit")}${pill("gangguan", "banyak", "Ya, cukup banyak")}</div>
        </fieldset>
      </div></div>`,
    button_label: "Kirim",
    data: { task: "demographics" },
    on_load: () => {
      const b = document.querySelector("#jspsych-survey-html-form-next");
      document.querySelector(".form-wrap .card").appendChild(b);
      window.scrollTo(0, 0);
    },
    on_finish: (data) => {
      const r = data.response;
      jsPsych.data.addProperties({
        age: Number(r.usia),
        gender: r.jenis_kelamin,
        video_game: r.video_game,
        distracted: r.gangguan,
      });
    },
  };

  const addEnd = {
    type: jsPsychCallFunction,
    func: () => jsPsych.data.addProperties({ end_time: new Date().toISOString(), completed: true }),
    data: { task: "end" },
  };

  // Save: DataPipe with retries; local CSV download in test mode or as a backup.
  const saving = {
    type: jsPsychCallFunction,
    async: true,
    data: { task: "save" },
    func: (done) => {
      const el = jsPsych.getDisplayElement();
      const csv = () => jsPsych.data.get().csv();
      const finish = (how) => {
        window.removeEventListener("beforeunload", leaveGuard);
        done(how);
      };
      const showSaving = (msg) =>
        (el.innerHTML = `<div class="center-screen"><div><div class="spinner" role="status" aria-label="Menyimpan"></div><p>${msg}</p></div></div>`);

      if (!USE_PIPE) {
        showSaving("Menyiapkan data&hellip;");
        jsPsych.data.get().localSave("csv", filename);
        setTimeout(() => finish("local"), 600);
        return;
      }
      const attempt = async (tries) => {
        for (let i = 1; i <= tries; i++) {
          showSaving(i === 1 ? "Menyimpan jawaban Anda&hellip;" : `Mencoba lagi (${i}/${tries})&hellip;`);
          try {
            const res = await jsPsychPipe.saveData(CFG.DATAPIPE_EXPERIMENT_ID, filename, csv());
            if (res && !(res instanceof Error) && !res.error) return true;
            console.warn("DataPipe:", res);
          } catch (err) {
            console.warn("DataPipe:", err);
          }
          await new Promise((r) => setTimeout(r, 1500 * i));
        }
        return false;
      };
      const run = async () => {
        if (await attempt(3)) return finish("pipe");
        el.innerHTML = shell(`<div class="card">
          <h2>Data belum terkirim</h2>
          <p>Koneksi internet sepertinya terputus. Periksa koneksi Anda lalu tekan <b>Coba lagi</b>. Jangan tutup halaman ini.</p>
          <p class="muted small">Jika tetap gagal, unduh salinan data dan kirimkan ke peneliti: ${CFG.RESEARCHER_CONTACT}</p>
          <div class="actions">
            <button class="jspsych-btn" id="dl">Unduh salinan data</button>
            <button class="jspsych-btn primary" id="retry">Coba lagi</button>
          </div></div>`);
        el.querySelector("#dl").onclick = () => {
          jsPsych.data.get().localSave("csv", filename);
          finish("download");
        };
        el.querySelector("#retry").onclick = run;
      };
      run();
    },
  };

  const debrief = {
    type: jsPsychHtmlButtonResponse,
    stimulus: () => {
      const t = jsPsych.data.get().filter({ task: "test" });
      const acc = Math.round(t.select("correct").mean() * 100);
      return shell(`<div class="card">
        <p class="eyebrow">${USE_PIPE ? "Data tersimpan ✓" : "Mode uji: data diunduh ke perangkat ini"}</p>
        <h1>Terima kasih!</h1>
        <p>Ketepatan Anda: <b>${isNaN(acc) ? "-" : acc + "%"}</b> dari ${t.count()} soal.</p>
        <p>Tugas tadi disebut <i>mental rotation task</i> (Shepard &amp; Metzler, 1971). Makin besar sudut putaran antara dua bentuk, biasanya makin lama orang menjawab, karena kita &ldquo;memutar&rdquo; bentuk itu di dalam pikiran. Penelitian ini ingin melihat apakah kecepatan dan ketepatan rotasi mental berbeda antara laki-laki dan perempuan serta antarkelompok usia, dan apakah pengalaman bermain video game ikut berperan.</p>
        <p class="muted small">Hasil satu orang tidak mengukur kecerdasan dan bisa berubah dengan latihan. Perbedaan antarkelompok, jika ada, hanya terlihat pada rata-rata dan tidak berlaku untuk setiap individu.</p>
        <p class="muted small">Mohon tidak menceritakan tujuan penelitian ini kepada calon peserta lain. Pertanyaan: ${CFG.RESEARCHER_CONTACT}</p>
        <div class="actions"><button class="jspsych-btn" id="share">Bagikan ke teman</button></div>
        <p class="small muted" id="share-msg" aria-live="polite"></p>
      </div>`);
    },
    choices: ["Selesai"],
    button_html: btn("primary"),
    data: { task: "debrief" },
    on_load: () => {
      const msg = document.getElementById("share-msg");
      document.getElementById("share").onclick = async () => {
        const text = "Ikut eksperimen psikologi singkat (±8 menit): dua bentuk 3D ini sama atau cerminan?";
        try {
          if (navigator.share) {
            await navigator.share({ title: "Tes Bentuk 3D", text: text, url: studyUrl });
          } else {
            await navigator.clipboard.writeText(`${text} ${studyUrl}`);
            msg.textContent = "Tautan disalin. Tempel di WhatsApp atau media sosial Anda.";
          }
        } catch (e) {
          /* share sheet dismissed */
        }
      };
    },
    on_finish: () => {
      document.getElementById("jspsych-target").innerHTML = shell(
        `<div class="card"><h2>Selesai</h2><p class="muted">Halaman ini boleh ditutup.</p></div>`
      );
    },
  };

  // ---------------------------------------------------------------- timeline
  jsPsych.run([
    welcome,
    consent,
    deviceChoice,
    fullscreenOn,
    instructions,
    practiceLoop,
    startTest,
    countdown("Tugas utama dimulai"),
    { timeline: testTrials },
    fullscreenOff,
    demographics,
    addEnd,
    saving,
    debrief,
  ]);
})();
