// frontend/src/content/shimeji.js
// Fixed 1–5: safe menu placement, wall grip offset, forced overrides,
// climb/cling gating, and slower speeds.

(() => {
  if (window.__SHIMEJI_MANAGER__) return;

  const url = (p) => (chrome?.runtime?.getURL ? chrome.runtime.getURL(p) : p);

  // ---- Assets (left-facing base art) ----
  const ASSETS = {
    idle:  [url('assets/shimeji/idle/idle_1.png')],
    walk:  [url('assets/shimeji/walk/walk_1.png'), url('assets/shimeji/walk/walk_2.png'), url('assets/shimeji/walk/walk_3.png')],
    climb: [url('assets/shimeji/climb/climb_1.png'), url('assets/shimeji/climb/climb_2.png'), url('assets/shimeji/climb/climb_3.png')],
    drag:  [url('assets/shimeji/drag/drag_1.png')],
    fall:  [url('assets/shimeji/fall/fall_1.png')],
  };

  // ---- Tunables ----
  const FPS_IMG = 8;
  const FRAME_MS = 1000 / FPS_IMG;
  const CLIMB_IMG_PUSH = 18;

  // (5) 25% slower
  const WALK_SPEED  = 90;  // was 120
  const CLIMB_SPEED = 75;  // was 100

  const GRAVITY = 2500;
  const MAX_DT  = 1 / 30;
  const Z = 2147483647;

  // Decisions
  const DECIDE_GROUND_MIN = 1500, DECIDE_GROUND_MAX = 4000;
  const DECIDE_CLIMB_MIN  = 1500, DECIDE_CLIMB_MAX  = 4000;
  const CLING_MIN = 2000, CLING_MAX = 6000;

  // (2) “Grip the wall” visuals
  const WALL_SNAP_RANGE   = 24; // how close counts as “near wall”
  const WALL_GRAB_OVERLAP = 8;  // how many px to overlap into the wall while climbing/cling

  // (1) Context menu clamp
  const MENU_MARGIN = 8;

  // Jump
  const JUMP_VX = 220, JUMP_VY = -700, AIR_FRICTION = 0.985;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const between = (min, max) => min + Math.random() * (max - min);
  const chance = (p) => Math.random() < p;

  class Shimeji {
    constructor() {
      /** @type {'idle'|'walk'|'climb_up'|'climb_down'|'cling'|'drag'|'fall'|'jump'} */
      this.state = 'idle';
      /** @type {'left'|'right'} */ this.dir = 'right';
      this.randomMode = true;

      this.x = 100; this.y = 0;
      this.vx = 0;   this.vy = 0;

      this.frame = 0;
      this.nextFrameAt = 0;

      this.nextDecisionAt = 0;
      this.nextClimbAt = 0;
      this.clingUntil = 0;
      this.clingFrame = 0;

      this._prevNow = performance.now();
      this._raf = 0;

      // DOM
      this.root = document.createElement('div');
      this.img  = document.createElement('img');
      Object.assign(this.root.style, {
        position: 'fixed', left: '0px', top: '0px',
        width: '96px', height: '96px',
        zIndex: String(Z), willChange: 'transform', pointerEvents:'auto', userSelect:'none'
      });
      this.img.draggable = false;
      this.img.style.width = '100%';
      this.img.style.height = '100%';
      this.img.style.imageRendering = 'pixelated';
      // log image errors (helps when assets aren’t copied to dist/)
      this.img.addEventListener('error', () => {
        console.error('[Shimeji] Failed to load', this.img.src);
      });
      this.root.appendChild(this.img);
      document.body.appendChild(this.root);

      this.snapToGround();
      this.setState('idle', {force:true});
      this.scheduleGroundDecision(performance.now());

      // ====== MOUSE DRAG ======
      this._onDown = (e) => this.onMouseDown(e);
      this._onMove = (e) => this.onMouseMove(e);
      this._onUp   = (e) => this.onMouseUp(e);
      this.root.addEventListener('mousedown', this._onDown);

      // ====== INTERACTION: context menu ======
      this._onCtx = (e) => this.onContextMenu(e);
      this.root.addEventListener('contextmenu', this._onCtx);

      // keep on ground on resize
      this._onResize = () => this.snapToGround();
      window.addEventListener('resize', this._onResize);

      this._raf = requestAnimationFrame((t) => this.tick(t));
    }

    // geometry
    width()  { return this.root.getBoundingClientRect().width  || 96; }
    height() { return this.root.getBoundingClientRect().height || 96; }
    groundY(){ return window.innerHeight - this.height(); }
    leftGap()  { return this.x; }
    rightGap() { return window.innerWidth - (this.x + this.width()); }
    nearLeftWall()  { return this.leftGap()  <= WALL_SNAP_RANGE; }
    nearRightWall() { return this.rightGap() <= WALL_SNAP_RANGE; }

    pinToLeftWall()  { this.x = -WALL_GRAB_OVERLAP; }
    pinToRightWall() { this.x = window.innerWidth - this.width() + WALL_GRAB_OVERLAP; }

    snapToGround(){ this.y = this.groundY(); this.render(); }

    scheduleGroundDecision(now){ this.nextDecisionAt = now + between(DECIDE_GROUND_MIN, DECIDE_GROUND_MAX); }
    scheduleClimbDecision(now) { this.nextClimbAt    = now + between(DECIDE_CLIMB_MIN,  DECIDE_CLIMB_MAX); }
    scheduleClingHold(now)     { this.clingUntil     = now + between(CLING_MIN,         CLING_MAX); }

    // (3) allow same-state re-entry to update velocity/frames
    setState(s, {force=false} = {}) {
      // Always allow re-apply when force=true OR when state changes
      const switching = (s !== this.state) || force;
      this.state = s;

      if (s === 'walk') {
        this.vx = (this.dir === 'left' ? -1 : 1) * WALK_SPEED; this.vy = 0;
        if (switching) this.scheduleGroundDecision(performance.now());
      } else if (s === 'idle') {
        this.vx = 0; this.vy = 0;
        if (switching) this.scheduleGroundDecision(performance.now());
      } else if (s === 'climb_up') {
        this.vx = 0; this.vy = -CLIMB_SPEED;
        if (this.nearLeftWall())  this.pinToLeftWall();
        if (this.nearRightWall()) this.pinToRightWall();
        if (switching) this.scheduleClimbDecision(performance.now());
      } else if (s === 'climb_down') {
        this.vx = 0; this.vy =  CLIMB_SPEED;
        if (this.nearLeftWall())  this.pinToLeftWall();
        if (this.nearRightWall()) this.pinToRightWall();
        if (switching) this.scheduleClimbDecision(performance.now());
      } else if (s === 'cling') {
        this.vx = 0; this.vy = 0;
        // freeze current climb frame
        this.clingFrame = this.frame % ASSETS.climb.length;
        if (this.nearLeftWall())  this.pinToLeftWall();
        if (this.nearRightWall()) this.pinToRightWall();
        if (switching) this.scheduleClingHold(performance.now());
      } else if (s === 'drag') {
        this.vx = 0; this.vy = 0;
      } else if (s === 'fall') {
        this.vx = 0; /* vy accumulates via gravity */
      } else if (s === 'jump') {
        // vx,vy set in jumpOffWall()
      }

      if (switching) { this.frame = 0; this.nextFrameAt = 0; this.showFrame(); }
    }

    // ====== MOUSE DRAG ======
    onMouseDown(e) {
      if (e.button === 2) return;
      e.preventDefault();
      this.setState('drag', {force:true});
      this.dragDX = e.clientX - this.x;
      this.dragDY = e.clientY - this.y;
      document.addEventListener('mousemove', this._onMove);
      document.addEventListener('mouseup',   this._onUp);
    }
    onMouseMove(e) {
      if (this.state !== 'drag') return;
      this.x = clamp(e.clientX - this.dragDX, 0, Math.max(0, window.innerWidth  - this.width()));
      this.y = clamp(e.clientY - this.dragDY, 0, Math.max(0, window.innerHeight - this.height()));
      this.dir = (e.movementX < 0) ? 'left' : (e.movementX > 0 ? 'right' : this.dir);
      this.render();
    }
    onMouseUp() {
      document.removeEventListener('mousemove', this._onMove);
      document.removeEventListener('mouseup',   this._onUp);
      if (this.y < this.groundY() - 2) this.setState('fall', {force:true});
      else this.setState('idle', {force:true});
    }

    // ====== INTERACTION: Context menu with safe placement (1) ======
    onContextMenu(e) {
      e.preventDefault();
      this.menu?.remove();

      const m = document.createElement('div');
      Object.assign(m.style, {
        position:'fixed', left: e.clientX+'px', top: e.clientY+'px',
        background:'#1f2937', color:'#fff',
        border:'1px solid #374151', borderRadius:'8px',
        padding:'6px', zIndex:String(Z), font:'12px/1 ui-sans-serif,system-ui',
        minWidth:'180px', boxShadow:'0 8px 24px rgba(0,0,0,.35)'
      });

      const add = (label, fn) => {
        const b = document.createElement('div');
        b.textContent = label;
        Object.assign(b.style, { padding:'6px 8px', cursor:'pointer', borderRadius:'6px' });
        b.onmouseenter = () => (b.style.background = '#111827');
        b.onmouseleave = () => (b.style.background = 'transparent');
        b.onclick = () => { fn(); m.remove(); this.menu = null; };
        m.appendChild(b);
      };

      // random toggle
      add(this.randomMode ? 'Random: On' : 'Random: Off', () => this.randomMode = !this.randomMode);

      // (3) force overrides re-apply velocities
      add('Walk Left',  () => { this.dir = 'left';  this.setState('walk', {force:true}); });
      add('Walk Right', () => { this.dir = 'right'; this.setState('walk', {force:true}); });

      // (4) gating climb/cling to walls
      const tryClimbUp   = () => { if (this.nearLeftWall() || this.nearRightWall()) this.setState('climb_up',   {force:true});  else console.log('[Shimeji] Move to a wall to climb.'); };
      const tryClimbDown = () => { if (this.nearLeftWall() || this.nearRightWall()) this.setState('climb_down', {force:true});  else console.log('[Shimeji] Move to a wall to climb.'); };
      const tryCling     = () => { if (this.nearLeftWall() || this.nearRightWall()) this.setState('cling',      {force:true});  else console.log('[Shimeji] Move to a wall to cling.'); };

      add('Climb Up',    tryClimbUp);
      add('Climb Down',  tryClimbDown);
      add('Cling (hold)',tryCling);

      add('Idle (ground)', () => this.setState('idle', {force:true}));
      add('Reset to ground', () => { this.snapToGround(); this.setState('idle', {force:true}); });

      document.body.appendChild(m);
      this.menu = m;

      // (1) clamp menu inside viewport (after it renders so we know its size)
      requestAnimationFrame(() => {
        const rect = m.getBoundingClientRect();
        let L = rect.left, T = rect.top;
        const vw = window.innerWidth, vh = window.innerHeight;

        if (rect.right > vw - MENU_MARGIN) L = vw - rect.width - MENU_MARGIN;
        if (rect.bottom > vh - MENU_MARGIN) T = vh - rect.height - MENU_MARGIN;
        if (L < MENU_MARGIN) L = MENU_MARGIN;
        if (T < MENU_MARGIN) T = MENU_MARGIN;

        m.style.left = `${Math.round(L)}px`;
        m.style.top  = `${Math.round(T)}px`;
      });

      // close on outside click/scroll
      setTimeout(() => {
        const close = (ev) => { if (!m.contains(ev.target)) { m.remove(); this.menu = null; } };
        document.addEventListener('mousedown', close, { once:true });
        document.addEventListener('scroll',   close, { once:true });
      }, 0);
    }

    // ====== AI ======
    ai(now) {
      if (!this.randomMode) return;
      if (this.state === 'drag' || this.state === 'fall' || this.state === 'jump') return;

      // Ground logic
      if (this.state === 'idle' || this.state === 'walk') {
        // If walking and touch wall, start climbing up and pin with overlap
        if (this.state === 'walk' && (this.nearLeftWall() || this.nearRightWall())) {
          if (this.nearLeftWall()) this.pinToLeftWall();
          if (this.nearRightWall()) this.pinToRightWall();
          this.setState('climb_up', {force:true});
          return;
        }
        if (now >= this.nextDecisionAt) {
          if (chance(0.45)) this.setState('idle', {force:true});
          else { this.dir = chance(0.5) ? 'left' : 'right'; this.setState('walk', {force:true}); }
        }
        return;
      }

      // Climb logic
      if (this.state === 'climb_up' || this.state === 'climb_down') {
        if (now >= this.nextClimbAt) {
          const r = Math.random();
          if (r < 0.50) this.scheduleClimbDecision(now);                      // continue
          else if (r < 0.80) this.setState('cling', {force:true});            // hold
          else if (r < 0.90) this.setState(this.state==='climb_up'?'climb_down':'climb_up', {force:true}); // reverse
          else this.jumpOffWall();                                            // jump
        }
        return;
      }

      // Cling
      if (this.state === 'cling') {
        if (now >= this.clingUntil) {
          const r = Math.random();
          if (r < 0.40) this.setState('climb_up', {force:true});
          else if (r < 0.80) this.setState('climb_down', {force:true});
          else this.jumpOffWall();
        }
        return;
      }
    }

    jumpOffWall() {
      const away = this.nearLeftWall() ? 1 : -1;
      this.vx = away * JUMP_VX;
      this.vy = JUMP_VY;
      this.setState('jump', {force:true});
    }

    // ====== PHYSICS ======
    updatePhysics(dt) {
      if (this.state === 'walk') {
        this.x += this.vx * dt;
        // hit walls → start climbing and pin with overlap
        if (this.leftGap() <= 0)  { this.pinToLeftWall();  this.setState('climb_up', {force:true}); }
        if (this.rightGap() <= 0) { this.pinToRightWall(); this.setState('climb_up', {force:true}); }
      }
      else if (this.state === 'climb_up' || this.state === 'climb_down') {
        // keep pinned to wall with overlap
        if (this.nearLeftWall())  this.pinToLeftWall();
        if (this.nearRightWall()) this.pinToRightWall();

        this.y += this.vy * dt;

        // top: choose cling / down / jump
        if (this.y <= 0) {
          this.y = 0;
          const r = Math.random();
          if (r < 0.50)      this.setState('cling', {force:true});
          else if (r < 0.80) this.setState('climb_down', {force:true});
          else               this.jumpOffWall();
          return;
        }
        // bottom: stop climbing
        if (this.y >= this.groundY()) {
          this.y = this.groundY();
          this.setState('idle', {force:true});
          return;
        }
      }
      else if (this.state === 'cling') {
        // stay pinned
        if (this.nearLeftWall())  this.pinToLeftWall();
        if (this.nearRightWall()) this.pinToRightWall();
      }
      else if (this.state === 'fall') {
        this.vy += GRAVITY * dt;
        this.y  += this.vy * dt;
        if (this.y >= this.groundY()) {
          this.y = this.groundY(); this.vy = 0;
          this.setState('idle', {force:true});
        }
      }
      else if (this.state === 'jump') {
        this.vy += GRAVITY * dt;
        this.y  += this.vy * dt;
        this.x  += this.vx * dt;
        this.vx *= Math.pow(AIR_FRICTION, dt * 60);

        // soft horizontal bounce inside viewport
        if (this.x <= 0) { this.x = 0; this.vx = Math.abs(this.vx); }
        if (this.x + this.width() >= window.innerWidth) {
          this.x = window.innerWidth - this.width();
          this.vx = -Math.abs(this.vx);
        }
        if (this.y >= this.groundY()) {
          this.y = this.groundY(); this.vy = 0; this.vx = 0;
          this.setState('idle', {force:true});
        }
      }
    }

    // frames
    currentFrames() {
      if (this.state === 'walk')                 return ASSETS.walk;
      if (this.state === 'climb_up')             return ASSETS.climb;
      if (this.state === 'climb_down')           return ASSETS.climb;
      if (this.state === 'cling')                return ASSETS.climb;
      if (this.state === 'drag')                 return ASSETS.drag;
      if (this.state === 'fall' || this.state === 'jump') return ASSETS.fall;
      return ASSETS.idle;
    }
    advanceFrame(now) {
      const arr = this.currentFrames();
      const len = arr.length;

      const single = (this.state === 'idle' || this.state === 'drag' || this.state === 'fall' || this.state === 'jump');
      if (single) {
        this.frame = 0;
        this.nextFrameAt = now + FRAME_MS;
        this.showFrame();
        return;
      }
      if (this.state === 'cling') {
        this.frame = this.clingFrame % len;
        this.nextFrameAt = now + FRAME_MS;
        this.showFrame();
        return;
      }
      if (now >= this.nextFrameAt) {
        this.frame = (this.frame + 1) % len;
        this.nextFrameAt = now + FRAME_MS;
        this.showFrame();
      }
    }

    // mirroring: base art faces LEFT; flip for right-facing
    showFrame() {
      const arr = this.currentFrames();
      const idx = (this.state === 'cling') ? this.clingFrame : this.frame;
      this.img.src = arr[idx] || arr[0];

      // Decide facing: base art faces LEFT; flip when facing RIGHT
      let faceRight = false;
      if (this.state === 'walk') faceRight = (this.dir === 'right');
      if (this.state === 'climb_up' || this.state === 'climb_down' || this.state === 'cling') {
        // face toward the wall
        faceRight = this.nearRightWall();
      }
      if (this.state === 'jump') faceRight = (this.vx > 0);

      // Apply mirror
      this.img.style.transform = faceRight ? 'scaleX(-1)' : 'scaleX(1)';

      // NEW: push the image a little INTO the wall for more natural “grip”
      // (use margin-left so it’s independent of transforms & physics)
      let push = 0;
      if (this.state === 'climb_up' || this.state === 'climb_down' || this.state === 'cling') {
        if (this.nearRightWall())      push =  +CLIMB_IMG_PUSH;  // move PNG a bit right
        else if (this.nearLeftWall())  push =  -CLIMB_IMG_PUSH;  // move PNG a bit left
      }
      this.img.style.marginLeft = `${push}px`;
    }


    render() {
      this.root.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
    }

    tick(now) {
      const dt = Math.min((now - this._prevNow) / 1000, MAX_DT);
      this._prevNow = now;
      this.ai(now);
      this.updatePhysics(dt);
      this.advanceFrame(now);
      this.render();
      this._raf = requestAnimationFrame((t) => this.tick(t));
    }

    destroy() {
      cancelAnimationFrame(this._raf);
      window.removeEventListener('resize', this._onResize);
      this.root.removeEventListener('mousedown', this._onDown);
      this.root.removeEventListener('contextmenu', this._onCtx);
      this.menu?.remove();
      this.root.remove();
    }
  }

  class ShimejiManager {
    constructor() {
      this.instance = null;
      chrome?.runtime?.onMessage?.addListener?.(((msg) => {
        if (!msg || !msg.type) return;
        if (msg.type === 'SHIMEJI_SPAWN')   this.spawn();
        if (msg.type === 'SHIMEJI_DESPAWN') this.despawn();
        if (msg.type === 'SHIMEJI_TOGGLE_RANDOM' && this.instance) this.instance.randomMode = !!msg.value;
        if (msg.type === 'SHIMEJI_RESET_GROUND' && this.instance) { this.instance.snapToGround(); this.instance.setState('idle', {force:true}); }
      }));
      chrome?.storage?.local?.get?.('settings', (s) => { if (s?.settings?.shimejiEnabled) this.spawn(); });
    }
    spawn(){ if (!this.instance) this.instance = new Shimeji(); }
    despawn(){ if (this.instance) { this.instance.destroy(); this.instance = null; } }
  }

  window.__SHIMEJI_MANAGER__ = new ShimejiManager();
})();
