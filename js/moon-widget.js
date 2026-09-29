/* EduTrack — Sidebar 3D Moon Widget
 * Renders assets/3dmodel/moon.glb inside the glass sidebar panel.
 * Pinned to Three.js r128 (cdnjs) + matching r128 examples/js addons.
 * Initialises once per page load, pauses when the tab is hidden.
 */
(function () {
  'use strict';

  var DEFAULT_SRC = 'assets/3dmodel/moon.glb';
  var RESUME_DELAY = 2000;
  var FIT_PADDING = 1.12;
  var MIN_HEIGHT = 220;
  var MAX_LOAD_RETRIES = 2;
  var RETRY_DELAY = 750;

  function boot() {
    var container = document.getElementById('moonWidget');
    if (!container || container.dataset.moonReady === '1') return;
    container.dataset.moonReady = '1';

    var src = container.getAttribute('data-moon-src') || DEFAULT_SRC;
    var loader = container.querySelector('.moon-widget-loader');
    var fallback = container.querySelector('.moon-widget-fallback');

    if (loader) loader.hidden = false;
    if (fallback) fallback.hidden = true;

    function logError(message, error) {
      if (window.console && typeof window.console.error === 'function') {
        window.console.error(message, error);
      }
    }

    function showFallback() {
      if (loader) loader.hidden = true;
      if (fallback) fallback.hidden = false;
      container.classList.add('is-fallback');
    }

    if (typeof window.THREE === 'undefined' ||
        typeof window.THREE.GLTFLoader === 'undefined' ||
        typeof window.THREE.OrbitControls === 'undefined') {
      logError('[moon-widget] required Three.js globals are unavailable', new Error('Three.js, GLTFLoader, and OrbitControls are required'));
      showFallback();
      return;
    }

    var initialized = false;
    var initFrame = null;
    var layoutObserver = null;
    var layoutRetry = null;

    function initialize() {
      var w = container.clientWidth;
      var h = container.clientHeight;
      if (!w || !h) {
        scheduleLayout();
        return;
      }

      initialized = true;
      if (layoutObserver) {
        layoutObserver.disconnect();
        layoutObserver = null;
      }
      if (layoutRetry) {
        window.clearTimeout(layoutRetry);
        layoutRetry = null;
      }

      if (window.console && typeof window.console.info === 'function') {
        window.console.info('[moon-widget] container clientWidth/clientHeight:', w, h);
      }

    var renderer;
    try {
      renderer = new window.THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (e) {
      logError('[moon-widget] WebGLRenderer initialization failed', e);
      showFallback();
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.outputEncoding = window.THREE.sRGBEncoding;
    renderer.domElement.style.backgroundColor = 'transparent';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    container.insertBefore(renderer.domElement, container.firstChild);

    var scene = new window.THREE.Scene();
    var camera = new window.THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    camera.position.set(0, 0, 60);

    scene.add(new window.THREE.AmbientLight(0xffffff, 0.85));
    var keyLight = new window.THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(4, 6, 8);
    scene.add(keyLight);
    var rimLight = new window.THREE.PointLight(0x9fc6ff, 0.6, 0, 2);
    rimLight.position.set(-6, -2, -7);
    scene.add(rimLight);

    var controls = new window.THREE.OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    // OrbitControls r128 rotates (2*PI/60*speed*dt) rad per frame.
    // 0.002 rad/frame => speed = 0.002 * 3600 / (2*PI) = 1.15 (~52s per turn).
    controls.autoRotateSpeed = 1.15;

    var root = new window.THREE.Group();
    scene.add(root);

    var radius = 0;
    var interacting = false;
    var resumeTimer = null;
    var rafId = null;
    var loadAttempt = 0;
    var retryTimer = null;

    function fitDistance(aspect) {
      var vFov = (camera.fov * Math.PI) / 180;
      var hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
      return (radius / Math.sin(Math.min(vFov, hFov) / 2)) * FIT_PADDING;
    }

    function applyFit(keepAngle) {
      if (!radius) return;
      var w = container.clientWidth || 1;
      var h = container.clientHeight || MIN_HEIGHT;
      var dir = keepAngle
        ? camera.position.clone().sub(controls.target).normalize()
        : new window.THREE.Vector3(0.45, 0.25, 1).normalize();
      var d = fitDistance(w / h);
      camera.near = Math.max(0.1, d - radius * 1.5);
      camera.far = Math.max(2000, d + radius * 1.5);
      camera.position.copy(controls.target).add(dir.multiplyScalar(d));
      controls.minDistance = d;
      controls.maxDistance = d;
      camera.updateProjectionMatrix();
      controls.update();
    }

    function resize() {
      var w = container.clientWidth;
      var h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      renderer.setSize(w, h, false);
      renderer.clear();
      applyFit(true);
    }

    function loop() {
      rafId = window.requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    }

    function start() {
      if (rafId === null && !document.hidden) rafId = window.requestAnimationFrame(loop);
    }

    function stop() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    controls.addEventListener('start', function () {
      interacting = true;
      controls.autoRotate = false;
      if (resumeTimer) window.clearTimeout(resumeTimer);
    });

    controls.addEventListener('end', function () {
      interacting = false;
      if (resumeTimer) window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(function () {
        if (!interacting) controls.autoRotate = true;
      }, RESUME_DELAY);
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else start();
    });

    window.addEventListener('resize', resize);

    if (typeof window.ResizeObserver === 'function') {
      new window.ResizeObserver(resize).observe(container);
    }

    resize();
    window.requestAnimationFrame(resize);

    function loadFailure(error, attempt) {
      logError(
        '[moon-widget] GLTF load failed for ' + src + ' (attempt ' + (attempt + 1) + '/' + (MAX_LOAD_RETRIES + 1) + '):',
        error
      );
      if (attempt < MAX_LOAD_RETRIES) {
        retryTimer = window.setTimeout(function () {
          retryTimer = null;
          loadAttempt += 1;
          loadModel();
        }, RETRY_DELAY);
        return;
      }
      showFallback();
    }

    function loadModel() {
      var attempt = loadAttempt;
      new window.THREE.GLTFLoader().load(
        src,
        function (gltf) {
          var model = gltf && (gltf.scene || (gltf.scenes && gltf.scenes[0]));
          if (!model) {
            loadFailure(new Error('GLTF response did not contain a scene'), attempt);
            return;
          }

          model.updateMatrixWorld(true);
          var box = new window.THREE.Box3().setFromObject(model);
          var sphere = box.getBoundingSphere(new window.THREE.Sphere());
          if (!isFinite(sphere.radius) || sphere.radius <= 0) {
            loadFailure(new Error('GLTF model has no valid bounds'), attempt);
            return;
          }

          root.add(model);
          model.traverse(function (node) {
            if (node.isMesh) node.frustumCulled = false;
          });

          model.scale.multiplyScalar(10 / sphere.radius);
          model.updateMatrixWorld(true);
          box.setFromObject(model);
          sphere.copy(box.getBoundingSphere(new window.THREE.Sphere()));
          root.position.copy(sphere.center).multiplyScalar(-1);
          root.updateMatrixWorld(true);
          radius = sphere.radius;

          resize();
          applyFit(false);

          try {
            controls.update();
            renderer.render(scene, camera);
          } catch (error) {
            logError('[moon-widget] first frame render failed', error);
            showFallback();
            return;
          }

          if (retryTimer !== null) {
            window.clearTimeout(retryTimer);
            retryTimer = null;
          }
          if (loader) loader.hidden = true;
          if (fallback) fallback.hidden = true;
          container.classList.remove('is-fallback');
          container.classList.add('is-ready');
          start();
        },
        undefined,
        function (error) {
          loadFailure(error, attempt);
        }
      );
    }

    loadModel();
    }

    function scheduleLayout() {
      if (initialized) return;
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        if (initFrame === null) {
          initFrame = window.requestAnimationFrame(function () {
            initFrame = null;
            initialize();
          });
        }
        return;
      }
      if (typeof window.ResizeObserver !== 'function' && layoutRetry === null) {
        layoutRetry = window.setTimeout(function () {
          layoutRetry = null;
          scheduleLayout();
        }, 100);
      }
    }

    if (typeof window.ResizeObserver === 'function') {
      layoutObserver = new window.ResizeObserver(scheduleLayout);
      layoutObserver.observe(container);
    }
    window.addEventListener('resize', scheduleLayout);
    window.addEventListener('load', scheduleLayout);
    scheduleLayout();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
