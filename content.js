// ===== AKSIS → موادي | Content Script =====

function extractSchedule() {
  const results = [];
  // جدول الدروس - Ders Programı
  // AKSIS يعرض الجدول في جدول HTML
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      if (cells.length >= 3) {
        const text = Array.from(cells).map(c => c.innerText.trim());
        // نحاول نستخرج: اسم المادة، اليوم، الوقت، القاعة، الأستاذ
        if (text[0] && text[0].length > 2 && !text[0].includes('Ders')) {
          results.push({
            name: text[0] || '',
            day: text[1] || '',
            time: text[2] || '',
            room: text[3] || '',
            doc: text[4] || ''
          });
        }
      }
    });
  });
  // أيضاً نحاول div-based layout
  document.querySelectorAll('[class*="ders"], [class*="course"], [class*="lesson"]').forEach(el => {
    const name = el.querySelector('[class*="name"], [class*="ad"]')?.innerText?.trim();
    if (name) {
      results.push({ name, day: '', time: '', room: '', doc: '' });
    }
  });
  return results;
}

function extractGrades() {
  const grades = [];
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    const rows = table.querySelectorAll('tr');
    rows.forEach((row, i) => {
      if (i === 0) return; // skip header
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const text = Array.from(cells).map(c => c.innerText.trim());
        if (text[0] && text[0].length > 1) {
          grades.push({
            course: text[0] || '',
            midterm: text[1] || '',
            final: text[2] || '',
            grade: text[3] || '',
            status: text[4] || ''
          });
        }
      }
    });
  });
  return grades;
}

function extractMessages() {
  const messages = [];
  // Yazışma Listesi
  document.querySelectorAll('tr, [class*="mesaj"], [class*="message"], [class*="yazisma"]').forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 2) {
      const text = Array.from(cells).map(c => c.innerText.trim());
      if (text[0] && text[0].length > 1) {
        messages.push({
          from: text[0] || '',
          subject: text[1] || '',
          date: text[2] || '',
          preview: text[3] || ''
        });
      }
    }
  });
  return messages;
}

function detectPage() {
  const url = window.location.href;
  const title = document.title;
  const bodyText = document.body?.innerText || '';
  if (url.includes('DersProgrami') || url.includes('ders-programi') || bodyText.includes('Ders Programı')) return 'schedule';
  if (url.includes('SinavSonuc') || url.includes('sinav-sonuc') || bodyText.includes('Sınav Sonuçları')) return 'grades';
  if (url.includes('Yazisma') || url.includes('yazisma') || bodyText.includes('Yazışma')) return 'messages';
  return 'unknown';
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'scrape') {
    const page = detectPage();
    let data = {};
    if (page === 'schedule') data = { type: 'schedule', items: extractSchedule() };
    else if (page === 'grades') data = { type: 'grades', items: extractGrades() };
    else if (page === 'messages') data = { type: 'messages', items: extractMessages() };
    else {
      // حاول اسحب كل شيء
      data = {
        type: 'all',
        schedule: extractSchedule(),
        grades: extractGrades(),
        messages: extractMessages()
      };
    }
    sendResponse({ success: true, page, data });
  }
  return true;
});

// إشعار بصري بسيط عند تحميل الصفحة
const badge = document.createElement('div');
badge.id = 'aksis-ext-badge';
badge.innerHTML = '📚 موادي';
badge.style.cssText = `
  position:fixed;bottom:16px;left:16px;z-index:99999;
  background:linear-gradient(135deg,#d0bcff,#9a82db);
  color:#1c1b1f;padding:8px 14px;border-radius:20px;
  font-family:Cairo,sans-serif;font-size:13px;font-weight:700;
  box-shadow:0 4px 16px rgba(0,0,0,0.3);cursor:pointer;
  transition:opacity 0.3s;
`;
badge.onclick = () => chrome.runtime.sendMessage({ action: 'openPopup' });
document.body?.appendChild(badge);
setTimeout(() => { if (badge) badge.style.opacity = '0.7'; }, 3000);
