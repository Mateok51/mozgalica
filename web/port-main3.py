# Prijenos izmjena s grane main nakon v55 (71ba412, f2d0ede: slike efekata i botova, završni poredak, Novčić utjehe).
import json
SP = '/root/mozgalica'
s = open(SP + '/web/body.html', encoding='utf-8').read()
for i, (old, new) in enumerate(json.load(open(SP + '/web/port-main3.json', encoding='utf-8'))):
    assert s.count(old) == 1, ('port-main3 par', i, s.count(old), old[:100])
    s = s.replace(old, new)
open(SP + '/web/body.html', 'w', encoding='utf-8').write(s)
print('port-main3 OK')

# Novčić utjehe pri bacanju moći: zlatni naziv kao ostale pomoći, novčić se zavrti iznad lika
s = open(SP + '/web/body.html', encoding='utf-8').read()
a = "badge(fa, 'UTJEHA', 'b-dupli'); }"
assert s.count(a) == 1
s = s.replace(a, "badge(fa, 'UTJEHA', 'b-dupli'); fa.insertAdjacentHTML('beforeend', '<img class=\"ccoin\" src=\"ui/pw-utjeha.webp\" alt=\"\" aria-hidden=\"true\" draggable=\"false\">'); const cc = fa.querySelector('.ccoin:last-of-type'); cc.addEventListener('animationend', () => cc.remove()); }")
a = "  .pw-img { object-fit: contain;"
assert s.count(a) == 1
s = s.replace(a, "  .pw-utjeha { color: #f0c66a; }\n"
  "  .ccoin { position: absolute; left: 80%; top: 22%; width: 28%; z-index: 4; pointer-events: none; transform: translateX(-50%); filter: drop-shadow(0 0 12px rgba(255, 205, 90, 0.85)); animation: ccoinPop 1.5s ease-out both; }\n"
  "  @keyframes ccoinPop { 0% { opacity: 0; transform: translate(-50%, 45%) scale(0.3) rotateY(0deg); } 30% { opacity: 1; transform: translate(-50%, -18%) scale(1.12) rotateY(360deg); } 75% { opacity: 1; transform: translate(-50%, -12%) scale(1) rotateY(720deg); } 100% { opacity: 0; transform: translate(-50%, -30%) scale(0.9) rotateY(720deg); } }\n"
  "  @media (prefers-reduced-motion: reduce) { .ccoin { animation: ccoinFade 1.5s ease-out both; } @keyframes ccoinFade { 0%, 100% { opacity: 0; } 20%, 75% { opacity: 1; } } }\n" + a)
open(SP + '/web/body.html', 'w', encoding='utf-8').write(s)
print('port-main3: novčić utjehe pri bacanju OK')

# ponovno iscrtavanje na mobitelu (npr. dodir „Pripremi izdaju“) koristi stvarno proteklo vrijeme faze:
# prije je uzimalo vrijeme iz zadnjeg primljenog stanja pa su se animacije otkrivanja vratile na pitanje
s = open(SP + '/web/body.html', encoding='utf-8').read()
a = "  function phoneV() {\n    const d = S;\n"
assert s.count(a) == 1
s = s.replace(a, "  function phoneV() {\n    const d = S && typeof S.ms === 'number' && lastStateAt ? Object.assign({}, S, { ms: Math.max(0, S.ms - (Date.now() - lastStateAt)) }) : S;\n")
open(SP + '/web/body.html', 'w', encoding='utf-8').write(s)
print('port-main3: iscrtavanje sa stvarnim vremenom faze OK')
