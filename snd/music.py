# Glazba krčme: jig u 6/8 (A-dorski), lutnja + blokflauta + bodhran, petlja bez šava
import numpy as np, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import gen as G
SR = G.SR
BPM = 112                      # udarac = točkasta četvrtinka
E8 = 60 / BPM / 3              # osminka
BAR = E8 * 6
A_MEL = [[(76,2),(74,1),(72,2),(71,1)], [(67,2),(71,1),(74,2),(71,1)], [(69,2),(72,1),(76,2),(72,1)], [(71,3),(67,2),(71,1)],
         [(76,2),(74,1),(72,2),(74,1)], [(79,2),(78,1),(79,1),(76,1),(74,1)], [(72,2),(74,1),(76,1),(74,1),(72,1)], [(71,2),(68,1),(69,3)]]
B_MEL = [[(79,2),(76,1),(72,2),(76,1)], [(79,2),(81,1),(79,2),(74,1)], [(76,2),(81,1),(76,2),(72,1)], [(71,2),(74,1),(76,3)],
         [(77,2),(76,1),(74,2),(72,1)], [(76,2),(74,1),(72,2),(67,1)], [(74,2),(72,1),(71,2),(74,1)], [(71,2),(68,1),(69,3)]]
CH = {'Am': [45, 57, 60, 64], 'G': [43, 55, 59, 62], 'Em': [40, 52, 59, 64], 'C': [36, 55, 60, 64], 'F': [41, 53, 57, 60], 'Dm': [38, 50, 57, 62], 'E': [40, 52, 56, 59]}
A_CH = ['Am', 'G', 'Am', 'Em', 'Am', 'G', 'C', 'E']
B_CH = ['C', 'G', 'Am', 'Em', 'F', 'C', 'Dm', 'E']
FORM = [('A', 0), ('B', 0), ('A', 1), ('B', 1)]
total = len(FORM) * 8 * BAR
N = int(SR * (total + 3)); y = np.zeros(N)
def put(o, s, v=1.0):
    i = int(o * SR); n = min(len(s), N - i); y[i:i + n] += s[:n] * v
bar = 0
for sec, var in FORM:
    mel, chs = (A_MEL, A_CH) if sec == 'A' else (B_MEL, B_CH)
    for b in range(8):
        t0 = bar * BAR; ch = CH[chs[b]]
        # lutnja: bas na 1, akord na 1 i 4 (lagani trzaj), tiha osminka između
        put(t0, G.pluck(G.mf(ch[0]), 1.4, 0.35, 0.995), 0.55)
        put(t0, G.strum(ch[1:], 0.018, 1.0, 0.45, 0.5), 0.5)
        put(t0 + 3 * E8, G.pluck(G.mf(ch[0] + 7 if ch[0] + 7 < 52 else ch[0]), 1.0, 0.35, 0.994), 0.35)
        put(t0 + 3 * E8, G.strum(ch[1:], 0.016, 0.8, 0.45, 0.45), 0.4)
        for k in (1, 2, 4, 5): put(t0 + k * E8, G.pluck(G.mf(ch[1 + (k % 3)] + 12), 0.35, 0.5, 0.99), 0.12 + 0.06 * var)
        # bodhran: DUM-da-da DUM-da-da
        for k, v, f in [(0, 1.0, 90), (1, 0.25, 140), (2, 0.35, 120), (3, 0.75, 100), (4, 0.25, 140), (5, 0.4, 120)]:
            put(t0 + k * E8, G.drum(f, 0.3, 1, 0.3), v * (0.55 + 0.2 * var))
        if var and b % 2 == 1: put(t0 + 3 * E8, G.tamb(0.25, 0.5), 0.35)
        # blokflauta: melodija (u prvom prolazu dio A tiše i kraće, drugi prolaz punije)
        tt = t0
        for m, ln in mel[b]:
            d = ln * E8
            put(tt, G.flute(m, m, d * 0.95, 0.5, 5.0), 0.42 if var else 0.34)
            if var and sec == 'B': put(tt, G.pluck(G.mf(m), d * 1.4, 0.7, 0.993), 0.18)  # lutnja udvaja melodiju
            tt += d
        bar += 1
# bez šava: rep kraja preklopi se na početak
L = int(SR * total); tail = y[L:].copy(); y = y[:L]; y[:len(tail)] += tail
y = G.lp(y, 7000) ; y = y - y.mean()
rms = np.sqrt(np.mean(y ** 2)); y = y * (10 ** (-19 / 20) / rms)
pk = np.max(np.abs(y)); y = np.tanh(y / max(pk, 1e-9) * 1.1) / np.tanh(1.1) * min(0.95, pk) if pk > 0.95 else y
import wave, subprocess
wav = os.path.join(G.OUT, 'music.wav')
with wave.open(wav, 'w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(y, -1, 1) * 32767).astype('<i2').tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '80k', os.path.join(G.OUT, 'music.mp3')], check=True)
os.remove(wav); print('music', round(total, 2), 's')
