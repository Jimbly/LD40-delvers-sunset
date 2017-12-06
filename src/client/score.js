/*jshint browser:true, noempty:false*/
/*global $: false */

const PLAYER_NAME_KEY = 'ld.player_name';
const SCORE_KEY = 'LD40';
const LS_KEY = SCORE_KEY.toLowerCase();

export let need_update = false;

export let player_name;
if (localStorage[PLAYER_NAME_KEY]) {
  player_name = localStorage[PLAYER_NAME_KEY];
} else {
  localStorage[PLAYER_NAME_KEY] = player_name = 'Anonymous ' + Math.random().toString().slice(2, 8);
}

let score_host = 'http://scores.dashingstrike.com';
if (window.location.host.indexOf('localhost') !== -1 ||
  window.location.host.indexOf('staging') !== -1) {
  score_host = 'http://scores.staging.dashingstrike.com';
}
// higher score is "better"
const score_mod1 = 10000;
const score_mod2 = 100;
const deaths_inv = 9999;
function parseHighScore(score) {
  let value = score;
  let deaths = deaths_inv - score % score_mod1;
  score = Math.floor(score / score_mod1);
  let level_index = score % score_mod2;
  score = Math.floor(score / score_mod2);
  let disabil_index = score;
  return { disabil_index, level_index, deaths, value };
}
export function encodeScore(score) {
  return score.disabil_index * score_mod1 * score_mod2 + score.level_index * score_mod1 + (deaths_inv - score.deaths);
}
export function formatScore(score) {
  return `Sequence ${score.disabil_index}, Level ${score.level_index}, ${score.deaths} Deaths`;
}
export function formatName(score) {
  if (score.name.indexOf('Anonymous') === 0) {
    return score.name.slice(0, 'Anonymous'.length);
  }
  return score.name;
}

let num_highscores = 20;
let score_update_time = 0;
export let high_scores = {};
const level = 'all';
function refreshScores(/*level, */changed_cb) {
  $.ajax({ url: `${score_host}/api/scoreget?key=${SCORE_KEY}.${level}&limit=${num_highscores}`, success: function (scores) {
    let list = [];
    scores.forEach(function (score) {
      score.score = parseHighScore(score.score);
      list.push(score);
    });
    high_scores[level] = list;
    if (changed_cb) {
      changed_cb();
    }
  }});
}


function clearScore(level, old_player_name, cb) {
  if (!old_player_name) {
    return;
  }
  $.ajax({ url: `${score_host}/api/scoreclear?key=${SCORE_KEY}.${level}&name=${old_player_name}`, success: cb});
}

function submitScore(level, score, cb) {
  if (!score || typeof score.level_index !== 'number' || typeof score.disabil_index !== 'number' || typeof score.deaths !== 'number') {
    return;
  }
  let high_score = encodeScore(score);
  if (!player_name) {
    return;
  }
  $.ajax({ url: `${score_host}/api/scoreset?key=${SCORE_KEY}.${level}&name=${player_name}&score=${high_score}`, success: function (scores) {
    let list = [];
    scores.forEach(function (score) {
      score.score = parseHighScore(score.score);
      list.push(score);
    });
    high_scores[level] = list;
    if (cb) {
      cb();
    }
  }});
}
const level_defs = [{ name: level }];
export function updateHighScores(/*level_defs, */changed_cb) {
  let now = Date.now();
  if (now - score_update_time > 5*60*1000 || need_update) {
    need_update = false;
    score_update_time = now;
    for (let ii = 0; ii < level_defs.length; ++ii) {
      refreshScores(/*level_defs[ii].name, */changed_cb);
    }
  } else {
    if (changed_cb) {
      changed_cb();
    }
  }
}


function saveScore(ld, obj, cb) {
  ld.local_score = obj;
  let key = `${LS_KEY}.score_${ld.name}`;
  localStorage[key] = JSON.stringify(obj);
  submitScore(ld.name, obj, function () {
    obj.submitted = true;
    if (obj === ld.local_score) {
      localStorage[key] = JSON.stringify(obj);
    }
    if (cb) {
      cb();
    }
  });
}

const ld = level_defs[0];
export function getScore(/*ld*/) {
  let key = `${LS_KEY}.score_${ld.name}`;
  if (localStorage && localStorage[key]) {
    let ret = JSON.parse(localStorage[key]);
    if (!ret) {
      return;
    }
    ld.local_score = ret;
    if (!ret.submitted) {
      saveScore(ld, ret);
    }
    return ret;
  }
  return null;
}

export function setScore(/*ld, */disabil_index, level_index, deaths, cb) {
  if (!ld.local_score || disabil_index > ld.local_score.disabil_index || disabil_index === ld.local_score.disabil_index && level_index > ld.local_score.level_index ||
    disabil_index === ld.local_score.disabil_index && level_index === ld.local_score.level_index && deaths < ld.local_score.deaths
  ) {
    // better
    let obj = { disabil_index, level_index, deaths };
    saveScore(ld, obj, cb);
  }
}

export function updatePlayerName(/*level_defs, */new_player_name) {
  if (new_player_name === player_name) {
    return;
  }
  let old_name = player_name;
  localStorage[PLAYER_NAME_KEY] = player_name = new_player_name;
  level_defs.forEach(function (ld) {
    if (ld.local_score) {
      if (old_name.indexOf('Anonymous') === 0) {
        // Only wiping old scores if anonymous, so we can't delete other people's scores!
        clearScore(ld.name, old_name, function () {
          saveScore(ld, ld.local_score, function () {
            need_update = true;
          });
        });
      }
    }
  });
}
