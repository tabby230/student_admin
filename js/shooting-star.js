(function () {
  'use strict';

  var layer = document.getElementById('shootingStarLayer');
  if (!layer) return;

  var scheduleTimer = null;

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function removeStar(star) {
    if (star && star.parentNode) star.parentNode.removeChild(star);
  }

  function spawnStar() {
    scheduleTimer = null;
    if (document.hidden) return;

    var width = window.innerWidth || document.documentElement.clientWidth || 1;
    var height = window.innerHeight || document.documentElement.clientHeight || 1;
    var angle = randomBetween(125, 155);
    var distance = randomBetween(180, 360);
    var length = randomBetween(80, 120);
    var duration = randomBetween(1000, 1500);
    var startX = width * randomBetween(0.55, 0.9);
    var startY = height * randomBetween(0.08, 0.58);
    var star = document.createElement('span');
    var cleanupTimer;

    star.className = 'shooting-star';
    star.style.left = startX.toFixed(1) + 'px';
    star.style.top = startY.toFixed(1) + 'px';
    star.style.setProperty('--star-angle', angle.toFixed(2) + 'deg');
    star.style.setProperty('--star-distance', distance.toFixed(1) + 'px');
    star.style.setProperty('--star-length', length.toFixed(1) + 'px');
    star.style.setProperty('--star-duration', duration.toFixed(0) + 'ms');
    layer.appendChild(star);

    cleanupTimer = window.setTimeout(function () {
      removeStar(star);
    }, duration + 150);

    star.addEventListener('animationend', function () {
      window.clearTimeout(cleanupTimer);
      removeStar(star);
    }, { once: true });

    scheduleNext();
  }

  function scheduleNext() {
    if (document.hidden) return;
    if (scheduleTimer !== null) window.clearTimeout(scheduleTimer);
    scheduleTimer = window.setTimeout(spawnStar, randomBetween(4000, 9000));
  }

  function stop() {
    if (scheduleTimer !== null) {
      window.clearTimeout(scheduleTimer);
      scheduleTimer = null;
    }

    var stars = layer.querySelectorAll('.shooting-star');
    for (var i = 0; i < stars.length; i += 1) removeStar(stars[i]);
  }

  function start() {
    if (!document.hidden) scheduleNext();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else start();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
