# Zvukovi krčme: sintetizirano offline (lutnja, drvo, novčići, zvona, bubanj, magija)
import numpy as np, subprocess, os, sys
from scipy.signal import butter, sosfilt
SR = 44100
OUT = os.path.join(os.path.dirname(__file__), 'out'); os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)
def T(d): return np.arange(int(SR * d)) / SR
def z(d): return np.zeros(int(SR * d))
def mix(*parts):
    n = max(len(p) + int(SR * o) for o, p in parts); y = np.zeros(n)
    for o, p in parts: i = int(SR * o); y[i:i + len(p)] += p
    return y
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'lowpass', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'highpass', fs=SR, output='sos'), x)
def noise(d): return rng.standard_normal(int(SR * d))
def expd(d, tau): return np.exp(-T(d) / tau)
def att(x, a=0.003):
    n = max(1, int(SR * a)); x = x.copy(); x[:n] *= np.linspace(0, 1, n); return x
def fadeout(x, d=0.02):
    n = min(len(x), int(SR * d)); x = x.copy(); x[-n:] *= np.linspace(1, 0, n); return x
def mf(m): return 440 * 2 ** ((m - 69) / 12)
# lutnja: Karplus-Strong s mekim trzajem
def pluck(f, d=1.2, bright=0.5, damp=0.996, vol=1.0):
    n = int(SR * d); p = max(2, int(SR / f)); buf = lp(rng.uniform(-1, 1, p * 3), 1500 + bright * 6000)[-p:]
    y = np.zeros(n); b = buf.copy(); idx = 0
    for i in range(n):
        y[i] = b[idx]; nxt = (idx + 1) % p
        b[idx] = damp * 0.5 * (b[idx] + b[nxt]); idx = nxt
    body = bp(y, 90, 3200) * 0.7 + lp(y, 900) * 0.5  # drveno tijelo
    return fadeout(att(body * vol, 0.002), min(0.12, d * 0.3))
def strum(midis, gap=0.03, d=1.4, bright=0.55, vol=0.8):
    return mix(*[(i * gap, pluck(mf(m), d, bright, vol=vol)) for i, m in enumerate(midis)])
# drvo: kratki modalni udarac
def wood(f=260, d=0.12, vol=1.0, click=0.6):
    t = T(d); y = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (0.035 / r ** 0.6)) for r, a in [(1, 1), (2.76, 0.45), (5.4, 0.2)])
    y += click * bp(noise(d), 1500, 6000) * expd(d, 0.004)
    return att(y * vol, 0.001)
# metal: novčić / zvono (neharmonijski parcijali)
def metal(f, d, parts, vol=1.0, tau=0.3, strike=0.3):
    t = T(d); y = sum(a * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6)) * np.exp(-t / (tau / r ** 0.5)) for r, a in parts)
    y += strike * hp(noise(d), 4000) * expd(d, 0.003)
    return fadeout(att(y * vol, 0.0008), min(0.15, d * 0.3))
COIN = [(1, 1), (1.53, 0.7), (2.42, 0.6), (3.18, 0.35), (4.1, 0.2)]
BELL = [(0.5, 0.5), (1, 1), (1.19, 0.5), (1.5, 0.4), (2, 0.35), (2.5, 0.25), (3.0, 0.2), (4.07, 0.12)]
def coin(f=2300, d=0.5, vol=0.6): return metal(f, d, COIN, vol, tau=0.12, strike=0.25)
def bell(f=880, d=1.6, vol=0.7, tau=0.9): return metal(f, d, BELL, vol, tau=tau, strike=0.1)
# okvirni bubanj (bodhran)
def drum(f=95, d=0.5, vol=1.0, snap=0.25):
    t = T(d); fr = f * (1 + 0.6 * np.exp(-t / 0.02)); ph = 2 * np.pi * np.cumsum(fr) / SR
    y = np.sin(ph) * np.exp(-t / 0.13) + snap * lp(noise(d), 2500) * expd(d, 0.02)
    return att(y * vol, 0.001)
def tamb(d=0.35, vol=0.5):
    y = hp(noise(d), 6000) * (expd(d, 0.06)) ; jing = sum(np.sin(2 * np.pi * f * T(d)) * expd(d, 0.08) for f in (5200, 6900, 8300)) * 0.15
    return att((y + jing) * vol, 0.002)
def shaker(d=0.4, vol=0.4):
    env = np.sin(np.pi * np.linspace(0, 1, int(SR * d))) ** 2
    return hp(noise(d), 5000) * env * vol
# flauta (blokflauta): sinus + dah + vibrato
def flute(m0, m1, d, vol=0.5, vib=5.5):
    t = T(d); f = mf(m0) * (mf(m1) / mf(m0)) ** (t / d); f = f * (1 + 0.006 * np.sin(2 * np.pi * vib * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)
    y += 0.12 * bp(noise(d), 1200, 5000)
    env = np.minimum(1, t / 0.06) * np.minimum(1, (d - t) / 0.12)
    return y * env * vol
# limena truba (fanfara): pila kroz niski propust + vibrato
def horn(m, d, vol=0.5):
    t = T(d); f = mf(m) * (1 + 0.004 * np.sin(2 * np.pi * 5.2 * t)); ph = 2 * np.pi * np.cumsum(f) / SR
    y = sum((1 / k) * np.sin(k * ph) for k in range(1, 12))
    bright = 1200 + 2400 * np.minimum(1, t / 0.08)
    y = lp(y, 2600) * 0.7 + lp(y, 1100) * 0.6
    env = np.minimum(1, t / 0.035) * np.minimum(1, np.maximum(0, (d - t)) / 0.08)
    return y * env * vol
LEVEL = {'tap': -23, 'tick': -24, 'pop': -22, 'whoosh': -24, 'confirm': -21, 'score': -20, 'beep': -21}
def save(name, y, peak=0.95):
    y = np.asarray(y, float); y = fadeout(y, 0.015); y = y - np.mean(y)
    # glasnoća po RMS-u aktivnog dijela (gdje je signal iznad -40 dB vrha)
    a = np.abs(y); act = y[a > a.max() * 0.01] if a.max() > 0 else y
    rms = np.sqrt(np.mean(act ** 2)) or 1e-9
    g = 10 ** (LEVEL.get(name, -18) / 20) / rms; y = y * g
    pk = np.max(np.abs(y))
    if pk > peak: y = np.tanh(y / pk * 1.2) / np.tanh(1.2) * peak  # mekano ograničenje
    print('  ', name, 'gain', round(20 * np.log10(g), 1), 'dB, vrh', round(min(pk, peak), 2))
    wav = os.path.join(OUT, name + '.wav')
    import wave
    with wave.open(wav, 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '96k', os.path.join(OUT, name + '.mp3')], check=True)
    os.remove(wav)

def build():
    S = {}
    # --- sučelje ---
    S['tap'] = wood(420, 0.09, 1, 0.5)
    S['pop'] = mix((0, wood(300, 0.14, 1, 0.8)), (0.0, 0.3 * metal(1800, 0.12, COIN[:2], tau=0.04, strike=0)))
    S['confirm'] = mix((0, pluck(mf(64), 0.7, 0.6)), (0.07, pluck(mf(69), 0.9, 0.65)))
    S['whoosh'] = (lambda d: bp(noise(d), 300, 2600) * np.sin(np.pi * np.linspace(0, 1, int(SR * d))) ** 3)(0.45)
    S['tick'] = wood(1250, 0.05, 0.8, 0.7)
    S['beep'] = bell(1568, 0.7, 0.7, 0.35)
    S['timeup'] = mix((0, bell(523, 2.2, 1, 1.0)), (0, drum(70, 0.6, 0.7)), (0.35, 0.6 * bell(523, 1.8, 1, 0.8)))
    # --- bodovi i ishodi ---
    S['score'] = mix((0, coin(2350)), (0.09, coin(2900, 0.5, 0.5)), (0.17, coin(2600, 0.6, 0.45)))
    S['correct'] = mix((0, strum([57, 64, 69, 73, 76], 0.028, 1.6, 0.65)), (0.12, 0.5 * bell(1760, 1.2, 1, 0.5)), (0.0, 0.5 * coin(2700)))
    S['wrong'] = mix((0, wood(150, 0.25, 1.2, 0.4)), (0.02, pluck(mf(45), 0.9, 0.3, 0.993)), (0.16, pluck(mf(44), 1.0, 0.3, 0.992)))
    S['step'] = mix((0, drum(110, 0.3, 0.9, 0.35)), (0, wood(180, 0.15, 0.6, 0.6)))
    # --- moći ---
    def sparkle(d, f0=2000, f1=6000, n=22, vol=0.35):
        y = z(d)
        for i in range(n):
            o = rng.uniform(0, d * 0.75); f = rng.uniform(f0, f1); s = metal(f, 0.25, [(1, 1), (2.01, 0.3)], tau=0.05, strike=0) * vol
            i0 = int(o * SR); y[i0:i0 + len(s)] += s[:len(y) - i0]
        return y
    S['zap'] = mix((0, sparkle(0.6)), (0, 0.5 * bp(noise(0.5), 2000, 7000) * expd(0.5, 0.12)), (0, 0.3 * flute(84, 96, 0.35, 1)))
    S['freeze'] = mix((0, sparkle(0.9, 3000, 8000, 30, 0.45)), (0, 0.6 * metal(2637, 1.0, [(1, 1), (2.32, 0.6), (3.7, 0.4), (5.1, 0.2)], tau=0.4, strike=0.2)))
    def crackle(d, n=7, vol=1.0):
        y = z(d)
        for i in range(n):
            o = rng.uniform(0, d * 0.7); s = hp(noise(0.03), 1800) * expd(0.03, 0.004) * rng.uniform(0.5, 1)
            i0 = int(o * SR); y[i0:i0 + len(s)] += s
        return y * vol
    S['crack'] = mix((0, crackle(0.25, 6)), (0, 0.6 * wood(900, 0.08, 1, 1)))
    def squelch(d, f0, f1, vol=1):
        t = T(d); f = f0 * (f1 / f0) ** (t / d); ph = 2 * np.pi * np.cumsum(f) / SR
        return lp(np.sin(ph) * (0.6 + 0.4 * np.sign(np.sin(ph * 0.5))), 1200) * expd(d, d / 3) * vol
    S['splat'] = mix((0, lp(noise(0.35), 900) * expd(0.35, 0.07) * 1.2), (0.0, squelch(0.25, 320, 90, 0.8)), (0.08, squelch(0.12, 500, 200, 0.4)))
    S['squish'] = mix((0, squelch(0.18, 700, 180, 0.9)), (0, 0.5 * bp(noise(0.15), 800, 3000) * expd(0.15, 0.03)), (0.12, crackle(0.12, 3, 0.4)))
    S['boom'] = mix((0, lp(noise(1.4), 400) * expd(1.4, 0.35) * 1.4), (0, drum(48, 1.0, 1.2, 0.6)), (0.05, crackle(0.5, 10, 0.25)))
    # --- trenuci (Tavern Director) ---
    S['stingSmall'] = mix((0, tamb(0.3, 0.6)), (0.02, pluck(mf(76), 0.8, 0.7)))
    S['stingUp'] = mix(*[(i * 0.07, pluck(mf(m), 1.0, 0.7, vol=0.9)) for i, m in enumerate([62, 66, 69, 74])], (0, shaker(0.35, 0.4)), (0.28, tamb(0.4, 0.6)))
    S['stingRise'] = mix((0, flute(69, 81, 0.9, 0.7)), (0.75, strum([57, 64, 69, 73], 0.025, 1.2, 0.7, 0.7)), (0.75, tamb(0.4, 0.5)))
    S['stingTension'] = mix((0, drum(70, 0.5, 1)), (0.32, drum(70, 0.5, 0.8)), (0.64, drum(66, 0.7, 1.1)), (0.0, 0.35 * horn(45, 1.2, 0.8)), (0.0, 0.25 * horn(46, 1.2, 0.8)))
    def clash(vol=1): return mix((0, metal(1900, 1.0, [(1, 1), (1.41, 0.8), (2.23, 0.6), (3.03, 0.4), (4.7, 0.25)], vol, tau=0.35, strike=0.8)), (0, 0.6 * hp(noise(0.08), 2500) * expd(0.08, 0.015)))
    S['stingDuel'] = mix((0, drum(80, 0.5, 1)), (0.18, clash(0.9)), (0.5, drum(80, 0.4, 0.8)), (0.62, clash(0.7)))
    # --- pobjeda: srednjovjekovna fanfara (D-dur) s bubnjem ---
    fan = [(0, 62, 0.18), (0.2, 62, 0.18), (0.4, 62, 0.18), (0.6, 69, 0.55), (1.2, 66, 0.25), (1.45, 69, 0.25), (1.7, 74, 1.3)]
    S['fanfare'] = mix(*[(o, horn(m, d, 0.6)) for o, m, d in fan], *[(o, horn(m - 12, d, 0.35)) for o, m, d in fan[3:]],
                       (0, drum(90, 0.4, 0.7)), (0.6, drum(80, 0.6, 1)), (1.7, drum(70, 0.9, 1.1)), (1.7, tamb(0.6, 0.5)), (1.7, strum([50, 57, 62, 66, 69, 74], 0.03, 2.0, 0.6, 0.6)))
    VOL = {}
    for k, y in S.items():
        save(k, y); print(k, round(len(y) / SR, 2), 's')

if __name__ == '__main__':
    build()
