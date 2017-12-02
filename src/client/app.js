/*jshint noempty:false, bitwise:false*/

/*global $: false */
/*global math_device: false */
/*global assert: false */
/*global Z: false */

window.Z = window.Z || {};
Z.BACKGROUND = 0;
Z.SPRITES = 10;
Z.LASERS = 15;
Z.CHARACTER = 20;

// Virtual viewport for our game logic
const game_width = 1280;
const game_height = 960;

export function main(canvas)
{
  const glov_engine = require('./glov/engine.js');
  const glov_font = require('./glov/font.js');

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
  // const font = glov_engine.font;

  const loadTexture = glov_sprite.loadTexture.bind(glov_sprite);
  const createSprite = glov_sprite.createSprite.bind(glov_sprite);

  glov_ui.bindSounds(sound_manager, {
    button_click: 'button_click',
    rollover: 'rollover',
  });

  const color_white = math_device.v4Build(1, 1, 1, 1);
  const color_red = math_device.v4Build(1, 0, 0, 1);
  const color_green = math_device.v4Build(0, 1, 0, 1);
  const color_yellow = math_device.v4Build(1, 1, 0, 1);

  // Cache key_codes
  const key_codes = glov_input.key_codes;
  const pad_codes = glov_input.pad_codes;

  let game_state;

  let sprites = {};

  const TILESIZE = 64;
  const CHAR_W = 0.5;
  const CHAR_H = 1;
  const LEVEL_W = 18;
  const LEVEL_H = 14;


  const spriteSize = 64;
  function initGraphics() {
    if (sprites.white) {
      return;
    }

    sound_manager.loadSound('test');
    //loadTexture('avatar.png');

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
    sprites.lasers = glov_ui.loadSpriteRect('lasers.png', [16, 16, 16, 16], [32]);

    sprites.solid = createSprite('solid.png', {
      width : TILESIZE,
      height : TILESIZE,
      rotation : 0,
      color : [1,1,1,1],
      origin: [0, 0],
      textureRectangle : math_device.v4Build(0, 0, 32, 8)
    });

    sprites.exit = createSprite('exit.png', {
      width : TILESIZE,
      height : TILESIZE,
      rotation : 0,
      color : [1,1,1,1],
      origin: [0, 0],
      textureRectangle : math_device.v4Build(0, 0, 16, 32)
    });

    sprites.spikes = createSprite('spikes.png', {
      width : TILESIZE,
      height : TILESIZE,
      rotation : 0,
      color : [1,1,1,1],
      origin: [0, 0],
      textureRectangle : math_device.v4Build(0, 0, 16, 16)
    });

    sprites.game_bg = createSprite('white', {
      width : LEVEL_W * TILESIZE,
      height : LEVEL_H * TILESIZE,
      x : 0,
      y : 0,
      rotation : 0,
      color : [0, 0.72, 1, 1],
      origin: [0, 0],
      textureRectangle : math_device.v4Build(0, 0, spriteSize, spriteSize)
    });
  }

  let character;
  let level;

  let level_index = 3;

  function levelInit() {
    character = {
      pos: [2.25, 4.5],
      v: [0,0],
      on_ground: false,
      jumping: 0,
      jumping_released: true,
    };
    level = {};
    level.solids = [
      [-1,-1, 0, LEVEL_H + 1], // left
      [LEVEL_W,-1, LEVEL_W + 1, LEVEL_H + 1], // right
      [0,LEVEL_H, LEVEL_W, LEVEL_H + 1], // top
      [0,-1, LEVEL_W, 0], // bottom
      [0,2, 4,3],
      [6,6, 10,7],
      [14,9, 18,10],
    ];
    level.dangers = [
      [0,0, 18,1],
    ];
    if (level_index === 1) {
      level.dangers.push([1,6, 3,7, -1], [7,7, 9,8]);
    }
    level.lasers = [];
    if (level_index === 2) {
      // x, ymid, h, magnitude, bad, yofs
      level.lasers.push([0.5, 6, 2, 2, 1, 0]);
      level.lasers.push([0.5, 3, 2, 2, 0, 0]);

      level.lasers.push([5, 8, 2, 2, 0, 0]);
      level.lasers.push([5, 5, 2, 2, 1, 0]);

      level.lasers.push([12, 10, 2, 2, 1, 0]);
      level.lasers.push([12, 7,  2, 2, 0, 0]);
    }
    level.beams = [];
    if (level_index === 3) {
      //level.beams.push();
    }

    level.exit = [16,10, 17, 12];
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

  function updateDangers() {
    for (let ii = 0; ii < level.lasers.length; ++ii) {
      level.lasers[ii][5] = Math.sin(glov_engine.getFrameTimestamp() * 0.002) * level.lasers[ii][3];
    }
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
    if (character.on_ground) {
      if (dy && character.jumping_released) {
        character.v[1] = dy * JUMP_SPEED;
        character.jumping = JUMP_TIME;
        character.jumping_released = false;
      } else {
        character.v[1] = 0;
        character.jumping = 0;
      }
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
    // horizontal
    character.pos[0] += character.v[0] * dt;
    // check vs solids
    character.on_ground = false;
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
    // dangers in final position
    if (!character.exited) {
      for (let ii = 0; ii < level.dangers.length; ++ii) {
        if (collide(level.dangers[ii])) {
          character.dead = true;
        }
      }
      for (let ii = 0; ii < level.lasers.length; ++ii) {
        let laser = level.lasers[ii];
        if (laser[4]) { // bad
          let x = laser[0];
          let h = laser[2];
          let y = laser[1] - h/2 + laser[5];
          if (character.pos[0] < x && character.pos[0] + CHAR_W > x &&
            character.pos[1] + CHAR_H > y && character.pos[1] < y + h)
          {
            character.dead = true;
          }
        }
      }
    }
    if (!character.dead) {
      if (collide(level.exit)) {
        character.exited = true;
      }
    }
  }

  function drawWorldElem(sprite, s, tile) {
    let w = s[2] - s[0];
    let h = s[3] - s[1];
    draw_list.queue(sprite, s[0] * TILESIZE,  game_height - s[3] * TILESIZE, Z.SPRITES, [1,1,1,1],
      [w, h], tile ? [0,0, 16*w, ((s[4] < 0) ? -16 : 16) *h] : null);
  }

  function play(dt) {

    glov_camera.set2DAspectFixed(game_width, game_height);
    glov_camera.set2D(glov_camera.x0() - 64, glov_camera.y0(), glov_camera.x1() - 64, glov_camera.y1());

    if (glov_input.keyDownHit(key_codes.R)) {
      playInit(dt);
    }

    updateDangers();

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

    draw_list.queue(sprites.game_bg, 0, game_height - LEVEL_H * TILESIZE, Z.BACKGROUND, color_white);
    draw_list.queue(sprites.avatar, character.pos[0] * TILESIZE,  game_height - ((character.pos[1] + CHAR_H) * TILESIZE), Z.CHARACTER, [1,1,1,1],
      [TILESIZE*CHAR_W, TILESIZE*CHAR_H, 1, 1], sprites.avatar.uidata.rects[character.dead ? 1 : 0]);

    for (let ii = 0; ii < level.solids.length; ++ii) {
      drawWorldElem(sprites.solid, level.solids[ii], false);
    }

    for (let ii = 0; ii < level.dangers.length; ++ii) {
      drawWorldElem(sprites.spikes, level.dangers[ii], true);
    }
    for (let ii = 0; ii < level.lasers.length; ++ii) {
      let laser = level.lasers[ii];
      let x = laser[0];
      let h = laser[2];
      let y = laser[1] - h/2 + laser[5];
      let bad = laser[4];
      let frame = ((glov_engine.getFrameTimestamp() / 150) ^ 0) % 4;
      draw_list.queue(sprites.lasers,
        (x - h / 4) * TILESIZE,  game_height - (y + h) * TILESIZE, Z.LASERS, bad ? color_red : color_green,
        [TILESIZE, TILESIZE*2, 1, 1], sprites.lasers.uidata.rects[frame]);
    }

    drawWorldElem(sprites.exit, level.exit);

    // let font_style = glov_font.style(null, {
    //   outline_width: 1.0,
    //   outline_color: 0x800000ff,
    //   glow_xoffs: 3.25,
    //   glow_yoffs: 3.25,
    //   glow_inner: -2.5,
    //   glow_outer: 5,
    //   glow_color: 0x000000ff,
    // });
    // glov_ui.print(font_style, test.character.x, test.character.y + (++font_test_idx * glov_ui.font_height), Z.SPRITES,
    //   'Outline and Drop Shadow');
  }

  function playInit(dt) {
    levelInit();
    $('.screen').hide();
    $('#title').show();
    game_state = play;
    play(dt);
  }

  function loading() {
    let load_count = glov_sprite.loading() + sound_manager.loading();
    $('#loading').text(`Loading (${load_count})...`);
    if (!load_count) {
      game_state = playInit;
    }
  }

  function loadingInit() {
    initGraphics();
    $('.screen').hide();
    $('#title').show();
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
