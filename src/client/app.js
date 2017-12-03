/*jshint noempty:false, bitwise:false*/

/*global $: false */
/*global math_device: false */
/*global assert: false */
/*global Z: false */

window.Z = window.Z || {};
Z.BACKGROUND = 0;
Z.SPRITES = 10;
Z.BEAMS = 15;
Z.CHARACTER = 20;
Z.LASERS = 25;
Z.UI = 100;
Z.FADE = 110;
Z.UI2 = 120;
Z.LETTERBOX = 200;

// Virtual viewport for our game logic
const game_width = 1280;
const game_height = 960;

export function main(canvas)
{
  const glov_engine = require('./glov/engine.js');
  const glov_font = require('./glov/font.js');
  const util = require('./glov/util.js');

  glov_engine.startup({
    canvas,
    game_width,
    game_height,
    pixely: true,
  });

  const sound_manager = glov_engine.sound_manager;
  const glov_camera = glov_engine.glov_camera;
  const glov_input = glov_engine.glov_input;
  const glov_sprite = glov_engine.glov_sprite;
  const glov_ui = glov_engine.glov_ui;
  const draw_list = glov_engine.draw_list;
  const font = glov_engine.font;

  glov_ui.button_width *= 2;
  glov_ui.button_height *= 2;
  glov_ui.font_height *= 2;

  const loadTexture = glov_sprite.loadTexture.bind(glov_sprite);
  const createSprite = glov_sprite.createSprite.bind(glov_sprite);

  glov_ui.bindSounds(sound_manager, {
    button_click: 'button_click',
    rollover: 'rollover',
  });

  const color_white = math_device.v4Build(1, 1, 1, 1);
  const color_red = math_device.v4Build(1, 0, 0, 1);
  const color_green = math_device.v4Build(0, 1, 0, 1);
  const color_black = math_device.v4Build(0, 0, 0, 1);
  const color_beam_green_warmup = math_device.v4Build(0, 1, 0, 0.19);
  const color_beam_green_fire = math_device.v4Build(0, 1, 0, 1);
  const color_beam_red_warmup = math_device.v4Build(1, 0, 0, 0.19);
  const color_beam_red_fire = math_device.v4Build(1, 0, 0, 1);
  const color_bricks = math_device.v4Build(0.8, 0.5, 0.5, 1);
  // Cache key_codes
  const key_codes = glov_input.key_codes;
  const pad_codes = glov_input.pad_codes;

  let game_state;

  let sprites = {};

  const TILESIZE = 64;
  const CHAR_W = 0.5 * 1.5;
  const CHAR_H = 1 * 1.5;
  const LEVEL_W = 18;
  const LEVEL_H = 14;
  const COUNTDOWN_SUCCESS = 1500;
  let COUNTDOWN_FAIL;


  function initGraphics() {
    if (sprites.white) {
      return;
    }

    // sound_manager.loadSound('pegstep1');
    // sound_manager.loadSound('pegstep2');
    // sound_manager.loadSound('pegstep3');
    // sound_manager.loadSound('pegstep4');
    sound_manager.loadSound('pegstep5');
    // sound_manager.loadSound('footstep1');
    // sound_manager.loadSound('footstep2');
    // sound_manager.loadSound('footstep3');
    sound_manager.loadSound('footstep4');
    // sound_manager.loadSound('footstep5');
    sound_manager.loadSound('jump');
    sound_manager.loadSound('jump_land');
    sound_manager.loadSound('death_spike');
    sound_manager.loadSound('death_laser');
    sound_manager.loadSound('death_beam');
    sound_manager.loadSound('beam_fire');
    sound_manager.loadSound('beam_charge');
    sound_manager.loadSound('laser');
    sound_manager.loadSound('respawn');
    sound_manager.loadSound('victory');

    sprites.white = createSprite('white', {
      width : 1,
      height : 1,
      x : 0,
      y : 0,
      rotation : 0,
      color : [1,1,1, 1],
      origin: [0, 0],
      textureRectangle : math_device.v4Build(0, 0, 1, 1)
    });

    // sprites.avatar = createSprite('avatar.png', {
    //   width : CHAR_W * TILESIZE,
    //   height : CHAR_H * TILESIZE,
    //   rotation : 0,
    //   color : [1,1,1,1],
    //   origin: [0, CHAR_H * TILESIZE],
    //   textureRectangle : math_device.v4Build(0, 0, 16, 32)
    // });
    sprites.avatar = glov_ui.loadSpriteRect('avatar.png', [16, 16], [32]);
    sprites.avatar2 = glov_ui.loadSpriteRect('avatar2.png', [13, 13, 13, 13], [26, 26, 26]);
    sprites.lasers = glov_ui.loadSpriteRect('lasers.png', [16, 16, 16, 16], [32]);

    sprites.solid = glov_ui.loadSpriteRect('bricks2.png', [64], [16, 16, 16, 16]);

    sprites.bricks = createSprite('bricks.png', {
      width : TILESIZE,
      height : TILESIZE,
      rotation : 0,
      color : color_white,
      origin: [0, 0],
      textureRectangle : math_device.v4Build(0, 0, 16, 16)
    });

    sprites.exit = createSprite('exit.png', {
      width : TILESIZE,
      height : TILESIZE,
      rotation : 0,
      color : color_white,
      origin: [0, 0],
      textureRectangle : math_device.v4Build(0, 0, 16, 32)
    });
    sprites.exit_desat = createSprite('exit_desat.png', {
      width : TILESIZE,
      height : TILESIZE,
      rotation : 0,
      color : color_white,
      origin: [0, 0],
      textureRectangle : math_device.v4Build(0, 0, 16, 32)
    });

    sprites.spikes = createSprite('spikes.png', {
      width : TILESIZE,
      height : TILESIZE,
      rotation : 0,
      color : color_white,
      origin: [0, 0],
      textureRectangle : math_device.v4Build(0, 0, 16, 16)
    });

    // sprites.game_bg = createSprite('white', {
    //   width : LEVEL_W * TILESIZE,
    //   height : LEVEL_H * TILESIZE,
    //   x : 0,
    //   y : 0,
    //   rotation : 0,
    //   color : [0, 0.72, 1, 1],
    //   origin: [0, 0],
    //   textureRectangle : math_device.v4Build(0, 0, spriteSize, spriteSize)
    // });
    sprites.game_bg = createSprite('bg2.png', {
      width : TILESIZE,
      height : TILESIZE,
      x : 0,
      y : 0,
      rotation : 0,
      color : color_white,
      origin: [0, 0],
      textureRectangle : math_device.v4Build(0, 0, 16, 16)
    });
  }

  let character;
  let level;
  let disabil_index = 0;
  let disabil = {
    limp: false,
    color_blindness: false,
    vertigo: false,
    deaf: true,
    amnesia: false,
    blindness: false,
    paranoia: false,
    nearsighted: false,
  };
  let disabil_flow = [
    {},
    { add: ['limp'], remove: [] },
    { add: ['vertigo'], remove: [] },
    { add: ['paranoia'], remove: ['vertigo'] },
    { add: ['color_blindness'], remove: [] },
    { add: ['nearsighted'], remove: [] },
    { add: ['deaf', 'amnesia'], remove: [] },
    { add: ['blindness'], remove: ['deaf', 'nearsighted', 'color_blindness', 'paranoia'] },
    { add: ['deaf'], remove: [] },
  ];
  const disabil_list = [
    { key : 'limp', name: 'Limp' },
    { key : 'color_blindness', name: 'Deuteranopia' },
    { key : 'vertigo', name: 'Vertigo' },
    { key : 'deaf', name: 'Deaf' },
    { key : 'amnesia', name: 'Amnesia' },
    { key : 'paranoia', name: 'Paranoia' },
    { key : 'nearsighted', name: 'Myopia' },
    { key : 'blindness', name: 'Blindness' },
  ];

  function curedName(key) {
    if (key === 'color_blindness' || key === 'paranoia' || key === 'nearsighted') {
      return 'Irrelevant';
    }
    return 'CURED!';
  }

  let level_index = 2;
  let level_countdown = 0;
  let vertigo_counter = 0;

  function playSound(sound) {
    if (!disabil.deaf) {
      return sound_manager.play(sound);
    }
  }


  function filterColor(color) {
    if (!disabil.color_blindness) {
      return color;
    }
    let b = Math.min((color[0] + color[1] + color[2]) * 0.5, 1);
    return [b, b, b, color[3]];
  }

  const beyond_zebra = ['yuzz', 'wum', 'humpf', 'glikk', 'snee', 'quan', 'thnad',
    'spazz', 'floob', 'zatz', 'jogg', 'flunn', 'yekk', 'vroo'];
  const titles = [
    'Introduction',
    'Spikes',
    'Moving Danger',
    'Lasers',
    // amnesia titles:
    'The one with the spikes?',
    'Dangerous',
    'Look out!',
    'Tuesday',
    'Jumpy',
    'Gimme meds!',
    'Flursday',
  ];
  function randWord(words) {
    let idx = Math.floor(Math.random() * words.length);
    return words[idx];
  }

  let index_map = [0,1,2,3];
  let did_remap = false;
  let laser_sound;
  let last_index_label, level_index_label, level_title;
  function levelInit() {
    if (laser_sound) {
      laser_sound.stop();
      laser_sound = null;
    }
    if (level_index === 0 && !did_remap) {
      index_map = [0,1,2,3];
      did_remap = true;
      if (disabil.amnesia) {
        for (let ii = 0; ii < index_map.length - 1; ++ii) {
          let idx = ii + Math.floor(Math.random() * (index_map.length - ii));
          let t = index_map[ii];
          index_map[ii] = index_map[idx];
          index_map[idx] = t;
        }
      }
    } else if (level_index > 0) {
      did_remap = false;
    }

    let eff_level_index = index_map[level_index];

    vertigo_counter = 0;
    level_countdown = 0;
    character = {
      pos: [2.25, 4.5],
      v: [0,0],
      on_ground: false,
      jumping: 0,
      jumping_released: true,
      runloop: 0.5,
      facing: 1,
    };
    level = {};
    level.timestamp_base = glov_engine.getFrameTimestamp();
    level.laser_dir = 0;
    level.solids = [
      [0,2, 4,3],
      [6,6, 10,7],
      [14,9, 18,10],
      [-1,-1, 0, LEVEL_H + 1], // left
      [LEVEL_W,-1, LEVEL_W + 1, LEVEL_H + 1], // right
      [0,LEVEL_H, LEVEL_W, LEVEL_H + 1], // top
      [5,LEVEL_H - 1, 13, LEVEL_H], // title area on top
      [0,-1, LEVEL_W, 0], // bottom
    ];
    level.dangers = [
      [0,0, 18,1],
    ];
    if ((eff_level_index === 0 || eff_level_index === 1) && disabil.paranoia) {
      level.dangers.push([6,7, 10, 8, 0, 1]);
      level.dangers.push([0,13, 5, 14, -1, 1]);
      level.dangers.push([5,12, 13, 13, -1, 1]);
      level.dangers.push([13,13, 18, 14, -1, 1]);
    }
    if (eff_level_index === 1) {
      level.solids.push([1,7, 3, 8]);
      level.dangers.push([1,6, 3,7, -1], [7.5,7, 8.5,8]);
    }
    level.lasers = [];
    if (eff_level_index === 2) {
      // x, ymid, h, magnitude, bad, yoffs, paranoid
      level.lasers.push([0.5, 6, 2, 2, 1, 0]);
      level.lasers.push([0.5, 3, 2, 2, 0, 0]);

      level.lasers.push([5,   8, 2, 2, 0, 0]);
      level.lasers.push([5,   5, 2, 2, 1, 0]);

      level.lasers.push([12, 10, 2, 2, 1, 0]);
      level.lasers.push([12,  7,  2, 2, 0, 0]);

      if (disabil.paranoia) {
        level.lasers.push([2.75, 7, 2, 2, 1, 0, 1]);
        level.lasers.push([2.75, 4, 2, 2, 0, 0, 1]);

        level.lasers.push([7.33, 8.67, 2, 2, 1, 0, 1]);
        level.lasers.push([7.33, 5.67, 2, 2, 0, 0, 1]);

        level.lasers.push([9.67, 9.33, 2, 2, 0, 0, 1]);
        level.lasers.push([9.67, 6.33, 2, 2, 1, 0, 1]);

        level.lasers.push([15, 11, 2, 2, 0, 0, 1]);
        level.lasers.push([15,  8, 2, 2, 1, 0, 1]);
      }
    }
    level.beams = [];
    if (eff_level_index === 3) {
      // x, y, slope
      level.beams.push([0,6, -1, 0]);
      level.beams.push([0,10, -1, 0.5]);
      level.beams.push([0,14, -1, 0]);
      level.beams.push([4,14, -1, 0.5]);
      level.beams.push([9,13, -1, 0]);
      level.beams.push([13,13, -1, 0.5]);

      if (disabil.paranoia) {
        level.beams.push([8,0, 1, 0, 1]);
        level.beams.push([4,0, 1, 0.5, 1]);
        level.beams.push([0,0, 1, 0, 1]);
        level.beams.push([0,4, 1, 0.5, 1]);
        level.beams.push([0,8, 1, 0, 1]);
        level.beams.push([0,12, 1, 0.5, 1]);
      }
    }

    level.exit = [16,10, 17, 12];

    if (last_index_label !== level_index) {
      if (disabil.amnesia) {
        level_index_label = `Level ${randWord(beyond_zebra)} of ${randWord(beyond_zebra)}`;
        level_title = randWord(titles);
      } else {
        level_index_label = `Level ${level_index + 1} of 4`;
        level_title = titles[level_index];
      }
      last_index_label = level_index;
    }

    playSound('respawn');
  }

  const JUMP_TIME = 0.25;
  const RUN_SPEED = 4.5;
  const JUMP_SPEED = 10;
  const GRAVITY = -9.8*2.5;
  const HORIZ_ACCEL = 60;
  const HORIZ_DECEL = 30;
  const DEAD_ACCEL = 2;
  const BOTTOM = 1;
  const TOP = 2;
  const LEFT = 4;
  const RIGHT = 8;
  const ON_GROUND = 16;
  const BEAM_FIRE = 0.4;
  const BEAM_CHARGE_SPEED = 0.0002;
  const RUN_LOOP_SCALE = 0.35;
  const RUN_LOOP_REST_SPEED = 1;
  function collide(rect) {
    let ret = 0;
    if (character.pos[0] + CHAR_W > rect[0] && character.pos[0] < rect[2]) {
      if (character.pos[1] > rect[1] && character.pos[1] < rect[3]) {
        ret |= BOTTOM; // of character
        if (character.pos[0] > rect[0] && character.pos[0] + CHAR_W < rect[2]) {
          ret |= ON_GROUND;
        }
      }
    }
    if (character.pos[0] + CHAR_W > rect[0] && character.pos[0] < rect[2]) {
      if (character.pos[1] + CHAR_H > rect[1] && character.pos[1] + CHAR_H < rect[3]) {
        ret |= TOP;
      }
    }
    if (character.pos[1] + CHAR_H > rect[1] && character.pos[1] < rect[3]) {
      if (character.pos[0] > rect[0] && character.pos[0] < rect[2]) {
        ret |= LEFT;
      }
      if (character.pos[0] + CHAR_W > rect[0] && character.pos[0] + CHAR_W < rect[2]) {
        ret |= RIGHT;
      }
    }
    return ret;
  }

  function updateDangers(dt) {
    for (let ii = 0; ii < level.lasers.length; ++ii) {
      let old_value = level.lasers[ii][5];
      let new_value = level.lasers[ii][5] = Math.sin((glov_engine.getFrameTimestamp() - level.timestamp_base) * 0.002 - Math.PI/2) * level.lasers[ii][3];
      if (ii === 0) {
        if (level.laser_dir === 0 && old_value < new_value) {
          level.laser_dir = 1;
          if (!character.exited && !character.dead) {
            laser_sound = playSound('laser');
          }
        } else if (level.laser_dir === 1 && old_value > new_value) {
          level.laser_dir = 0;
          if (!character.exited && !character.dead) {
            laser_sound = playSound('laser');
          }
        }
      }
    }
    for (let ii = 0; ii < level.beams.length; ++ii) {
      let old_value = level.beams[ii][3];
      level.beams[ii][3] += BEAM_CHARGE_SPEED * dt;
      while (level.beams[ii][3] > 1) {
        level.beams[ii][3] -= 1;
      }
      if (ii === 0) {
        let new_value = level.beams[ii][3];
        if (old_value < BEAM_FIRE && new_value >= BEAM_FIRE ||
          old_value < 0.5 + BEAM_FIRE && new_value >= 0.5 + BEAM_FIRE) {
          playSound('beam_fire');
        }
        if (old_value < 0.2 && new_value >= 0.2 ||
          old_value < 0.7 && new_value >= 0.7) {
          laser_sound = playSound('beam_charge');
        }
      }
    }
  }

  function playFootstep(peg) {
    playSound(peg ? 'pegstep5' : 'footstep4');
  }

  function doCharacterMotion(dt, dx, dy) {
    if (character.dead || character.exited) {
      dx = dy = 0;
    }
    if (dt > 30) {
      // timeslice
      while (dt) {
        let t = Math.min(dt, 16);
        doCharacterMotion(t, dx, dy);
        dt -= t;
      }
      return;
    }

    dt *= 0.001; // seconds

    let movement_scale = 1;
    let jump_scale = 1;
    if (disabil.limp) {
       movement_scale = Math.min(1, Math.sin(character.runloop*(2 * Math.PI) + (Math.PI/2)) * 0.5 + 1);
       jump_scale = Math.min(1, Math.sin(character.runloop*(2 * Math.PI) - (Math.PI/2)) * 0.5 + 1);
    }

    let was_on_ground = character.on_ground;
    if (!was_on_ground) {
      movement_scale = jump_scale;
    }
    let desired_horiz_vel = dx * RUN_SPEED;
    let accel = dt * (character.dead ? DEAD_ACCEL : dx ? HORIZ_ACCEL : HORIZ_DECEL);
    let delta = desired_horiz_vel - character.v[0];
    if (Math.abs(delta) <= accel) {
      character.v[0] = desired_horiz_vel;
    } else {
      character.v[0] += ((delta < 0) ? -1 : 1) * accel;
    }
    if (!dy) {
      character.jumping_released = true;
    }
    if (was_on_ground && dy && character.jumping_released) {
      character.v[1] = dy * JUMP_SPEED * jump_scale;
      character.jumping = JUMP_TIME;
      character.jumping_released = false;
      playSound('jump');
    } else if (character.jumping && dy) {
      if (dt >= character.jumping) {
        let leftover = dt - character.jumping;
        character.v[1] += GRAVITY * leftover;
        character.jumping = 0;
      } else {
        character.jumping -= dt;
        // velocity stays unchanged
      }
    } else {
      character.jumping = 0;
      character.v[1] += GRAVITY * dt;
    }
    let horiz_movement = character.v[0] * dt;
    // Update runloop
    let new_facing = (dx > 0) ? 1 : (dx < 0) ? -1 : character.facing;
    if (character.facing !== new_facing) {
      character.facing = new_facing;
      //character.runloop = 0;
    }
    if (was_on_ground && !character.dead) {
      let last_runloop = character.runloop;
      character.runloop += character.facing * horiz_movement * RUN_LOOP_SCALE * movement_scale;
      while (character.runloop < 0) {
        character.runloop += 1;
      }
      while (character.runloop >= 1) {
        character.runloop -= 1;
      }
      if (Math.abs(character.v[0]) < 0.1) {
        if (character.runloop < 0.25) {
          character.runloop = Math.max(0, character.runloop - RUN_LOOP_REST_SPEED * dt);
        } else if (character.runloop < 0.5) {
          character.runloop = Math.min(0.5, character.runloop + RUN_LOOP_REST_SPEED * dt);
        } else if (character.runloop < 0.75) {
          character.runloop = Math.max(0.5, character.runloop - RUN_LOOP_REST_SPEED * dt);
        } else {
          character.runloop = Math.min(1, character.runloop + RUN_LOOP_REST_SPEED * dt);
        }
      }
      if (last_runloop < 0.25 && character.runloop >= 0.25 && character.runloop < 0.5) {
        playFootstep(0);
      } else if (last_runloop > 0.5 && last_runloop < 0.75 && character.runloop >= 0.75) {
        playFootstep(disabil.limp ? 1 : 0);
      }
    }
    // horizontal
    character.pos[0] += horiz_movement * movement_scale;
    // check vs solids
    character.on_ground = (Math.abs(character.v[1]) < 0.001) ? was_on_ground : false;
    for (let ii = 0; ii < level.solids.length; ++ii) {
      let s = level.solids[ii];
      let c = collide(s);
      if (c & LEFT) {
        character.v[0] = 0;
        character.pos[0] = s[2];
      } else if (c & RIGHT) {
        character.v[0] = 0;
        character.pos[0] = s[0] - CHAR_W;
      }
    }
    // vertical
    character.pos[1] += character.v[1] * dt;
    for (let ii = 0; ii < level.solids.length; ++ii) {
      let s = level.solids[ii];
      let c = collide(s);
      if (c & TOP) {
        character.v[1] = 0;
        character.pos[1] = s[1] - CHAR_H;
      } else if (c & BOTTOM) {
        character.v[1] = 0;
        character.pos[1] = s[3];
      }
      if (c & BOTTOM) {
        character.on_ground = true;
      }
    }
    if (character.on_ground && !was_on_ground) {
      playSound('jump_land');
    }
    // dangers in final position
    if (!character.exited && !character.dead) {
      for (let ii = 0; ii < level.dangers.length; ++ii) {
        let d = level.dangers[ii];
        if (d[5]) {
          continue;
        }
        if (collide([d[0] + 0.25, d[1], d[2] - 0.25, d[3]])) {
          playSound('death_spike');
          character.dead = true;
          if (d[4] !== -1) {
            character.v[0] = 0;
          }
        }
      }
      for (let ii = 0; ii < level.lasers.length; ++ii) {
        let laser = level.lasers[ii];
        if (laser[4] && !laser[6]) { // bad && !paranoid
          let x = laser[0];
          let h = laser[2];
          let y = laser[1] - h/2 + laser[5];
          if (character.pos[0] < x && character.pos[0] + CHAR_W > x &&
            character.pos[1] + CHAR_H > y && character.pos[1] < y + h)
          {
            playSound('death_laser');
            character.dead = true;
          }
        }
      }
      for (let ii = 0; ii < level.beams.length; ++ii) {
        let b = level.beams[ii];
        if (b[4]) { // paranoid
          continue;
        }
        if (b[3] > 0.5 + BEAM_FIRE) {
          if (util.lineCircleIntersect(b, [b[0] + LEVEL_W, b[1] + LEVEL_W * b[2]], [character.pos[0] + CHAR_W/2, character.pos[1] + CHAR_H/2], CHAR_H/2)) {
            playSound('death_beam');
            character.dead = true;
          }
        }
      }
      if (character.dead) {
        if (disabil.blindness) {
          COUNTDOWN_FAIL = 750;
        } else {
          COUNTDOWN_FAIL = 3000;
        }
        level_countdown = COUNTDOWN_FAIL;
        if (laser_sound) {
          laser_sound.stop();
          laser_sound = null;
        }
      }
    }
    if (!character.dead && !character.exited) {
      if (collide(level.exit)) {
        character.exited = true;
        playSound('victory');
        level_countdown = COUNTDOWN_SUCCESS;
        if (laser_sound) {
          laser_sound.stop();
          laser_sound = null;
        }
      }
    }
  }

  function drawWorldElem(sprite, s, tile, color) {
    let w = s[2] - s[0];
    let h = s[3] - s[1];
    draw_list.queue(sprite, s[0] * TILESIZE,  game_height - s[3] * TILESIZE, Z.SPRITES, color || color_white,
      [w, h], tile ? [0,0, 16*w, ((s[4] < 0) ? -16 : 16) *h] : null);
  }

  function defaultCamera()
  {
    glov_camera.set2DAspectFixed(game_width, game_height);
    glov_camera.set2D(glov_camera.x0() - 64, glov_camera.y0(), glov_camera.x1() - 64, glov_camera.y1());
  }

  function nearsightedCamera() {
    glov_camera.zoom((character.pos[0] + character.pos[0]/LEVEL_W * CHAR_W) * TILESIZE, game_height - (character.pos[1] + (character.pos[1] / LEVEL_H) * CHAR_H) * TILESIZE, 8);
  }

  const TITLE_X = 5 * TILESIZE;
  const TITLE_Y = 0.25 * TILESIZE;
  const TITLE_W = 8 * TILESIZE;
  const TITLE_SIZE = TILESIZE * 0.75;
  const title_font_style = glov_font.style(null, {
    outline_width: 2.0,
    outline_color: 0x800000ff,
    glow_xoffs: 3.25,
    glow_yoffs: 3.25,
    glow_inner: -1.5,
    glow_outer: 7,
    glow_color: 0x000000ff,
  });

  function displayTitles() {
    let z = Z.UI2;
    if (level_countdown && character.exited && level_countdown < COUNTDOWN_SUCCESS / 2) {
      z = Z.UI;
    }
    font.drawSizedAligned(title_font_style, TITLE_X, TITLE_Y, z, TITLE_SIZE, glov_font.ALIGN.HCENTER,
      TITLE_W, TITLE_SIZE, level_index_label);
    font.drawSizedAligned(title_font_style, TITLE_X, TITLE_Y + TITLE_SIZE, z, TITLE_SIZE, glov_font.ALIGN.HCENTER,
      TITLE_W, TITLE_SIZE, level_title);
  }

  const disabil_font_style = glov_font.style(null, {
    outline_width: 2.0,
    outline_color: 0x000000ff,
    glow_xoffs: 0,
    glow_yoffs: 0,
    glow_inner: 1,
    glow_outer: 5,
    glow_color: 0xFFFFFFff,
  });
  const disabil_font_style_removed = glov_font.style(null, {
    color: 0x808080ff,
    outline_width: 2.0,
    outline_color: 0x000000ff,
    glow_xoffs: 0,
    glow_yoffs: 0,
    glow_inner: 1,
    glow_outer: 5,
    glow_color: 0x404040ff,
  });
  const new_font_style = glov_font.style(null, {
    color: 0xFFFF00ff,
    outline_width: 2.0,
    outline_color: 0x000000ff,
    glow_xoffs: 0,
    glow_yoffs: 0,
    glow_inner: 1,
    glow_outer: 5,
    glow_color: 0xFFFFFFff,
  });
  const DISABIL_X = [0.1 * TILESIZE, LEVEL_W / 3 * TILESIZE];
  const DISABIL_Y = [1 * TILESIZE, 3.5 * TILESIZE];
  const DISABIL_SIZE = [TILESIZE * 0.60, TILESIZE * 1];
  let dd_counter = 0;
  let dd_state;
  let dd_blink;
  let dd_removed;
  let dd_new;
  function displayDisabilities(trans, dt) {
    let pos = 0;
    let end_of_set = !!trans;
    if (end_of_set) {
      if (!dd_counter) {
        // init!
        if (trans.add.length) {
          dd_state = 0;
        } else if (trans.remove.length) {
          dd_state = 1;
        } else {
          dd_state = 2;
        }
        dd_blink = null;
        dd_removed = {};
        dd_new = {};
      }
      pos = 1;
      dd_counter += dt;
      if (dd_state === 0) {
        // showing new
        if (dd_counter > 500) {
          dd_counter = 1;
          let k = trans.add.pop();
          dd_blink = k;
          disabil[k] = true;
          dd_new[k] = true;
          if (!trans.add.length) {
            if (trans.remove.length) {
              dd_state = 1;
            } else {
              dd_state = 2;
            }
          }
        }
      } else if (dd_state === 1) {
        // showing removed
        if (dd_counter > 500) {
          dd_counter = 1;
          let k = trans.remove.pop();
          dd_blink = k;
          disabil[k] = false;
          dd_removed[k] = true;
          if (!trans.remove.length) {
            dd_state = 2;
          }
        }
      } else if (dd_state === 2) {
        if (dd_counter > 500) {
          dd_blink = null;
        }
      }
    } else {
      dd_counter = 0;
      dd_blink = 0;
      dd_removed = {};
      dd_new = {};
      if (level_countdown && character.exited && level_index === 3) {
        // interp to new pos
        pos = Math.max(0, Math.min(1, 1 - level_countdown / 1000));
      }
    }
    function interp(field) {
      return field[0] * (1 - pos) + field[1] * pos;
    }
    let x = interp(DISABIL_X);
    let y = DISABIL_Y.slice(0);
    let size = interp(DISABIL_SIZE);
    let any = false;
    for (let ii = 0; ii < disabil_list.length; ++ii) {
      if (disabil[disabil_list[ii].key]) {
        any = true;
      }
    }
    if (any || pos !== 0) {
      let alpha = any ? 255 : Math.floor(pos * 255);
      font.drawSizedAligned(glov_font.style(title_font_style,
        {
          color: 0xFFFFFF00 | alpha,
          outline_color: title_font_style.outline_color & 0xFFFFFF00 | alpha,
        }),
      x, interp(y), Z.UI2, size, glov_font.ALIGN.HLEFT, 0, 0, 'Disabilities:');
      y[0] += size;
      y[1] += size;
      x += size;
    }
    for (let ii = 0; ii < disabil_list.length; ++ii) {
      let key = disabil_list[ii].key;
      if (disabil[key] || dd_removed[key]) {
        let s = size;
        let style = disabil_font_style;
        if (key === dd_blink) {
          if (dd_removed[key]) {
            s *= 0.5 + 0.5 * (1 - dd_counter / 500);
          } else {
            s *= 1 + 0.2 * (1 - dd_counter / 500);
          }
          font.drawSizedAligned(new_font_style, x - 30, interp(y), Z.UI2, size * 0.8, glov_font.ALIGN.HRIGHT,
            0, 0, dd_removed[key] ? curedName(key) : 'NEW!');
        } else if (dd_removed[key]) {
          s *= 0.5;
          style = disabil_font_style_removed;
          font.drawSizedAligned(new_font_style, x - 30, interp(y), Z.UI2, size * 0.8, glov_font.ALIGN.HRIGHT,
            0, 0, curedName(key));
        } else if (dd_new[key]) {
          font.drawSizedAligned(new_font_style, x - 30, interp(y), Z.UI2, size * 0.8, glov_font.ALIGN.HRIGHT,
            0, 0, 'NEW!');
        }
        font.drawSizedAligned(style, x, interp(y), Z.UI2, s, glov_font.ALIGN.HLEFT|glov_font.ALIGN.VCENTER,
          0, size, disabil_list[ii].name);
        y[0] += size;
        y[1] += size;
      } else if (pos !== 0) {
        // advance y if it will be transitioned to next
        if (!trans) {
          trans = disabil_flow[disabil_index + 1];
        }
        if (trans && (trans.add.indexOf(key) !== -1 || trans.remove.indexOf(key) !== -1)) {
          y[1] += size;
        }
      }
    }
  }

  function doFade(fade) {
    draw_list.queue(sprites.white, glov_camera.x0(), glov_camera.y0(), Z.FADE, Array.isArray(fade) ? fade : [0,0,0,fade],
      [glov_camera.x1() - glov_camera.x0(), glov_camera.y1() - glov_camera.y0()]);
  }

  function play(dt) {
    defaultCamera();

    if (disabil.nearsighted) {
      // letter box
      // top
      draw_list.queue(sprites.white, glov_camera.x0(), glov_camera.y0(), Z.LETTERBOX, color_black,
        [glov_camera.x1() - glov_camera.x0(), -glov_camera.y0()]);
      // bottom
      draw_list.queue(sprites.white, glov_camera.x0(), glov_camera.y1(), Z.LETTERBOX, color_black,
        [glov_camera.x1() - glov_camera.x0(), -(glov_camera.y1() - game_height)]);
      // left
      draw_list.queue(sprites.white, glov_camera.x0(), glov_camera.y0(), Z.LETTERBOX, color_black,
        [-64 - glov_camera.x0(), glov_camera.y1() - glov_camera.y0()]);
      // right
      draw_list.queue(sprites.white, glov_camera.x1(), glov_camera.y0(), Z.LETTERBOX, color_black,
        [-(glov_camera.x1() - game_width + 64), glov_camera.y1() - glov_camera.y0()]);
    }


    if (glov_input.keyDownHit(key_codes.R)) {
      playInit();
    }

    if (location.host.indexOf('localhost') !== -1) {
      if (glov_input.keyDownHit(key_codes.Q)) {
        level_index--;
        playInit();
      }
      if (glov_input.keyDownHit(key_codes.E)) {
        character.dead = false;
        character.exited = true;
        level_countdown = COUNTDOWN_SUCCESS;
      }
    }

    updateDangers(dt);

    let dx = 0;
    let dy = 0;
    if (glov_input.isKeyDown(key_codes.LEFT) || glov_input.isKeyDown(key_codes.A) || glov_input.isPadButtonDown(0, pad_codes.LEFT)) {
      dx = -1;
    } else if (glov_input.isKeyDown(key_codes.RIGHT) || glov_input.isKeyDown(key_codes.D) || glov_input.isPadButtonDown(0, pad_codes.RIGHT)) {
      dx = 1;
    }
    if (glov_input.isKeyDown(key_codes.UP) || glov_input.isKeyDown(key_codes.W) || glov_input.isPadButtonDown(0, pad_codes.UP) ||
      glov_input.isKeyDown(key_codes.SPACE) || glov_input.isPadButtonDown(0, pad_codes.A))
    {
      dy = 1;
    }

    doCharacterMotion(dt, dx, dy);

    // drawing

    if (disabil.nearsighted) {
      nearsightedCamera();
    }

    // character
    let char_draw_pos = [character.pos[0] * TILESIZE,  game_height - ((character.pos[1] + CHAR_H) * TILESIZE)];
    if (character.facing < 0) {
      char_draw_pos[0] += CHAR_W * TILESIZE;
    }
    let char_draw_scale = [character.facing * TILESIZE*CHAR_W, TILESIZE*CHAR_H, 1, 1];
    if (character.dead) {
      draw_list.queue(sprites.avatar, char_draw_pos[0], char_draw_pos[1], Z.CHARACTER, color_white,
        char_draw_scale, sprites.avatar.uidata.rects[1]);
    } else {
      let frame = Math.floor((character.runloop % 1) * 8);
      if (!character.on_ground) {
        frame = character.jumping ? 9 : 8;
      }
      draw_list.queue(sprites.avatar2, char_draw_pos[0], char_draw_pos[1], Z.CHARACTER, color_white,
        char_draw_scale, sprites.avatar2.uidata.rects[frame]);
    }

    // world
    if (disabil.vertigo) {
      vertigo_counter += dt * 0.01;
      if (character.on_ground) {
        vertigo_counter = Math.min(vertigo_counter, Math.PI * 2);
      } else {
        while (vertigo_counter > Math.PI * 2) {
          vertigo_counter -= Math.PI * 2;
        }
      }
      glov_camera.zoom((character.pos[0] + CHAR_W/2) * TILESIZE, game_height - (character.pos[1]) * TILESIZE, 1 + 0.5 * Math.sin(vertigo_counter));
    } else if (disabil.nearsighted) {
      defaultCamera();
    }

    displayTitles();
    displayDisabilities();

    if (disabil.nearsighted) {
      nearsightedCamera();
    }

    // Background fill
    let bg_color = [0.4, 0.4, 0.4, 1];
    if (level_countdown) {
      let v = util.easeOut(Math.abs(Math.sin(level_countdown * 0.02)), 2);
      bg_color = character.dead ? [bg_color[0], bg_color[1] * 0.25*v, bg_color[2] * 0.25*v, 1] : [bg_color[0] * 0.5*v, bg_color[1], bg_color[2] * 0.5*v, 1];
    }
    draw_list.queue(sprites.game_bg, 0, game_height - LEVEL_H * TILESIZE, Z.BACKGROUND, bg_color, [LEVEL_W, LEVEL_H], [0,0,LEVEL_W * 16,LEVEL_H * 16]);

    // world elements

    for (let ii = 0; ii < 3; ++ii) {
      let s = level.solids[ii];
      draw_list.queue(sprites.solid,
        s[0] * TILESIZE,  game_height - s[3] * TILESIZE, Z.SPRITES, filterColor(color_bricks),
        [(s[2] - s[0]) * TILESIZE, (s[3] - s[1]) * TILESIZE, 1, 1], sprites.solid.uidata.rects[ii]);

    }
    for (let ii = 3; ii < level.solids.length; ++ii) {
      drawWorldElem(sprites.bricks, level.solids[ii], true, filterColor(color_bricks));
    }

    for (let ii = 0; ii < level.dangers.length; ++ii) {
      drawWorldElem(sprites.spikes, level.dangers[ii], true, character.dead ? [0.5,0,0,1] : color_white);
    }
    for (let ii = 0; ii < level.lasers.length; ++ii) {
      let laser = level.lasers[ii];
      let x = laser[0];
      let h = laser[2];
      let y = laser[1] - h/2 + laser[5];
      let bad = laser[4];
      let frame = ((glov_engine.getFrameTimestamp() / 150) ^ 0) % 4;
      draw_list.queue(sprites.lasers,
        (x - h / 4) * TILESIZE,  game_height - (y + h) * TILESIZE, Z.LASERS, filterColor(bad ? color_red : color_green),
        [TILESIZE, TILESIZE*2, 1, 1], sprites.lasers.uidata.rects[frame]);
    }

    for (let ii = 0; ii < level.beams.length; ++ii) {
      let b = level.beams[ii];
      let w = (b[2] < 0) ? Math.min(b[1], LEVEL_W - b[0]) : Math.min(LEVEL_H - b[1], LEVEL_W - b[0]);
      let p = b[3];
      let color;
      let beam_w = 3 + 5 * Math.abs(Math.sin((glov_engine.getFrameTimestamp() - level.timestamp_base) * 0.02));
      let spread = 0.5;
      if (p < BEAM_FIRE) {
        beam_w = 3;
        color = color_beam_green_warmup;
      } else if (p < 0.5) {
        //beam_w = 3;
        if (disabil.color_blindness) {
          color = color_beam_green_fire;
        } else {
          color = color_beam_green_warmup;
        }
      } else if (p < 0.5 + BEAM_FIRE) {
        beam_w = 3;
        color = color_beam_red_warmup;
      } else {
        color = color_beam_red_fire;
      }
      glov_ui.drawLine(b[0] * TILESIZE, game_height - b[1] * TILESIZE, (b[0] + w) * TILESIZE, game_height - (b[1] + w * b[2]) * TILESIZE, Z.BEAMS, beam_w, spread, filterColor(color));
    }


    if (disabil.color_blindness && !character.exited) {
      drawWorldElem(sprites.exit_desat, level.exit);
    } else {
      drawWorldElem(sprites.exit, level.exit);
    }

    if (disabil.blindness) {
      if (level_countdown) {
        if (character.exited) {
          let f = Math.max(0, 1 - (COUNTDOWN_SUCCESS - level_countdown) / 500);
          doFade(f);
        } else {
          let f = Math.max(0.3, 1 - (COUNTDOWN_FAIL - level_countdown) / 500);
          doFade([f, 0, 0, 1]);
        }
      } else {
        doFade(1);
      }
    }

    if (level_countdown) {
      let end_of_set = (level_index === 3 && character.exited);
      if (end_of_set) {
        let fade = Math.max(0, Math.min(1, 1 - level_countdown / 500));
        doFade(fade);
      }
      if (dt >= level_countdown) {
        if (end_of_set) {
          // just wait for UI
          if (disabil_index === disabil_flow.length - 1) {
            victoryInit();
          } else {
            endOfSetInit();
          }
        } else {
          if (character.exited) {
            level_index++;
          }
          playInit();
        }
      } else {
        level_countdown -= dt;
      }
    }
  }

  function playInit() {
    levelInit();
    $('.screen').hide();
    game_state = play;
  }

  const font_style_seq_complete = glov_font.style(null, {
    outline_width: 2.0,
    outline_color: 0x404040ff,
    glow_xoffs: 3.25,
    glow_yoffs: 3.25,
    glow_inner: -1.5,
    glow_outer: 7,
    glow_color: 0xFF0000ff,
  });
  const font_style_seq_progress = glov_font.style(null, {
    outline_width: 2.0,
    outline_color: 0x404040ff,
    glow_xoffs: 0,
    glow_yoffs: 0,
    glow_inner: -1.5,
    glow_outer: 7,
    glow_color: 0xFFFFFF80,
  });
  let disabil_trans;
  function endOfSet(dt) {
    defaultCamera();

    const font_size = TILESIZE * 1.5;

    let y = TILESIZE;
    font.drawSizedAligned(font_style_seq_complete, -64, y, Z.UI2, font_size, glov_font.ALIGN.HCENTER,
      game_width, 0, 'Sequence Completed!');

    displayDisabilities(disabil_trans, dt);

    if (dd_state === 2) {
      y = game_height * 0.80;

      if (glov_ui.buttonText({
        x: game_width / 2 - glov_ui.button_width / 2 - 64,
        y,
        text: 'CONTINUE'
      }) || glov_input.keyDownHit(key_codes.SPACE) || glov_input.keyDownHit(key_codes.RETURN)) {
        level_index = 0;
        playInit();
      }
      y += glov_ui.button_height + 8;

      const font_size2 = TILESIZE * 0.75;
      font.drawSizedAligned(font_style_seq_progress, -64, y, Z.UI2, font_size2, glov_font.ALIGN.HCENTER,
        game_width, 0, `Completed ${disabil_index} of ${disabil_flow.length} sequences`);
      y += font_size2;
      if (disabil_index === 8) {
      font.drawSizedAligned(font_style_seq_progress, -64, y, Z.UI2, font_size2*0.8, glov_font.ALIGN.HCENTER,
        game_width, 0, `(This one is near impossible)`);
      }

    }
  }

  function endOfSetInit() {
    game_state = endOfSet;
    ++disabil_index;
    disabil_trans = JSON.parse(JSON.stringify(disabil_flow[disabil_index]));
  }

  function victory(dt) {
    defaultCamera();

    const font_style = glov_font.style(null, {
      outline_width: 2.0,
      outline_color: 0x404040ff,
      glow_xoffs: 3.25,
      glow_yoffs: 3.25,
      glow_inner: -1.5,
      glow_outer: 7,
      glow_color: 0xFF0000ff,
    });
    const font_size = TILESIZE * 1.5;

    let y = 0;
    font.drawSizedAligned(font_style, -64, y, Z.UI2, font_size, glov_font.ALIGN.HCENTER,
      game_width, 0, 'All Sequences');
    y += font_size;
    font.drawSizedAligned(font_style, -64, y, Z.UI2, font_size, glov_font.ALIGN.HCENTER,
      game_width, 0, 'Completed!');

    displayDisabilities({add:[], remove:[]});
  }

  function victoryInit() {
    game_state = victory;
  }

  function loading() {
    let load_count = glov_sprite.loading() + sound_manager.loading();
    $('#loading').text(`Loading (${load_count})...`);
    if (!load_count) {
      //endOfSetInit();
      playInit();
    }
  }

  function loadingInit() {
    initGraphics();
    $('.screen').hide();
    game_state = loading;
    loading();
  }

  game_state = loadingInit;

  function tick(dt) {
    game_state(dt);
  }

  loadingInit();
  glov_engine.go(tick);
}
