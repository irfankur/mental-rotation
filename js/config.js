// =====================================================================
//  CONFIGURATION: the only file you need to edit before sharing.
// =====================================================================
window.STUDY_CONFIG = {
  // Experiment ID from https://pipe.jspsych.org (an experiment saving to Google Drive,
  // Dataverse or Zenodo; DataPipe stopped writing to OSF on 16 Nov 2026).
  // Empty ("") = the live site shows a "data collection paused" notice instead of the task.
  // With ?test=1 the data is always downloaded as a CSV on the device instead.
  // Previous experiment on OSF (closed 16 Nov 2026; its data stays in OSF): UhaVEm8FocQQ
  DATAPIPE_EXPERIMENT_ID: "",

  // Shown on the consent and debrief pages.
  RESEARCHER_NAME: "Irfan Kurniawan",
  RESEARCHER_CONTACT: "ipanikur66@gmail.com / 081298515327",
  INSTITUTION: "Fakultas Psikologi, Universitas Indonesia Maju",

  // Design: every test figure appears once per angle x pair type
  // (8 figures x 4 angles x 2 = 64 trials).
  ANGLES: [0, 50, 100, 150], // rotation of the right figure, in degrees
  ELEVATION: 30, // viewing angle from above, in degrees
  AXIS_MARGIN: 15, // avoid views where an arm points straight at the viewer (deg from 0/90/180/270)
  MIN_VISIBILITY: 0.3, // reject views where a cube is hidden (least-visible cube < 30% of the median cube)

  // Response keys (keyboard). Touch screens get two on-screen buttons.
  KEY_SAME: "a",
  KEY_DIFF: "l",

  // Timing (ms)
  FIXATION_MS: 500,
  TRIAL_MAX_MS: 8000,
  ITI_MS: 500,
  FEEDBACK_MS: 800,

  // Practice: 6 trials with feedback, repeated once if fewer than 4 correct.
  PRACTICE_TRIALS: 6,
  PRACTICE_PASS_CORRECT: 4,
};
