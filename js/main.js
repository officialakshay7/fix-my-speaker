'use strict';

// Year
document.querySelectorAll('.js-year').forEach(e => e.textContent = new Date().getFullYear());

// Mobile nav
(function(){
  const btn = document.getElementById('mobileMenuBtn');
  const nav = document.getElementById('mobileNav');
  if(!btn||!nav) return;
  btn.addEventListener('click',()=>{
    const open = nav.classList.toggle('open');
    document.body.style.overflow = open ? 'hidden' : '';
  });
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    nav.classList.remove('open');
    document.body.style.overflow='';
  }));
})();

// FAQ
document.querySelectorAll('.faq-q').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const item = btn.closest('.faq-item');
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i=>i.classList.remove('open'));
    if(!wasOpen) item.classList.add('open');
  });
});

// Contact form
(function(){
  const form = document.getElementById('contactForm');
  if(!form) return;
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const btn = form.querySelector('[type=submit]');
    btn.textContent = 'Sending…'; btn.disabled = true;
    setTimeout(()=>{
      form.style.display='none';
      const s = document.getElementById('formSuccess');
      if(s) s.classList.add('show');
    },1000);
  });
})();

// ── AUDIO ENGINE ──
class SpeakerTool {
  constructor(id){
    this.root = document.getElementById(id);
    if(!this.root) return;
    this.running=false; this.mode='sound';
    this.ctx=null; this.gain=null; this.osc=null;
    this.raf=null; this.interval=null;
    this.startTime=null; this.duration=15000;
    this.DASH=439; // 2*PI*70 ≈ 439.8

    this.soundFreqs=[165,200,250,300,400,500,650,800,1000,800,650,400,300,200,165];
    this.vibFreqs=[80,100,120,150,130,100,80];
    this.vibGains=[0.9,0.7,0.9,0.5,0.9,0.7,0.9];

    this.$tabs   = this.root.querySelectorAll('.mode-tab');
    this.$ring   = this.root.querySelector('.ring-progress');
    this.$pct    = this.root.querySelector('.ring-pct');
    this.$btn    = this.root.querySelector('.eject-btn');
    this.$dot    = this.root.querySelector('.status-dot');
    this.$status = this.root.querySelector('.status-text-val');
    this.$vol    = this.root.querySelector('.vol-slider');
    this.$volval = this.root.querySelector('.vol-val');

    this.$tabs.forEach(t=>t.addEventListener('click',()=>{
      if(this.running) this.stop();
      this.$tabs.forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      this.mode = t.dataset.mode;
    }));

    if(this.$vol){
      this.$vol.addEventListener('input',()=>{
        if(this.$volval) this.$volval.textContent = this.$vol.value+'%';
        if(this.gain) this.gain.gain.value = +this.$vol.value/100*0.6;
      });
    }

    this.$btn.addEventListener('click',()=>{
      if(this.running) this.stop(); else this.start();
    });
  }

  vol(){ return this.$vol ? +this.$vol.value/100*0.6 : 0.5; }

  async start(){
    if(!this.ctx) this.ctx = new(window.AudioContext||window.webkitAudioContext)();
    if(this.ctx.state==='suspended') await this.ctx.resume();

    this.running=true; this.startTime=performance.now();
    this.$btn.textContent='⏹ Stop Cleaning';
    this.$btn.classList.add('running');
    if(this.$dot) this.$dot.classList.add('on');
    this.setStatus('Cleaning in progress…');

    this.gain = this.ctx.createGain();
    this.gain.gain.value = this.vol();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value=-18; comp.ratio.value=8;
    this.gain.connect(comp); comp.connect(this.ctx.destination);

    this.osc = this.ctx.createOscillator();
    this.osc.type = this.mode==='sound' ? 'sine' : 'square';
    this.osc.frequency.value = this.mode==='sound' ? this.soundFreqs[0] : this.vibFreqs[0];
    this.osc.connect(this.gain);
    this.osc.start();

    let idx=0;
    const freqs = this.mode==='sound' ? this.soundFreqs : this.vibFreqs;
    const step = this.mode==='sound' ? 1500 : 900;

    this.interval = setInterval(()=>{
      if(!this.running) return;
      idx=(idx+1)%freqs.length;
      const now=this.ctx.currentTime;
      this.osc.frequency.exponentialRampToValueAtTime(freqs[idx], now+0.4);
      if(this.mode==='vibrate'){
        this.gain.gain.setTargetAtTime(this.vibGains[idx]*this.vol(), now, 0.15);
      }
    }, step);

    const tick=(now)=>{
      if(!this.running) return;
      const p = Math.min((now-this.startTime)/this.duration,1);
      const offset = this.DASH - this.DASH*p;
      if(this.$ring) this.$ring.style.strokeDashoffset = offset;
      if(this.$pct) this.$pct.textContent = Math.round(p*100)+'%';
      if(p>=1){ this.finish(); return; }
      this.raf=requestAnimationFrame(tick);
    };
    this.raf=requestAnimationFrame(tick);
  }

  finish(){
    this.running=false; this.stopAudio();
    if(this.$ring) this.$ring.style.strokeDashoffset=0;
    if(this.$pct) this.$pct.textContent='100%';
    this.$btn.textContent='▶ Run Again';
    this.$btn.classList.remove('running');
    if(this.$dot) this.$dot.classList.remove('on');
    this.setStatus('✓ Done! Test your speaker now.');
    setTimeout(()=>{
      if(!this.running){
        if(this.$ring) this.$ring.style.strokeDashoffset=this.DASH;
        if(this.$pct) this.$pct.textContent='0%';
        this.$btn.textContent='▶ Press to Eject Water';
        this.setStatus('Ready — press the button to start');
      }
    },4000);
  }

  stop(){
    this.running=false;
    if(this.raf) cancelAnimationFrame(this.raf);
    this.stopAudio();
    if(this.$ring) this.$ring.style.strokeDashoffset=this.DASH;
    if(this.$pct) this.$pct.textContent='0%';
    this.$btn.textContent='▶ Press to Eject Water';
    this.$btn.classList.remove('running');
    if(this.$dot) this.$dot.classList.remove('on');
    this.setStatus('Ready — press the button to start');
  }

  stopAudio(){
    if(this.interval){clearInterval(this.interval);this.interval=null;}
    if(this.osc){try{this.osc.stop();this.osc.disconnect();}catch(e){}this.osc=null;}
    if(this.gain){try{this.gain.disconnect();}catch(e){}this.gain=null;}
  }

  setStatus(t){ if(this.$status) this.$status.textContent=t; }
}

document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-tool-id]').forEach(el=>{
    new SpeakerTool(el.dataset.toolId);
  });
});
