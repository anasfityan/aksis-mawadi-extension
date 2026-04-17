let savedData = { schedule: [], grades: [], messages: [] };
let settings = { appUrl: '' };

// ===== INIT =====
async function init() {
  const stored = await chrome.storage.local.get(['aksisData', 'aksisSettings']);
  if (stored.aksisData) savedData = stored.aksisData;
  if (stored.aksisSettings) {
    settings = stored.aksisSettings;
    const urlInput = document.getElementById('appUrl');
    if (urlInput) urlInput.value = settings.appUrl || '';
  }
  checkCurrentPage();
  renderDataTab();
}

// ===== فحص الصفحة الحالية =====
async function checkCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url || '';
    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    const btn = document.getElementById('btnScrape');
    const scrapeContent = document.getElementById('scrape-content');

    if (url.includes('aksis.istanbul.edu.tr') || url.includes('aksis.iuc.edu.tr') || url.includes('aos.istanbul.edu.tr') || url.includes('istanbul.edu.tr')) {
      dot.className = 'status-dot green';
      let pageType = 'الصفحة الرئيسية';
      let icon = '🏛️';
      let hint = 'اذهب لإحدى الصفحات أدناه لاستيراد البيانات';

      if (url.includes('DersProgrami') || url.includes('ders-programi') || url.includes('ders-program') || (tab.title && tab.title.includes('Ders'))) {
        pageType = 'جدول الدروس - Ders Programı';
        icon = '📅';
        hint = 'سيتم استيراد مواد جدولك الدراسي';
      } else if (url.includes('SinavSonuc') || (tab.title && tab.title.includes('Sınav'))) {
        pageType = 'نتائج الاختبارات - Sınav Sonuçları';
        icon = '📊';
        hint = 'سيتم استيراد درجاتك ونتائجك';
      } else if (url.includes('Yazisma') || (tab.title && tab.title.includes('Yazışma'))) {
        pageType = 'الرسائل - Yazışma Listesi';
        icon = '📨';
        hint = 'سيتم استيراد رسائلك';
      }

      txt.textContent = '✅ AKSIS مفتوح | ' + pageType;
      if (btn) btn.disabled = false;

      const schLen = savedData.schedule ? savedData.schedule.length : 0;
      const grLen = savedData.grades ? savedData.grades.length : 0;
      const msLen = savedData.messages ? savedData.messages.length : 0;

      scrapeContent.innerHTML =
        '<div class="card">' +
          '<div class="card-title">' + icon + ' ' + pageType + '</div>' +
          '<div style="font-size:11px;color:#938f99;margin-bottom:12px">' + hint + '</div>' +
          '<div style="font-size:11px;color:#cac4d0"><strong style="color:#d0bcff">صفحات AKSIS:</strong></div>' +
          '<div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">' +
            '<div id="btn-ders" style="padding:8px 10px;background:#2d2b33;border-radius:8px;cursor:pointer;font-size:11px;color:#cac4d0;border:1px solid rgba(202,196,208,0.06);display:flex;align-items:center;gap:8px">📅 Ders Programı <span style="margin-right:auto;color:#938f99;font-size:10px">الجدول</span></div>' +
            '<div id="btn-sinav" style="padding:8px 10px;background:#2d2b33;border-radius:8px;cursor:pointer;font-size:11px;color:#cac4d0;border:1px solid rgba(202,196,208,0.06);display:flex;align-items:center;gap:8px">📊 Sınav Sonuçları <span style="margin-right:auto;color:#938f99;font-size:10px">الدرجات</span></div>' +
            '<div id="btn-yazisma" style="padding:8px 10px;background:#2d2b33;border-radius:8px;cursor:pointer;font-size:11px;color:#cac4d0;border:1px solid rgba(202,196,208,0.06);display:flex;align-items:center;gap:8px">📨 Yazışma Listesi <span style="margin-right:auto;color:#938f99;font-size:10px">الرسائل</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="data-chips">' +
          '<div class="chip ' + (schLen ? 'has-data' : '') + '">📅 ' + schLen + ' درس</div>' +
          '<div class="chip ' + (grLen ? 'has-data' : '') + '">📊 ' + grLen + ' نتيجة</div>' +
          '<div class="chip ' + (msLen ? 'has-data' : '') + '">📨 ' + msLen + ' رسالة</div>' +
        '</div>';

      // ربط أزرار الصفحات بعد إنشائها
      setTimeout(() => {
        const d = document.getElementById('btn-ders');
        const s = document.getElementById('btn-sinav');
        const y = document.getElementById('btn-yazisma');
        if (d) d.addEventListener('click', () => openPage('DersProgrami'));
        if (s) s.addEventListener('click', () => openPage('SinavSonuclari'));
        if (y) y.addEventListener('click', () => openPage('YazismaListesi'));
      }, 100);

    } else {
      dot.className = 'status-dot red';
      txt.textContent = 'افتح AKSIS أولاً لتتمكن من الاستيراد';
      if (btn) btn.disabled = true;
      scrapeContent.innerHTML =
        '<div class="empty">' +
          '<div class="empty-icon">🔒</div>' +
          '<p>هذه الإضافة تعمل فقط على<br><strong>aksis.istanbul.edu.tr</strong><br><br>اضغط "فتح AKSIS" للبدء</p>' +
        '</div>';
    }
  } catch (e) {
    console.error('checkCurrentPage error:', e);
  }
}

// ===== استيراد البيانات =====
async function doScrape() {
  const btn = document.getElementById('btnScrape');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'جاري الاستيراد...';
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeCurrentPage
    });

    const data = results[0] && results[0].result;
    if (!data) throw new Error('لم يتم الحصول على بيانات');

    if (data.type === 'schedule' && data.items && data.items.length) {
      savedData.schedule = data.items;
      showToast('✅ تم استيراد ' + data.items.length + ' درس!');
    } else if (data.type === 'grades' && data.items && data.items.length) {
      savedData.grades = data.items;
      showToast('✅ تم استيراد ' + data.items.length + ' نتيجة!');
    } else if (data.type === 'messages' && data.items && data.items.length) {
      savedData.messages = data.items;
      showToast('✅ تم استيراد ' + data.items.length + ' رسالة!');
    } else {
      showToast('⚠️ لم يتم العثور على بيانات في هذه الصفحة', true);
    }

    await chrome.storage.local.set({ aksisData: savedData });
    renderDataTab();
    checkCurrentPage();

  } catch (e) {
    showToast('❌ خطأ: ' + e.message, true);
    console.error(e);
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = '🔄 استيراد من الصفحة الحالية';
  }
}

// الدالة التي تُنفَّذ داخل صفحة AKSIS
function scrapeCurrentPage() {
  const url = window.location.href;
  const bodyText = document.body ? document.body.innerText : '';

  let type = 'unknown';
  if (url.includes('ders-programi') || url.includes('DersProgrami') || bodyText.includes('Ders Programı') || bodyText.includes('Haftalık Ders')) type = 'schedule';
  else if (url.includes('sinav') || url.includes('SinavSonuc') || bodyText.includes('Sınav Sonuç') || bodyText.includes('Not Ortalaması')) type = 'grades';
  else if (url.includes('yazisma') || url.includes('Yazisma') || bodyText.includes('Yazışma')) type = 'messages';

  // ===== جدول الدروس - AKSIS يستخدم divs =====
  if (type === 'schedule') {
    const items = [];
    // الأعمدة: Pazartesi=1, Salı=2, Çarşamba=3, Perşembe=4, Cuma=5, Cumartesi=6
    const dayNames = ['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const dayArabic = ['', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    // كل بلوك درس له كلاس ders-blogu
    var blocks = document.querySelectorAll('[class*="ders-blogu"]');
    blocks.forEach(function(block) {
      // اسم المادة
      var nameEl = block.querySelector('[class*="ders-adi"]');
      var name = nameEl ? nameEl.innerText.trim() : '';
      if (!name) return;

      // الوقت
      var timeEl = block.querySelector('[class*="ders-detay"][class*="saat"], [class*="ders-detay"]:first-of-type');
      var allDetails = block.querySelectorAll('[class*="ders-detay"]');
      var time = '';
      var doc = '';
      allDetails.forEach(function(d, i) {
        var txt = d.innerText.trim();
        if (txt.includes(':') && txt.includes('-') && txt.match(/\d+:\d+/)) time = txt;
        else if (i > 0 && txt.length > 3) doc = txt;
      });

      // اليوم — نحاول نحدده من موقع العنصر في الصفحة
      var day = '';
      var parent = block.parentElement;
      var colIndex = 0;
      if (parent) {
        var allCols = parent.parentElement ? parent.parentElement.children : [];
        for (var i = 0; i < allCols.length; i++) {
          if (allCols[i] === parent) { colIndex = i; break; }
        }
        if (colIndex > 0 && colIndex < dayNames.length) day = dayArabic[colIndex];
      }

      // الكود من الاسم مثل (FISC3022)
      var codeMatch = name.match(/\(([A-Z]+\d+)\)/);
      var code = codeMatch ? codeMatch[1] : '';
      var cleanName = name.replace(/\([A-Z]+\d+\)/, '').trim();

      items.push({ name: cleanName, code: code, day: day, time: time, doc: doc, room: '' });
    });

    // إذا ما لقى بلوكات، جرب طريقة بديلة
    if (!items.length) {
      var altBlocks = document.querySelectorAll('[class*="ng-star-inserted"]');
      altBlocks.forEach(function(el) {
        var txt = el.innerText.trim();
        if (txt.length > 5 && txt.match(/FISC|HUKUK|MALİYE|İŞLET/i)) {
          items.push({ name: txt, code: '', day: '', time: '', doc: '', room: '' });
        }
      });
    }

    return { type: 'schedule', items: items };
  }

  // ===== الدرجات - AKSIS يعرضها كـ cards =====
  if (type === 'grades') {
    var items = [];
    // كل مادة في card منفصلة
    // نبحث عن أسماء المواد في العناوين
    var courseCards = document.querySelectorAll('.card, [class*="ders-kart"], [class*="sinav-kart"]');
    
    // طريقة 1: البحث عن h3, h4 أو عناوين المواد
    var courseHeaders = document.querySelectorAll('h3, h4, [class*="ders-adi"], [class*="baslik"]');
    var currentCourse = '';
    
    courseHeaders.forEach(function(h) {
      var txt = h.innerText.trim();
      if (txt.length > 3 && !txt.includes('Sınav') && !txt.includes('Başarı') && !txt.includes('Not')) {
        currentCourse = txt;
      }
    });

    // طريقة 2: أفضل — نبحث عن الـ cards التي تحتوي اسم المادة والدرجة
    // في Sınav Sonuçları كل مادة في div منفصل
    var allDivs = document.querySelectorAll('[class*="col"], [class*="card"], [class*="panel"], [class*="kutu"]');
    
    // طريقة 3: الأكثر موثوقية — نبحث عن النمط الحقيقي
    // اسم المادة يظهر كعنوان كبير، والدرجة بجانب Ara Sınav
    var processed = {};
    
    // نأخذ كل النصوص الكبيرة (المواد) ونربطها بالدرجات
    var bodyHTML = document.body.innerHTML;
    
    // البحث عن pattern: اسم المادة ثم Ara Sınav ثم الدرجة
    var allText = document.body.innerText;
    var lines = allText.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
    
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      // المادة: سطر طويل ليس فيه أرقام فقط وليس كلمة مفتاحية
      var isCourseName = line.length > 5 && 
        !line.includes('Ara Sınav') && 
        !line.includes('Başarı') && 
        !line.includes('Ders Listesi') &&
        !line.includes('Dönemi') &&
        !line.includes('Sınav Sonuçları') &&
        !line.match(/^\d+$/) &&
        !line.match(/^\d{2}\.\d{2}\.\d{4}/) &&
        !line.match(/^--$/) &&
        line === line.toUpperCase() && line.length > 4; // أسماء المواد بالحروف الكبيرة
      
      if (isCourseName && !processed[line]) {
        processed[line] = true;
        var courseName = line;
        var midterm = '--';
        var grade = '--';
        
        // ابحث في الأسطر التالية عن الدرجة
        for (var j = i+1; j < Math.min(i+10, lines.length); j++) {
          if (lines[j].includes('Ara Sınav')) {
            // الدرجة في نفس السطر أو التالي
            var scoreMatch = lines[j].match(/\d+/);
            if (scoreMatch) midterm = scoreMatch[0];
            else if (j+1 < lines.length && lines[j+1].match(/^\d+$/)) midterm = lines[j+1];
            else if (j+2 < lines.length && lines[j+2].match(/^\d+$/)) midterm = lines[j+2];
          }
          if (lines[j].includes('Başarı Notu') && j+1 < lines.length) {
            if (!lines[j+1].match(/^--$/) && lines[j+1].match(/\d/)) grade = lines[j+1];
          }
        }
        
        items.push({ course: courseName, midterm: midterm, final: '', grade: grade, status: '' });
      }
      i++;
    }
    
    // إذا ما نجحت الطريقة أعلاه، نجرب نقرأ الجدول
    if (!items.length) {
      document.querySelectorAll('table tr').forEach(function(row) {
        var cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          var r = Array.from(cells).map(function(c) { return c.innerText.trim(); });
          if (r[0] && r[0].length > 1 && !r[0].includes('Ders') && !r[0].includes('Ara Sınav') && !r[0].includes('Başarı')) {
            items.push({ course: r[0], midterm: r[1]||'', final: r[2]||'', grade: r[3]||'', status: r[4]||'' });
          }
        }
      });
    }
    
    return { type: 'grades', items: items };
  }

  // ===== الرسائل =====
  if (type === 'messages') {
    var rows = document.querySelectorAll('table tr');
    var items = [];
    rows.forEach(function(row) {
      var cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        var r = Array.from(cells).map(function(c) { return c.innerText.trim(); });
        if (r[0] && r[0].length > 1 && !r[0].includes('Gönderen')) {
          items.push({ from: r[0]||'', subject: r[1]||'', date: r[2]||'', preview: r[3]||'' });
        }
      }
    });
    return { type: 'messages', items: items };
  }

  return { type: 'unknown', items: [] };
}

// ===== عرض تبويب البيانات =====
function renderDataTab() {
  const el = document.getElementById('data-content');
  if (!el) return;
  const schLen = savedData.schedule ? savedData.schedule.length : 0;
  const grLen = savedData.grades ? savedData.grades.length : 0;
  const msLen = savedData.messages ? savedData.messages.length : 0;
  const total = schLen + grLen + msLen;

  if (!total) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📭</div><p>لا توجد بيانات محفوظة بعد<br>اذهب لتبويب "استيراد" أولاً</p></div>';
    return;
  }

  let html = '';

  if (schLen) {
    html += '<div class="card"><div class="card-title">📅 الجدول الدراسي (' + schLen + ')</div>';
    savedData.schedule.slice(0, 4).forEach(function(c) {
      html += '<div class="card-item"><div class="item-name">' + c.name + '</div><div class="item-sub">' +
        (c.day ? '<span>📆 ' + c.day + '</span>' : '') +
        (c.time ? '<span>🕐 ' + c.time + '</span>' : '') +
        (c.room ? '<span>🚪 ' + c.room + '</span>' : '') +
        '</div></div>';
    });
    if (schLen > 4) html += '<div style="font-size:10px;color:#938f99;text-align:center;padding-top:4px">و ' + (schLen - 4) + ' مواد أخرى...</div>';
    html += '</div>';
  }

  if (grLen) {
    html += '<div class="card"><div class="card-title">📊 النتائج (' + grLen + ')</div>';
    savedData.grades.slice(0, 3).forEach(function(g) {
      html += '<div class="card-item"><div class="item-name">' + g.course + '</div><div class="item-sub">' +
        (g.midterm ? '<span>Vize: ' + g.midterm + '</span>' : '') +
        (g.final ? '<span>Final: ' + g.final + '</span>' : '') +
        (g.grade ? '<span class="badge badge-purple">' + g.grade + '</span>' : '') +
        '</div></div>';
    });
    html += '</div>';
  }

  if (msLen) {
    html += '<div class="card"><div class="card-title">📨 الرسائل (' + msLen + ')</div>';
    savedData.messages.slice(0, 3).forEach(function(m) {
      html += '<div class="card-item"><div class="item-name">' + (m.subject || m.from) + '</div><div class="item-sub"><span>👤 ' + m.from + '</span>' + (m.date ? '<span>📅 ' + m.date + '</span>' : '') + '</div></div>';
    });
    html += '</div>';
  }

  html += '<button id="btn-mawadi" class="btn btn-primary" style="margin-top:4px">📥 تنزيل ملف الاستيراد لموادي</button>';
  html += '<button id="btn-copy" class="btn btn-secondary">📋 نسخ البيانات JSON</button>';
  html += '<button id="btn-app" class="btn btn-secondary">🚀 فتح تطبيق موادي</button>';
  el.innerHTML = html;

  setTimeout(function() {
    const bm = document.getElementById('btn-mawadi');
    const bc = document.getElementById('btn-copy');
    const ba = document.getElementById('btn-app');
    if (bm) bm.addEventListener('click', downloadForMawadi);
    if (bc) bc.addEventListener('click', copyJSON);
    if (ba) ba.addEventListener('click', openApp);
  }, 100);
}

// ===== تحويل بيانات AKSIS لصيغة موادي =====
function convertToMawadi() {
  const dayMap = {
    'Pazartesi': 'الاثنين', 'Salı': 'الثلاثاء', 'Çarşamba': 'الأربعاء',
    'Perşembe': 'الخميس', 'Cuma': 'الجمعة', 'Cumartesi': 'السبت',
    'الاثنين': 'الاثنين', 'الثلاثاء': 'الثلاثاء', 'الأربعاء': 'الأربعاء',
    'الخميس': 'الخميس', 'الجمعة': 'الجمعة', 'السبت': 'السبت'
  };
  const colors = [0,1,2,3,4,5,6,7];
  const courses = [];
  let idCounter = 100;

  // تحويل الجدول
  (savedData.schedule || []).forEach(function(s, i) {
    var timeParts = (s.time || '').split('-').map(function(t){ return t.trim(); });
    var startTime = timeParts[0] || '';
    var endTime = timeParts[1] || '';
    var day = dayMap[s.day] || s.day || 'الاثنين';

    courses.push({
      id: idCounter++,
      name: s.name || '',
      doc: s.doc || '',
      dept: '',
      code: s.code || '',
      day: day,
      s: startTime,
      e: endTime,
      room: s.room || '',
      notes: '',
      ci: i % 8
    });
  });

  // تحويل الدرجات كملاحظات في كل مادة
  var exams = {};
  (savedData.grades || []).forEach(function(g) {
    // ابحث عن المادة المقابلة
    var match = courses.find(function(c) {
      return c.name && g.course && (
        c.name.toLowerCase().includes(g.course.toLowerCase().substring(0, 6)) ||
        g.course.toLowerCase().includes(c.name.toLowerCase().substring(0, 6))
      );
    });
    if (match && g.midterm && g.midterm !== '--') {
      match.notes = 'Vize: ' + g.midterm + (g.grade && g.grade !== '--' ? ' | Final: ' + g.grade : '');
    }
  });

  return {
    courses: courses,
    exams: exams,
    files: {},
    nid: idCounter,
    version: '2.0',
    _aksis_grades: savedData.grades || [],
    _aksis_messages: savedData.messages || []
  };
}

// ===== تنزيل ملف الاستيراد =====
function downloadForMawadi() {
  const data = convertToMawadi();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mawadi-aksis-import.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ تم تنزيل الملف! استورده في موادي');
}

// ===== نسخ JSON =====
async function copyJSON() {
  const json = JSON.stringify(savedData, null, 2);
  await navigator.clipboard.writeText(json);
  showToast('✅ تم نسخ البيانات!');
}

function openApp() {
  const url = settings.appUrl || 'https://anasfityan.github.io/Axsis/';
  chrome.tabs.create({ url: url });
}

function openAksis() {
  chrome.tabs.create({ url: 'https://aksis.istanbul.edu.tr/' });
}

function openPage(page) {
  chrome.tabs.create({ url: 'https://aksis.istanbul.edu.tr/Home/' + page });
}

function switchTab(tabName) {
  ['scrape', 'data', 'settings'].forEach(function(t) {
    const el = document.getElementById('tab-' + t);
    if (el) el.style.display = t === tabName ? 'block' : 'none';
  });
  document.querySelectorAll('.tab').forEach(function(el, i) {
    el.classList.toggle('active', ['scrape', 'data', 'settings'][i] === tabName);
  });
  if (tabName === 'data') renderDataTab();
  if (tabName === 'scrape') checkCurrentPage();
}

async function saveSettings() {
  const urlInput = document.getElementById('appUrl');
  if (urlInput) settings.appUrl = urlInput.value;
  await chrome.storage.local.set({ aksisSettings: settings });
  showToast('✅ تم حفظ الإعدادات!');
}

async function clearAll() {
  if (!confirm('هل تريد مسح جميع البيانات المحفوظة؟')) return;
  savedData = { schedule: [], grades: [], messages: [] };
  await chrome.storage.local.remove('aksisData');
  renderDataTab();
  showToast('🗑️ تم مسح البيانات');
}

function showToast(msg, isError) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.background = isError ? '#f2b8b5' : '#a8d5a2';
  t.style.color = isError ? '#3d1f1f' : '#1a3d20';
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2500);
}

// ===== ربط الأزرار عند تحميل الصفحة =====
document.addEventListener('DOMContentLoaded', function() {
  // أزرار التبويبات
  document.querySelectorAll('.tab').forEach(function(tab, i) {
    tab.addEventListener('click', function() {
      switchTab(['scrape', 'data', 'settings'][i]);
    });
  });

  // زر الاستيراد
  const btnScrape = document.getElementById('btnScrape');
  if (btnScrape) btnScrape.addEventListener('click', doScrape);

  // زر فتح AKSIS
  const btnAksis = document.querySelector('[onclick="openAksis()"]');
  if (btnAksis) {
    btnAksis.removeAttribute('onclick');
    btnAksis.addEventListener('click', openAksis);
  }

  // زر حفظ الإعدادات
  const btnSave = document.querySelector('[onclick="saveSettings()"]');
  if (btnSave) {
    btnSave.removeAttribute('onclick');
    btnSave.addEventListener('click', saveSettings);
  }

  // زر مسح البيانات
  const btnClear = document.querySelector('[onclick="clearAll()"]');
  if (btnClear) {
    btnClear.removeAttribute('onclick');
    btnClear.addEventListener('click', clearAll);
  }

  init();
});
