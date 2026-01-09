
// ====== Utilidades ======
const el = id => document.getElementById(id);
const setText = (id, t) => el(id).textContent = t;
const unique = arr => [...new Set(arr.filter(Boolean))];
const countBy = arr => arr.reduce((m,v)=> (v ? (m[v]=(m[v]||0)+1 : 0, m) : m), {});
const toMonth = (s='') => {
  // dd/mm/yyyy -> yyyy-mm  |  yyyy-mm-dd -> yyyy-mm
  const m1 = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m1) return `${m1[3]}-${m1[2]}`;
  const m2 = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}`;
  return null;
};

const norm = s => (s||'')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // quita tildes
  .replace(/\\+/g,'')   // quita "\" (escapes del CSV)
  .replace(/[^a-zA-Z0-9]+/g,'')  // deja solo letras/números
  .toUpperCase();

// ====== LECTURA CSV (ruta: ../data/hallazgos2.csv) ======
fetch('../data/hallazgos2.csv')
  .then(r => r.text())
  .then(txt => {

  .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // quita tildes
  .replace(/\\+/g,'')   // quita "\" (escapes del CSV)
  .replace(/[^a-zA-Z0-9]+/g,'')  // deja solo letras/números
  .toUpperCase();

// ====== LECTURA CSV (ruta: ../data/hallazgos2.csv) ======
fetch('../data/hallazgos2.csv')
  .then(r => r.text())
  .then(txt => {
    // Normaliza fin de línea
    const lines = txt.replace(/\r/g,'').split('\n').filter(l => l.trim().length>0);

    // Header + mapa de índices robusto
    const headerRaw = lines[0].split(';');
    const headerNorm = headerRaw.map(h => norm(h));

    const idx = (cand) => headerNorm.indexOf(norm(cand));
    const col = (n) => idx(n);

    // Intentos múltiples por nombres “raros”
    const iFecha     = [col('F-DETECCION'), col('FDETECCION'), col('FECHADETECCION')].find(i=>i>=0);
    const iMunicipio = [col('MUNICIPIO')].find(i=>i>=0);
    const iArea      = [col('AREA')].find(i=>i>=0);
    const iEstado    = [col('ESTADO')].find(i=>i>=0);
    const iDetecto   = [col('DETECTO')].find(i=>i>=0);
    const iHallazgo  = [col('HALLAZGO')].find(i=>i>=0);

    if ([iFecha,iMunicipio,iArea,iEstado,iDetecto,iHallazgo].some(i=>i===undefined)) {
      console.error('Encabezados detectados:', headerRaw);
      alert('No pude mapear las columnas. Revisemos los encabezados del CSV.');
      return;
    }

    const rows = lines.slice(1).map(line => {
      const c = line.split(';');
      return {
        FechaDeteccion: (c[iFecha]||'').trim(),
        Municipio:      (c[iMunicipio]||'').trim(),
        Area:           (c[iArea]||'').trim(),
        Estado:         (c[iEstado]||'').trim(),
        Detecto:        (c[iDetecto]||'').trim(),
        Hallazgo:       (c[iHallazgo]||'').trim()
      };
    });

    initDashboard(rows);
  })
  .catch(err => {
    console.error(err);
    alert('No se pudo leer ../data/hallazgos2.csv. Usá Live Server o verificá la ruta.');
  });

// ====== DASHBOARD ======
function initDashboard(data){
  // KPIs
  setText('kpi-total', data.length);
  setText('kpi-abiertos', data.filter(d=>d.Estado==='ABIERTO').length);
  setText('kpi-cerrados', data.filter(d=>d.Estado==='CERRADO').length);

  // Filtros
  fillSelect('fArea', unique(data.map(d=>d.Area)));
  fillSelect('fEstado', unique(data.map(d=>d.Estado)));
  fillSelect('fMunicipio', unique(data.map(d=>d.Municipio)));

  // Eventos
  const fArea=el('fArea'), fEstado=el('fEstado'), fMunicipio=el('fMunicipio');
  const apply=()=>{
    const a=fArea.value, e=fEstado.value, m=fMunicipio.value;
    const filtered = data.filter(d =>
      (!a || d.Area===a) && (!e || d.Estado===e) && (!m || d.Municipio===m)
    );
    renderTable(filtered);
    drawAll(filtered);
    setText('kpi-total', filtered.length);
    setText('kpi-abiertos', filtered.filter(d=>d.Estado==='ABIERTO').length);
    setText('kpi-cerrados', filtered.filter(d=>d.Estado==='CERRADO').length);
  };

  [fArea,fEstado,fMunicipio].forEach(s=>s.addEventListener('change', apply));
  el('clear').addEventListener('click', ()=>{ fArea.value=''; fEstado.value=''; fMunicipio.value=''; apply(); });

  // Primera render
  renderTable(data);
  drawAll(data);
}

function fillSelect(id, values){
  const sel = el(id);
  values.forEach(v => { const op=document.createElement('option'); op.value=v; op.textContent=v; sel.appendChild(op); });
}

function renderTable(rows){
  const tbody = el('tabla'); tbody.innerHTML='';
  rows.forEach(r=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `
      <td>${r.FechaDeteccion}</td>
      <td>${r.Municipio}</td>
      <td>${r.Area}</td>
      <td>${r.Estado}</td>
      <td>${r.Detecto}</td>
      <td>${r.Hallazgo.slice(0,300)}</td>`;
    tbody.appendChild(tr);
  });
}

// ====== Gráficos (Canvas) ======
function drawAll(rows){
  // Estado
  const est = countBy(rows.map(r=>r.Estado));
  drawBar('chartEstado', Object.keys(est), Object.values(est));

  // Área (Top 10)
  const areaMap = countBy(rows.map(r=>r.Area));
  const areaTop = Object.entries(areaMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
  drawBar('chartArea', areaTop.map(p=>p[0]), areaTop.map(p=>p[1]));

  // Detecto (Top 10)
  const detMap = countBy(rows.map(r=>r.Detecto));
  const detTop = Object.entries(detMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
  drawBar('chartDetecto', detTop.map(p=>p[0]), detTop.map(p=>p[1]));

 // Tendencia (YYYY-MM)
  const months = rows.map(r=>toMonth(r.FechaDeteccion)).filter(Boolean);
  const mMap = countBy(months);
  const labels = Object.keys(mMap).sort();
  drawLine('chartTrend', labels, labels.map(l=>mMap[l]));
}

function drawBar(id, labels, values){
  const c = el(id), ctx = c.getContext('2d');
  c.width = c.clientWidth; c.height = c.clientHeight;
  ctx.clearRect(0,0,c.width,c.height);

  const padding=40, w=c.width-padding*2, h=c.height-padding*2;
  const maxV=Math.max(...values,1);
  const n=Math.max(values.length,1);
  const barW=w/n*0.7, gap=w/n*0.3;

  // Ejes
  ctx.strokeStyle='#b5bdc9';
  ctx.beginPath(); ctx.moveTo(padding,padding); ctx.lineTo(padding,padding+h); ctx.lineTo(padding+w,padding+h); ctx.stroke();

  const colors=['#2563eb','#10b981','#ef4444','#f59e0b','#8b5cf6','#06b6d4'];
  values.forEach((v,i)=>{
    const x=padding+i*(barW+gap)+gap/2;
    const bh=h*(v/maxV);
    const y=padding+h-bh;
    ctx.fillStyle=colors[i%colors.length];
    ctx.fillRect(x,y,barW,bh);
    ctx.fillStyle='#111827'; ctx.font='12px system-ui, Arial'; ctx.textAlign='center';
    ctx.fillText(v, x+barW/2, y-4);
    ctx.save(); ctx.translate(x+barW/2, padding+h+14); ctx.rotate(-Math.PI/6); ctx.fillText(labels[i],0,0); ctx.restore();
  });
}

function drawLine(id, labels, values){
  const c = el(id), ctx = c.getContext('2d');
  c.width = c.clientWidth; c.height = c.clientHeight;
  ctx.clearRect(0,0,c.width,c.height);

  const padding=40, w=c.width-padding*2, h=c.height-padding*2;
  const maxV=Math.max(...values,1);
  const step=w/((values.length-1)||1);

  ctx.strokeStyle='#b5bdc9';
  ctx.beginPath(); ctx.moveTo(padding,padding); ctx.lineTo(padding,padding+h); ctx.lineTo(padding+w,padding+h); ctx.stroke();

  ctx.strokeStyle='#2563eb'; ctx.lineWidth=2; ctx.beginPath();
  values.forEach((v,i)=>{
    const x=padding+i*step;
    const y=padding+h-h*(v/maxV);
    i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  });

  ctx.stroke();

  values.forEach((v,i)=>{
    const x=padding+i*step, y=padding+h-h*(v/maxV);
    ctx.fillStyle='#2563eb'; ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#111827'; ctx.font='12px system-ui, Arial'; ctx.textAlign='center'; ctx.fillText(v, x, y-8);
    ctx.save(); ctx.translate(x, padding+h+14); ctx.rotate(-Math.PI/6); ctx.fillText(labels[i],0,0); ctx.restore();
  });
}
