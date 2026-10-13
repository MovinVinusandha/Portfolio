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

/**
 * Interactive DevOps Banner Easter Eggs (No Tooltips)
 * Enables click/tap reactions on floating banner icons:
 * - Docker: Whale dive & water ripple ring particles
 * - Kubernetes: Helm rotation pulse & pod burst particles
 * - Gears: Mechanical revving hyper-spin & spark particles
 * - Containers: Elastic crane stack bounce
 */
(function initBannerEasterEggs(){
  var banners = document.querySelectorAll('.banner');
  if(!banners.length) return;

  function createFxLayer(banner){
    var layer = banner.querySelector('.banner-fx-layer');
    if(!layer){
      layer = document.createElement('div');
      layer.className = 'banner-fx-layer';
      banner.appendChild(layer);
    }
    return layer;
  }

  function spawnParticles(banner, x, y, type, count){
    var fx = createFxLayer(banner);
    for(var i = 0; i < count; i++){
      var p = document.createElement('div');
      p.className = 'fx-particle ' + type;
      p.style.left = x + 'px';
      p.style.top = y + 'px';

      if(type === 'fx-pod'){
        var angle = (i / count) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
        var dist = 28 + Math.random() * 24;
        p.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
        p.style.setProperty('--ty', (Math.sin(angle) * dist - 20) + 'px');
        p.style.width = (10 + Math.random() * 6) + 'px';
        p.style.height = p.style.width;
      } else if(type === 'fx-spark'){
        var sAngle = Math.random() * Math.PI * 2;
        var sDist = 18 + Math.random() * 22;
        p.style.setProperty('--tx', Math.cos(sAngle) * sDist + 'px');
        p.style.setProperty('--ty', Math.sin(sAngle) * sDist + 'px');
        p.style.width = (4 + Math.random() * 4) + 'px';
        p.style.height = p.style.width;
      } else if(type === 'fx-splash'){
        var spAngle = -Math.PI * 0.85 + (i / (count - 1)) * Math.PI * 0.7 + (Math.random() * 0.2 - 0.1);
        var spDist = 20 + Math.random() * 26;
        p.style.setProperty('--tx', Math.cos(spAngle) * spDist + 'px');
        p.style.setProperty('--ty', (Math.sin(spAngle) * spDist - 12) + 'px');
        p.style.width = (6 + Math.random() * 5) + 'px';
        p.style.height = p.style.width;
      }

      fx.appendChild(p);
      (function(elem){
        setTimeout(function(){
          if(elem.parentNode) elem.parentNode.removeChild(elem);
        }, 1100);
      })(p);
    }
  }

  banners.forEach(function(banner){
    banner.addEventListener('click', function(e){
      var target = e.target.closest('.it');
      if(!target) return;

      var bRect = banner.getBoundingClientRect();
      var tRect = target.getBoundingClientRect();
      var centerX = tRect.left + tRect.width / 2 - bRect.left;
      var centerY = tRect.top + tRect.height / 2 - bRect.top;

      if(target.classList.contains('k-docker')){
        if(target.classList.contains('rolling')) return;

        var now = Date.now();
        var isDoubleClick = (target._lastClick && (now - target._lastClick < 450)) || target.classList.contains('diving');
        target._lastClick = now;

        if(isDoubleClick){
          if(target._diveTimer){
            clearTimeout(target._diveTimer);
            target._diveTimer = null;
          }
          target.classList.remove('diving');
          void target.offsetWidth; // trigger reflow for smooth animation restart
          target.classList.add('rolling');

          // Splashdown celebration droplets upon landing
          setTimeout(function(){
            spawnParticles(banner, centerX, centerY + 14, 'fx-splash', 8);
          }, 1060);

          target._rollTimer = setTimeout(function(){
            target.classList.remove('rolling');
            target._rollTimer = null;
            target._lastClick = 0;
          }, 1400);
        } else {
          if(target.classList.contains('diving')) return;
          target.classList.add('diving');
          target._diveTimer = setTimeout(function(){
            target.classList.remove('diving');
            target._diveTimer = null;
          }, 1300);
        }
      } else if(target.classList.contains('k-k8s')){
        if(target.classList.contains('scaling')) return;
        target.classList.add('scaling');
        spawnParticles(banner, centerX, centerY, 'fx-pod', 4);
        setTimeout(function(){
          target.classList.remove('scaling');
        }, 750);
      } else if(target.classList.contains('k-gear')){
        if(target.classList.contains('revving')) return;
        target.classList.add('revving');
        spawnParticles(banner, centerX, centerY, 'fx-spark', 5);
        setTimeout(function(){
          target.classList.remove('revving');
        }, 900);
      } else if(target.classList.contains('k-ctr') || target.classList.contains('k-stack')){
        if(target.classList.contains('bouncing')) return;
        target.classList.add('bouncing');
        setTimeout(function(){
          target.classList.remove('bouncing');
        }, 650);
      }
    });
  });
})();
