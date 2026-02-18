// src/utils/sounds.ts
// أصوات اللعبة باستخدام Web Audio API

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// صوت جرس الإجابة - جرس فندق/استقبال حقيقي (ding!)
export function playBellSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // الضربة الأولى - النغمة الرئيسية للجرس (E6 = 1319 Hz)
    const bellFreq = 1319;

    // النغمة الأساسية - sine نقي
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(bellFreq, now);
    gain1.gain.setValueAtTime(0.5, now);
    gain1.gain.setValueAtTime(0.45, now + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.15, now + 0.3);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 1.2);

    // الهارمونيك الثاني (x2) - يعطي صوت معدني
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(bellFreq * 2.76, now);
    gain2.gain.setValueAtTime(0.2, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.5);

    // الهارمونيك الثالث - لمعان الجرس
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(bellFreq * 5.4, now);
    gain3.gain.setValueAtTime(0.08, now);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now);
    osc3.stop(now + 0.15);

    // ضربة ثانية بعد فترة قصيرة (ding ding!)
    const delay = 0.22;
    const osc4 = ctx.createOscillator();
    const gain4 = ctx.createGain();
    osc4.type = 'sine';
    osc4.frequency.setValueAtTime(bellFreq * 1.5, now + delay); // أعلى قليلاً
    gain4.gain.setValueAtTime(0, now);
    gain4.gain.setValueAtTime(0.35, now + delay);
    gain4.gain.exponentialRampToValueAtTime(0.1, now + delay + 0.3);
    gain4.gain.exponentialRampToValueAtTime(0.01, now + delay + 1.0);
    osc4.connect(gain4);
    gain4.connect(ctx.destination);
    osc4.start(now + delay);
    osc4.stop(now + delay + 1.0);

    // هارمونيك الضربة الثانية
    const osc5 = ctx.createOscillator();
    const gain5 = ctx.createGain();
    osc5.type = 'sine';
    osc5.frequency.setValueAtTime(bellFreq * 1.5 * 2.76, now + delay);
    gain5.gain.setValueAtTime(0, now);
    gain5.gain.setValueAtTime(0.12, now + delay);
    gain5.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.3);
    osc5.connect(gain5);
    gain5.connect(ctx.destination);
    osc5.start(now + delay);
    osc5.stop(now + delay + 0.3);

    // صوت الضربة المعدنية (noise burst)
    const bufferSize = ctx.sampleRate * 0.03;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, now);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(4000, now);
    noiseFilter.Q.setValueAtTime(2, now);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
  } catch (e) {
    console.warn('Could not play bell sound:', e);
  }
}

// صوت طلب البطاقة - صوت سحب/قلب بطاقة مع لمعان سحري
export function playCardSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // صوت السحب/القلب (whoosh) - noise مفلتر
    const whooshLen = ctx.sampleRate * 0.15;
    const whooshBuffer = ctx.createBuffer(1, whooshLen, ctx.sampleRate);
    const whooshData = whooshBuffer.getChannelData(0);
    for (let i = 0; i < whooshLen; i++) {
      const env = Math.sin((i / whooshLen) * Math.PI);
      whooshData[i] = (Math.random() * 2 - 1) * env;
    }
    const whoosh = ctx.createBufferSource();
    whoosh.buffer = whooshBuffer;
    const whooshFilter = ctx.createBiquadFilter();
    whooshFilter.type = 'bandpass';
    whooshFilter.frequency.setValueAtTime(800, now);
    whooshFilter.frequency.linearRampToValueAtTime(3000, now + 0.08);
    whooshFilter.frequency.linearRampToValueAtTime(1500, now + 0.15);
    whooshFilter.Q.setValueAtTime(3, now);
    const whooshGain = ctx.createGain();
    whooshGain.gain.setValueAtTime(0.25, now);
    whoosh.connect(whooshFilter);
    whooshFilter.connect(whooshGain);
    whooshGain.connect(ctx.destination);
    whoosh.start(now);

    // النغمة السحرية - أربيجيو سريع صاعد
    const magicNotes = [784, 988, 1175, 1568]; // G5, B5, D6, G6
    magicNotes.forEach((freq, i) => {
      const t = now + 0.06 + i * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.2 - i * 0.02, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });

    // لمعان عالي (shimmer) - يعطي إحساس السحر
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(3000, now + 0.1);
    shimmer.frequency.exponentialRampToValueAtTime(5000, now + 0.35);
    shimmerGain.gain.setValueAtTime(0, now);
    shimmerGain.gain.setValueAtTime(0.04, now + 0.1);
    shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmer.start(now + 0.1);
    shimmer.stop(now + 0.4);

    // نغمة النهاية - تأكيد
    const endOsc = ctx.createOscillator();
    const endGain = ctx.createGain();
    endOsc.type = 'triangle';
    endOsc.frequency.setValueAtTime(1568, now + 0.3);
    endGain.gain.setValueAtTime(0, now);
    endGain.gain.setValueAtTime(0.15, now + 0.3);
    endGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    endOsc.connect(endGain);
    endGain.connect(ctx.destination);
    endOsc.start(now + 0.3);
    endOsc.stop(now + 0.8);
  } catch (e) {
    console.warn('Could not play card sound:', e);
  }
}
