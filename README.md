# Mental Rotation Task (Bahasa Indonesia), online

A free online version of the classic Shepard & Metzler (1971) mental rotation task, built with **jsPsych 8**. It is hosted on **GitHub Pages**, and **DataPipe** saves each participant's data to your **Google Drive**. It works on phones, tablets, laptops and PCs.

On each trial the participant sees two 3D cube figures. The second figure is either the **same** figure rotated in depth, or its **mirror image** rotated in depth. The participant answers **SAMA** (same) or **BEDA** (different) as quickly and accurately as possible.

Response options:
- **Keyboard:** **A** = SAMA, **L** = BEDA.
- **Touch:** two on-screen buttons.

Keyboard keys are always accepted. Each trial records which input was actually used (`response_source`).

## Design

| | |
|---|---|
| Figures | 8 test figures + 2 practice figures, each made of 10 cubes in 4 arms. All figures are chiral (a mirror image can never be rotated into the original) and all are different from each other. `node tools/check_shapes.js` checks this. |
| Rotation | Right/second figure rotated about the vertical axis by **0°, 50°, 100° or 150°**, clockwise or counter-clockwise at random. The view is from 30° above. |
| Views | Views are picked at random per trial, but only views where every cube is visible. Views where an arm points almost straight at the viewer, or where a cube is hidden behind another arm, are rejected. |
| Trials | **6 practice** trials with feedback, repeated once if fewer than 4 are correct. Then **64 test** trials in one session with no break: 8 figures × 4 angles × same/mirror. The order is random, and the same figure never appears twice in a row. |
| Timing | Fixation 500 ms. Figures stay until the participant answers, up to 8 s. Inter-trial interval 500 ms. |
| Demographics | Asked **after** the task (age, gender, video game hours, distraction), so that being asked about gender cannot prime stereotypes before a spatial task. |
| Session | About 8 minutes in total. |

Session flow: welcome → consent → device choice → instructions (with example pairs) → 3-2-1 → practice → 64 test trials → demographics → data saved (retries automatically, offers a backup download if the connection fails) → debrief.

```
mental-rotation/
├── index.html                    page + social-media preview tags
├── js/config.js                  ← settings: DataPipe ID, contact, angles, keys, timing
├── js/figures.js                 cube figures + 3D renderer (canvas)
├── js/plugin-mental-rotation.js  custom jsPsych trial (keyboard + touch)
├── js/experiment.js              full session timeline
├── css/style.css
├── assets/share.png              link preview image (made by tools/make_share.py)
└── tools/
    ├── check_shapes.js           node tools/check_shapes.js → checks the figures
    ├── gallery.html              open /tools/gallery.html to see sample trials of every condition
    └── make_share.py             rebuilds assets/share.png
```

## 1. Try it locally

From the `UTS` folder:

```bash
python -m http.server 8766 --directory mental-rotation
```

- `http://localhost:8766/?test=1` is a short version (6 practice, 8 test trials). The CSV is **downloaded** to your computer instead of sent to DataPipe.
- `http://localhost:8766/?test=1&input=touch` forces the phone layout.
- `http://localhost:8766/tools/gallery.html` shows one sample pair for every figure × angle × same/mirror.

## 2. Connect DataPipe → Google Drive

The site is already published on GitHub Pages. To start saving data (steps as in the emotional Stroop README):

1. **Sign-in:** if you sign in to DataPipe with OSF, add another sign-in method (Google, GitHub, ORCID or email) under *Account settings*. OSF sign-in is being retired, and without another method you can lose access to your experiments.
2. **Connect storage:** in DataPipe's *Account settings*, connect **Google Drive**. This is the quickest option, and the data stays private in your own Drive. Dataverse (institutional) and Zenodo (public, with a DOI) are the other options.
3. Click **Create new experiment**, give it a title, and choose Google Drive. DataPipe creates a folder for it in your Drive. Leave **Psych-DS metadata** off unless you need it: the setting locks after the first submission.
4. On the experiment's page, switch **Enable data collection** ON, and copy the **Experiment ID**.
5. Paste the ID into `js/config.js` (`DATAPIPE_EXPERIMENT_ID: "…"`), then commit and push. While the ID is empty, the live site shows a "data collection paused" notice instead of the task.
6. **Pilot:** run the live link once yourself without `?test=1`. A file `<random-id>.csv` should appear in the Drive folder within a few seconds. Delete it afterwards.

Live link: **`https://irfankur.github.io/mental-rotation/`**

## 3. Share on social media

Caption template (Bahasa Indonesia):

> 🧊 **Bantu penelitian psikologi, cuma ±8 menit!**
> Kamu akan melihat dua bentuk 3D. Sama atau cerminan? Putar bentuknya di kepalamu dan jawab secepat mungkin. 🧠
> ✅ Anonim, tanpa nama/nomor HP
> ✅ Bisa di HP atau laptop
> ✅ Usia 18+, **semua usia dan jenis kelamin** sangat dibutuhkan
> 👉 [link]
> Terima kasih banyak & boleh bantu share ya 🙏

Don't mention gender or sex differences in the caption. Telling people that one gender "should" do better can change how they perform (stereotype threat).

For an age comparison, deliberately recruit older adults too (e.g. 40+): parents, relatives, lecturers. A social-media link alone mostly reaches 18–25-year-olds.

## 4. Data

There is one CSV per participant in the experiment's Google Drive folder. Each row is one jsPsych trial. For the analysis, filter on `task == "test"`.

| Column | Meaning |
|---|---|
| `subject_id` | random participant code |
| `task` | `consent`, `practice`, `test`, `demographics`, … |
| `shape` | figure A–H (practice: P1, P2) |
| `angle` | rotation between the two figures: 0, 50, 100, 150 |
| `pair` | `sama` (rotated copy) or `cermin` (mirror image) |
| `response`, `correct` | `sama` / `beda`; true/false |
| `rt` | reaction time in ms (on `test` rows; on other rows it is the time spent on that page) |
| `timeout` | true if no answer within 8 s |
| `az_left`, `az_right`, `rot_dir` | viewing angles of the two figures and rotation direction (+1/−1) |
| `input_method`, `response_source` | layout chosen (keyboard/touch) and what was actually pressed |
| `onset_source`, `page_hidden` | timing checks: drop trials where `page_hidden` is true |
| `age`, `gender`, `video_game`, `distracted` | demographics (repeated on every row) |
| `completed` | true when the participant reached the end |

**Suggested analysis**
- **Accuracy:** proportion correct on all test trials, per participant.
- **RT:** mean RT of **correct `sama` trials** per angle. Mirror trials are usually excluded from the RT analysis, because "different" has no defined rotation angle.
- **Rotation slope:** regress RT on angle per participant. The slope (ms per degree) is the mental rotation speed; the intercept is the base speed.
- **Group comparisons:**
  - Gender: t-test or ANOVA, or a mixed ANOVA *gender × angle* on RT and accuracy.
  - Age: age groups, or age as a continuous predictor.
  - Add `video_game` as a covariate, and `input_method` (keyboard vs. touch) as a covariate, because touch RTs are slower.
- **Exclusions (suggested):**
  - Participants with accuracy ≤ 60% (chance is 50%).
  - Participants with `distracted == "banyak"`.
  - Trials with RT < 300 ms, timeouts, or `page_hidden`.

## 5. Before you launch: checklist

- [ ] Run `node tools/check_shapes.js` (should say OK) and look at `tools/gallery.html`
- [ ] Pilot on a phone and a laptop
- [x] DataPipe experiment on Google Drive, ID in `js/config.js`, collection switched **ON**
- [ ] Pilot run: a test file arrives in the Drive folder
- [ ] Lecturer / ethics approval, if your course requires it
- [ ] Switch DataPipe OFF when you finish
