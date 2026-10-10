/**
 * Portfolio Main Script - Movin Vinusandha
 * Handles interactive mascot physics, page-mascot sprite engine, and dynamic UI elements.
 */

(function(){
  var btn = document.getElementById('mascot');
  if(!btn) return;

  var char = btn.querySelector('.mascot-character');
  var say = document.getElementById('say');
  var yr = document.getElementById('yr');
  if(yr) yr.textContent = new Date().getFullYear();

  var mx = null, my = null, raf = 0, sayT = 0, reactT = 0, n = 0;
  var isReacting = false;

  var lines = [
    'Ouch, that tickles! 😆',
    'Poke me again! 👈',
    'Deploying high-fives... 🚀',
    'Hey, watch the cap! 🧢',
    '404: Poke handler not found 🐛',
    'Container healthy! 🐳',
    'Again! Don’t leave me hanging 😄',
    'Ping: 1ms. Pong! 🏓',
    'Works on my machine! 💻',
    'One more poke for good luck ✨'
  ];

  var dizzyLines = [
    'Whoa, world is spinning! 💫',
    'CPU overloaded! 😵‍💫',
    'Too many pokes, captain! 🌀',
    'Rate limit exceeded! ⏳'
  ];

  // Official koboyo page-mascot specifications:
  // 3x3 grid directions m: ['up-left', 'up', 'up-right', 'left', 'center', 'right', 'down-left', 'down', 'down-right']
  // Angular sectors g: ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right']
  var DIRECTIONS = ['up-left', 'up', 'up-right', 'left', 'center', 'right', 'down-left', 'down', 'down-right'];
  var REACTIONS = ['blink', 'heart', 'sparkle', 'surprised', 'wink', 'bashful', 'sleepy', 'dizzy', 'delighted'];
  var SECTOR_DIRS = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];

  var DIR_INDEX = {
    'up-left': 0,
    'up': 1,
    'up-right': 2,
    'left': 3,
    'center': 4,
    'right': 5,
    'down-left': 6,
    'down': 7,
    'down-right': 8
  };

  var REACTION_INDEX = {
    'blink': 0,
    'heart': 1,
    'sparkle': 2,
    'surprised': 3,
    'wink': 4,
    'bashful': 5,
    'sleepy': 6,
    'dizzy': 7,
    'delighted': 8
  };

  function getPosition(idx) {
    var col = (idx % 3) * 50;
    var row = Math.floor(idx / 3) * 50;
    return col + '% ' + row + '%';
  }

  function wrapAngle(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }

  // Exact Koboyo parameters (scaled proportionally for 200px character size):
  var SECTOR_ANGLE = (Math.PI * 2) / SECTOR_DIRS.length; // Math.PI / 4 = 45 deg
  var HYSTERESIS = 0.12;
  var DEAD_ZONE = 95; // px
  var POKE_WINDOW = 1600; // ms
  var DIZZY_THRESHOLD = 4; // clicks within window

  var lastDirIdx = -1;
  var currentDir = 'center';
  var clickCount = 0;
  var lastClickTime = 0;
  var timeouts = [];

  function clearReactionTimers() {
    timeouts.forEach(clearTimeout);
    timeouts = [];
  }

  function addTimer(delay, fn) {
    timeouts.push(setTimeout(fn, delay));
  }

  function setMascotReaction(reactionKey) {
    if (!reactionKey) {
      isReacting = false;
      btn.classList.remove('reacting');
      lastDirIdx = -1;
      currentDir = '';
      updateMascot();
      return;
    }
    isReacting = true;
    btn.classList.add('reacting');
    var idx = REACTION_INDEX[reactionKey] !== undefined ? REACTION_INDEX[reactionKey] : 0;
    char.style.backgroundPosition = getPosition(idx);
  }

  function updateMascot() {
    raf = 0;
    if (mx === null || isReacting) return;

    var rect = btn.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;

    var dx = mx - cx;
    var dy = my - cy;
    var dist = Math.hypot(dx, dy);

    if (dist < DEAD_ZONE) {
      lastDirIdx = -1;
      if (currentDir !== 'center') {
        currentDir = 'center';
        char.style.backgroundPosition = getPosition(DIR_INDEX['center']);
      }
      return;
    }

    var angle = Math.atan2(dy, dx);
    var targetIdx;

    if (lastDirIdx !== -1 && Math.abs(wrapAngle(angle - lastDirIdx * SECTOR_ANGLE)) < (SECTOR_ANGLE / 2 + HYSTERESIS)) {
      targetIdx = lastDirIdx;
    } else {
      targetIdx = (Math.round(angle / SECTOR_ANGLE) + SECTOR_DIRS.length) % SECTOR_DIRS.length;
      lastDirIdx = targetIdx;
    }

    var dirName = SECTOR_DIRS[targetIdx];
    if (dirName !== currentDir) {
      currentDir = dirName;
      char.style.backgroundPosition = getPosition(DIR_INDEX[dirName]);
    }
  }

  function queueUpdate() {
    if (!raf) raf = requestAnimationFrame(updateMascot);
  }

  window.addEventListener('pointermove', function(e) {
    mx = e.clientX;
    my = e.clientY;
    queueUpdate();
  }, { passive: true });

  window.addEventListener('scroll', queueUpdate, { passive: true });

  // Reaction poke handler matching Koboyo behavior:
  // Quick poke: blink -> delighted/heart/sparkle -> normal
  // Repeated rapid pokes: triggers dizzy reaction!
  btn.addEventListener('click', function() {
    clearReactionTimers();

    var now = Date.now();
    clickCount = (now - lastClickTime < POKE_WINDOW) ? clickCount + 1 : 1;
    lastClickTime = now;

    // Koboyo exact squish-bounce animation:
    // S = [{transform: 'scale(1, 1)', easing: 'ease-in'}, {transform: 'scale(1.10, 0.86)', offset: 0.18, easing: 'ease-out'}, {transform: 'scale(0.95, 1.08)', offset: 0.45, easing: 'ease-in-out'}, {transform: 'scale(1.03, 0.97)', offset: 0.72, easing: 'ease-in-out'}, {transform: 'scale(1, 1)'}]
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && char && char.animate) {
      char.animate([
        { transform: 'scale(1, 1)', easing: 'ease-in' },
        { transform: 'scale(1.10, 0.86)', offset: 0.18, easing: 'ease-out' },
        { transform: 'scale(0.95, 1.08)', offset: 0.45, easing: 'ease-in-out' },
        { transform: 'scale(1.03, 0.97)', offset: 0.72, easing: 'ease-in-out' },
        { transform: 'scale(1, 1)' }
      ], {
        duration: 420,
        easing: 'linear'
      });
    }

    var bubbleText = lines[n++ % lines.length];

    if (clickCount >= DIZZY_THRESHOLD) {
      clickCount = 0;
      bubbleText = dizzyLines[Math.floor(Math.random() * dizzyLines.length)];
      setMascotReaction('dizzy');
      addTimer(1100, function() {
        setMascotReaction(null);
      });
    } else {
      var pleasantReactions = ['heart', 'sparkle', 'delighted'];
      var picked = pleasantReactions[(clickCount - 1) % pleasantReactions.length];
      setMascotReaction('blink');
      addTimer(120, function() {
        setMascotReaction(picked);
      });
      addTimer(560, function() {
        setMascotReaction(null);
      });
    }

    // Speech bubble dialogue
    if (say) {
      say.textContent = bubbleText;
      say.classList.add('on');
      clearTimeout(sayT);
      sayT = setTimeout(function() {
        say.classList.remove('on');
      }, 2000);
    }
  });

  // Idle subtle gaze shift only when pointer is not on the screen
  var idleTimer;
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function() {
      if (!isReacting && mx === null) {
        var dirs = ['center', 'up-right', 'up-left', 'right', 'left'];
        var randomDir = dirs[Math.floor(Math.random() * dirs.length)];
        currentDir = randomDir;
        char.style.backgroundPosition = getPosition(DIR_INDEX[randomDir]);
      }
      resetIdle();
    }, 6000 + Math.random() * 4000);
  }
  resetIdle();
})();
