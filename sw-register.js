  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
      // Kad je stranica učitana i mirna, service worker u pozadini sprema ostatak igre (likovi, grafika, zvukovi) za rad bez mreže.
      // Preskače se uz štednju podataka ili vrlo sporu vezu: tada se datoteke spremaju tek kad zatrebaju.
      const conn = navigator.connection || {};
      if (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')) return;
      setTimeout(() => {
        navigator.serviceWorker.ready.then((reg) => { if (reg.active) reg.active.postMessage({ t: 'precache' }); }).catch(() => {});
      }, 6000);
    });
  }
