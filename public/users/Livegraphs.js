  

    /* ──────────────────────────────────────────
       STATE  (mirrors your main.js globals)
    ────────────────────────────────────────── */
    let allDataRows   = [];
    let headers       = [];
    let infoRows      = [];
    let monthCols     = [];
    let yearCols      = [];
    let pctColIndices = new Set();
    let chartInst     = {};
    let currentPeriod = 'monthly';
    let ieChartType   = 'bar';

    /* ──────────────────────────────────────────
       HELPERS  (same as your existing main.js)
    ────────────────────────────────────────── */
    const MONTHS_EN   = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const MONTHS_AB   = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const MONTHS_ES   = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const MONTHS_AB_ES= ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

    function isMonth(s){
      const lc=s.toLowerCase().trim();
      return MONTHS_EN.includes(lc)||MONTHS_AB.includes(lc)||MONTHS_ES.includes(lc)||MONTHS_AB_ES.includes(lc);
    }
    function isYear(s){
      return /^\d{4}$/.test(s.trim())&&parseInt(s)>=1990&&parseInt(s)<=2100;
    }
    function isSkipRow(row){
      return !row||row.length===0||row.every(c=>c===null||c===undefined||c.toString().trim()==='');
    }
    function extractCode(val){
      if(val===null||val===undefined)return null;
      const s=val.toString().trim();
      const m=s.match(/^(\d{3,6})\s+/);
      if(!m)return null;
      const n=parseInt(m[1]);
      if(n>=1990&&n<=2100)return null;
      return m[1];
    }
    function extractLabel(val){
      if(val===null||val===undefined)return '';
      const s=val.toString().trim();
      const m=s.match(/^\d{3,6}\s+(.*)/);
      return m?m[1].trim():s;
    }
    function findCodeColIndex(){
      for(let r=0;r<Math.min(allDataRows.length,20);r++){
        const row=allDataRows[r];if(!row)continue;
        for(let c=0;c<row.length;c++){
          const v=(row[c]!==null&&row[c]!==undefined)?row[c].toString().trim():'';
          if(extractCode(v)!==null)return c;
        }
      }
      return 1;
    }
    function cellNum(row,ci){
      if(pctColIndices.has(ci))return 0;
      const raw=(row[ci]!==undefined&&row[ci]!==null)?row[ci].toString().trim():'';
      if(!raw)return 0;
      const cleaned=raw.replace(/[^0-9.\-]/g,'');
      if(!cleaned||cleaned==='-')return 0;
      const v=parseFloat(cleaned);
      return isNaN(v)?0:v;
    }
    function parseColumnsFromHeaders(){
      monthCols=[];yearCols=[];pctColIndices=new Set();
      headers.forEach((h,i)=>{
        const s=(h||'').toString().trim();
        if(!s)return;
        if(s==='%'){pctColIndices.add(i);return;}
        if(isYear(s))       yearCols.push({label:s,colIndex:i});
        else if(isMonth(s)) monthCols.push({label:s,colIndex:i});
      });
    }

    /* ──────────────────────────────────────────
       calcSummary — EXACT SAME as your main.js
    ────────────────────────────────────────── */
    function calcSummary(colObj){
      const ci      = colObj.colIndex;
      const CODE_COL= findCodeColIndex();
      const IS_INCOME_ROW       = v => /^1[\.\s]|^importe\s+neto|^1\s+importe/i.test(v);
      const IS_EXPLOTACION_ROW  = v => /^A\)\s*RESULTADO\s+DE\s+EXPLOT/i.test(v);
      const IS_INTEREST_ROW     = v => /^14[\.\s]|gastos\s+financiero/i.test(v);
      const IS_EXPENSE_ROW      = v => /^[4-9][\.\s]|^1[0-3][\.\s]/.test(v);
      let income=0,explotacion=0,bankInterest=0,pureExpense=0;
      allDataRows.forEach(row=>{
        if(isSkipRow(row))return;
        const cellVal=(row[CODE_COL]??'').toString().trim();
        if(!cellVal)return;
        const v=cellNum(row,ci);
        if(v===0)return;
        if(IS_INCOME_ROW(cellVal))           income=v;
        else if(IS_EXPLOTACION_ROW(cellVal)) explotacion=v;
        else if(IS_INTEREST_ROW(cellVal))    bankInterest=v;
        else if(IS_EXPENSE_ROW(cellVal))     pureExpense+=v;
      });
      const finalResult=explotacion+bankInterest;
      return{income,expense:pureExpense,explotacion,bankInterest,
             finalResult,profit:finalResult>0?finalResult:0,loss:finalResult<0?finalResult:0};
    }

    /* ──────────────────────────────────────────
       FORMAT NUMBERS
    ────────────────────────────────────────── */
    function fmt(n){
      if(isNaN(n)||n===undefined||n===null)return '0';
      const abs=Math.abs(n), sign=n<0?'-':'';
      if(abs>=1e9) return sign+(abs/1e9).toFixed(2)+'B';
      if(abs>=1e6) return sign+(abs/1e6).toFixed(2)+'M';
      if(abs>=1e3) return sign+(abs/1e3).toFixed(1)+'K';
      return sign+abs.toLocaleString('en-PK',{minimumFractionDigits:0,maximumFractionDigits:0});
    }

    /* ──────────────────────────────────────────
       CHART HELPERS
    ────────────────────────────────────────── */
    function isDark(){
      return document.documentElement.getAttribute('data-theme')==='dark';
    }
    function alpha(hex,a){
      if(!hex||hex.length<7)return `rgba(0,201,122,${a})`;
      const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
      return `rgba(${r},${g},${b},${a})`;
    }
    function baseOpts(type){
      const dark=isDark();
      const gc=dark?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)';
      const tc=dark?'#556680':'#aab0be';
      const opts={
        responsive:true,maintainAspectRatio:false,
        animation:{duration:600,easing:'easeOutQuart'},
        plugins:{
          legend:{display:false},
          tooltip:{
            backgroundColor:dark?'#161b27':'#fff',
            borderColor:dark?'rgba(255,255,255,.08)':'rgba(0,0,0,.10)',
            borderWidth:1,
            titleColor:dark?'#dde4f5':'#0e1220',
            bodyColor:dark?'#8892a4':'#7a83a8',
            padding:10,cornerRadius:10,
            callbacks:{label:ctx=>` ${fmt(ctx.parsed.y??ctx.parsed)}`}
          }
        }
      };
      if(['bar','line'].includes(type)){
        opts.scales={
          x:{ticks:{color:tc,font:{size:10},maxRotation:45,autoSkip:false,maxTicksLimit:16},grid:{color:gc}},
          y:{ticks:{color:tc,font:{size:10},callback:v=>fmt(v)},grid:{color:gc},beginAtZero:true}
        };
      }
      return opts;
    }
    function mk(id,type,data,opts){
      if(chartInst[id])chartInst[id].destroy();
      const canvas=document.getElementById(id);
      if(!canvas)return;
      chartInst[id]=new Chart(canvas,{type,data,options:opts});
    }

    /* ──────────────────────────────────────────
       KPI STRIP
    ────────────────────────────────────────── */
    function updateKPIs(sums){
      const totalInc = sums.reduce((a,s)=>a+(s.income>0?s.income:0),0);
      const totalExp = sums.reduce((a,s)=>a+Math.abs(s.expense),0);
      const totalPL  = sums.reduce((a,s)=>a+s.finalResult,0);
      const margin   = totalInc?((totalPL/totalInc)*100):0;

      document.getElementById('kpiIncome').textContent  = fmt(totalInc);
      document.getElementById('kpiExpense').textContent = fmt(totalExp);
      const kp=document.getElementById('kpiProfit');
      kp.textContent=fmt(totalPL);
      kp.style.color=totalPL>=0?'#5b9cf6':'#ff4d6d';
      document.getElementById('kpiMargin').textContent  = margin.toFixed(1)+'%';
      document.getElementById('kpiMarginSub').textContent = `Based on ${sums.length} periods`;

      // half-vs-half trend arrows
      const half=Math.floor(sums.length/2);
      if(half){
        const hv=(arr,k)=>arr.reduce((a,s)=>a+(s[k]||0),0);
        const setT=(elId,v1,v2)=>{
          const chg=v1?((v2-v1)/Math.abs(v1)*100):0;
          const el=document.getElementById(elId);
          if(el) el.innerHTML=`<span class="${chg>=0?'trend-up':'trend-down'}">${chg>=0?'↑':'↓'} ${Math.abs(chg).toFixed(1)}% vs prev half</span>`;
        };
        setT('kpiIncomeTrend', hv(sums.slice(0,half),'income'),      hv(sums.slice(half),'income'));
        setT('kpiExpenseTrend',hv(sums.slice(0,half),'expense'),     hv(sums.slice(half),'expense'));
        setT('kpiProfitTrend', hv(sums.slice(0,half),'finalResult'), hv(sums.slice(half),'finalResult'));
      }
    }

    /* ──────────────────────────────────────────
       EXPENSE DONUT  — grouped by expense codes
    ────────────────────────────────────────── */
    function buildDonut(activeCols){
      const CODE_COL=findCodeColIndex();
      const IS_EXP=v=>/^[4-9][\.\s]|^1[0-3][\.\s]/.test(v);
      const expMap={};
      allDataRows.forEach(row=>{
        if(isSkipRow(row))return;
        const cellVal=(row[CODE_COL]??'').toString().trim();
        if(!IS_EXP(cellVal))return;
        const label=extractLabel(cellVal)||cellVal;
        activeCols.forEach(col=>{
          const v=cellNum(row,col.colIndex);
          if(v!==0)expMap[label]=(expMap[label]||0)+Math.abs(v);
        });
      });
      const entries=Object.entries(expMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
      const labels=entries.map(e=>e[0]);
      const vals  =entries.map(e=>e[1]);
      const palette=['#ff4d6d','#ffc75f','#5b9cf6','#00c97a','#c77dff','#00b4d8','#f77f00','#a8dadc'];
      const dark=isDark();
      mk('chartDonut','doughnut',{labels,datasets:[{
        data:vals, backgroundColor:palette.slice(0,labels.length),
        borderWidth:2, hoverOffset:6, borderColor:dark?'#161b27':'#fff'
      }]},{
        responsive:true,maintainAspectRatio:false,animation:{duration:500},
        plugins:{
          legend:{
            display:true,position:'right',
            labels:{color:dark?'#dde4f5':'#0e1220',font:{size:10},boxWidth:10,padding:8,boxHeight:10}
          },
          tooltip:{callbacks:{label:ctx=>` ${ctx.label}: ${fmt(ctx.parsed)}`}}
        },
        cutout:'60%'
      });
    }

    /* ──────────────────────────────────────────
       MAIN BUILD
    ────────────────────────────────────────── */
    function buildDashboard(){
      const activeCols = currentPeriod==='monthly' ? monthCols : yearCols;
      if(!activeCols.length)return;

      const labels  = activeCols.map(c=>c.label);
      const sums    = activeCols.map(c=>calcSummary(c));
      const incomes = sums.map(s=>s.income>0?s.income:0);
      const expenses= sums.map(s=>Math.abs(s.expense));
      const profits = sums.map(s=>s.finalResult);

      updateKPIs(sums);

      const t=ieChartType;
      const plColors=profits.map(v=>v>=0?alpha('#5b9cf6',.85):alpha('#ff4d6d',.85));

      /* Income vs Expense */
      mk('chartIE',t,{labels,datasets:[
        {label:'Income',  data:incomes,
         backgroundColor:t==='bar'?alpha('#00c97a',.82):'transparent',
         borderColor:'#00c97a',borderWidth:t==='bar'?0:2.2,borderRadius:t==='bar'?4:0,
         fill:t==='line',tension:.4,pointRadius:3,pointBackgroundColor:'#00c97a'},
        {label:'Expense', data:expenses,
         backgroundColor:t==='bar'?alpha('#ff4d6d',.82):'transparent',
         borderColor:'#ff4d6d',borderWidth:t==='bar'?0:2.2,borderRadius:t==='bar'?4:0,
         fill:t==='line',tension:.4,pointRadius:3,pointBackgroundColor:'#ff4d6d'}
      ]},baseOpts(t));

      /* Net P/L */
      const plOpts=baseOpts('bar');
      plOpts.scales.y.beginAtZero=false;
      mk('chartPL','bar',{labels,datasets:[{
        label:'P/L',data:profits,backgroundColor:plColors,borderWidth:0,borderRadius:4
      }]},plOpts);

      /* Revenue Trend */
      mk('chartTrend','line',{labels,datasets:[{
        label:'Income',data:incomes,
        borderColor:'#00c97a',backgroundColor:alpha('#00c97a',.10),
        fill:true,tension:.42,borderWidth:2.5,
        pointRadius:3,pointBackgroundColor:'#00c97a'
      }]},baseOpts('line'));

      /* Expense Donut */
      buildDonut(activeCols);

      /* Profit Margin % */
      const margins=incomes.map((inc,i)=>inc?((profits[i]/inc)*100):0);
      const marginOpts=baseOpts('line');
      marginOpts.scales.y.ticks.callback=v=>v.toFixed(0)+'%';
      marginOpts.plugins.tooltip.callbacks={label:ctx=>` ${ctx.parsed.y.toFixed(1)}%`};
      mk('chartMargin','line',{labels,datasets:[{
        label:'Margin %',data:margins,
        borderColor:'#ffc75f',backgroundColor:alpha('#ffc75f',.10),
        fill:true,tension:.4,borderWidth:2.5,
        pointRadius:3,pointBackgroundColor:'#ffc75f'
      }]},marginOpts);

      /* Cumulative P&L */
      let running=0;
      const cumul=profits.map(v=>{running+=v;return running;});
      mk('chartCumul','bar',{labels,datasets:[{
        label:'Cumulative P/L',data:cumul,
        backgroundColor:cumul.map(v=>v>=0?alpha('#5b9cf6',.82):alpha('#ff4d6d',.82)),
        borderRadius:4,borderWidth:0
      }]},baseOpts('bar'));

      /* Yearly row — auto-show when Monthly is active and yearCols exist */
      const yearlyRow=document.getElementById('yearlyRow');
      if(yearCols.length>0 && currentPeriod==='monthly'){
        yearlyRow.style.display='grid';
        const yl=yearCols.map(c=>c.label);
        const ys=yearCols.map(c=>calcSummary(c));
        const yi=ys.map(s=>s.income>0?s.income:0);
        const ye=ys.map(s=>Math.abs(s.expense));
        const yp=ys.map(s=>s.finalResult);
        mk('chartYearIE','bar',{labels:yl,datasets:[
          {label:'Income', data:yi,backgroundColor:alpha('#00c97a',.82),borderWidth:0,borderRadius:4},
          {label:'Expense',data:ye,backgroundColor:alpha('#ff4d6d',.82),borderWidth:0,borderRadius:4}
        ]},baseOpts('bar'));
        mk('chartYearPL','bar',{labels:yl,datasets:[{
          label:'Yearly P/L',data:yp,
          backgroundColor:yp.map(v=>v>=0?alpha('#5b9cf6',.85):alpha('#ff4d6d',.85)),
          borderWidth:0,borderRadius:4
        }]},baseOpts('bar'));
      } else {
        yearlyRow.style.display='none';
      }
    }

    /* ──────────────────────────────────────────
       CONTROLS
    ────────────────────────────────────────── */
    function setPeriod(p,btn){
      currentPeriod=p;
      document.querySelectorAll('.period-tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      buildDashboard();
    }
    function toggleIEType(type,btn){
      ieChartType=type;
      document.querySelectorAll('.chart-type-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      buildDashboard();
    }

    /* Rebuild all charts on theme change
       (called by toggleTheme in sidebar.js / your existing flow) */
    function rebuildAllCharts(){
      Object.values(chartInst).forEach(c=>c.destroy());
      chartInst={};
      buildDashboard();
    }

    /* ──────────────────────────────────────────
       DOWNLOAD CHART
    ────────────────────────────────────────── */
    function dlChart(id,name){
      const c=document.getElementById(id);
      if(!c)return;
      const a=document.createElement('a');
      a.download=name+'.png';a.href=c.toDataURL('image/png');a.click();
      toast('Chart saved as PNG');
    }

    /* ──────────────────────────────────────────
       EXPORT CSV
    ────────────────────────────────────────── */
    function exportCSV(){
      if(!allDataRows.length){toast('No data to export');return;}
      const rows=[headers.join(','),...allDataRows.map(r=>(r||[]).map(c=>JSON.stringify(c??'')).join(','))];
      const blob=new Blob([rows.join('\n')],{type:'text/csv'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);
      a.download='financials.csv';a.click();
      toast('CSV exported');
    }

    /* ──────────────────────────────────────────
       REFRESH
    ────────────────────────────────────────── */
    async function refreshData(){
      Object.values(chartInst).forEach(c=>c.destroy());
      chartInst={};
      document.getElementById('dashContent').style.display='none';
      document.getElementById('dashLoader').style.display='flex';
      await loadSheetData();
    }

    /* ──────────────────────────────────────────
       TOAST
    ────────────────────────────────────────── */
    function toast(msg,d=3000){
      const el=document.createElement('div');
      el.className='toast-msg';el.textContent=msg;
      document.getElementById('toastWrap').appendChild(el);
      setTimeout(()=>el.remove(),d);
    }

    /* ──────────────────────────────────────────
       FULLSCREEN TABLE (same as table page)
    ────────────────────────────────────────── */
    function openFullscreenTable(){
      const overlay=document.getElementById('fullscreenOverlay');
      const fsHead=document.getElementById('fsTableHead');
      const fsBody=document.getElementById('fsTableBody');
      if(!overlay||!fsHead||!fsBody)return;
      fsHead.innerHTML=`<tr>${headers.map(h=>`<th title="${h}">${h}</th>`).join('')}</tr>`;
      let bodyHtml='';
      allDataRows.forEach(row=>{
        if(!row)return;
        bodyHtml+='<tr>'+headers.map((_,i)=>`<td>${row[i]??''}</td>`).join('')+'</tr>';
      });
      fsBody.innerHTML=bodyHtml;
      document.getElementById('fsColCount').textContent=`${headers.length} columns`;
      document.getElementById('fsRowCount').textContent=`${allDataRows.length} rows · ${headers.length} columns`;
      overlay.classList.add('open');
      document.body.style.overflow='hidden';
    }
    function closeFullscreenTable(){
      document.getElementById('fullscreenOverlay').classList.remove('open');
      document.body.style.overflow='';
    }
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeFullscreenTable();});
    document.getElementById('fullscreenOverlay').addEventListener('click',function(e){if(e.target===this)closeFullscreenTable();});

    /* ──────────────────────────────────────────
       LOAD DATA  —  same API as your table page
       /getPreviousSheetResult
    ────────────────────────────────────────── */
    async function loadSheetData(){
      try{
        const clientId=localStorage.getItem('clientId');
        const res=await fetch('/getLatestSheetResult',{
          method:'GET',credentials:'include',
          headers:{'Content-Type':'application/json','x-client-id':clientId||''}
        });
        const text=await res.text();
        if(!res.ok)throw new Error(`Server error: ${res.status} - ${text}`);
        const result=JSON.parse(text);
        if(!result.success){
          toast('Error: '+(result.error||'Unknown'));
          document.getElementById('dashLoader').style.display='none';
          return;
        }
        const rawData=result.data;
        if(!rawData||rawData.length===0){
          toast('No data found in sheet');
          document.getElementById('dashLoader').style.display='none';
          return;
        }
        const data=rawData.map(row=>{
          if(Array.isArray(row))return row;
          return Object.entries(row).filter(([k])=>!k.startsWith('_')).map(([,v])=>v);
        });
        infoRows    = data.slice(0,3);
        headers     = data[3]||[];
        allDataRows = data.slice(4);

        parseColumnsFromHeaders();

        document.getElementById('dashLoader').style.display='none';
        document.getElementById('dashContent').style.display='block';

        buildDashboard();
        toast('Data loaded ✓');
      }catch(err){
        console.error(err);
        toast('Load error: '+err.message);
        document.getElementById('dashLoader').style.display='none';
      }
    }

    /* ──────────────────────────────────────────
       THEME — hook into your existing toggleTheme
       Your sidebar.js already defines toggleTheme()
       We wrap it to also rebuild charts
    ────────────────────────────────────────── */
    window.addEventListener('DOMContentLoaded',()=>{
      /* patch toggleTheme so charts rebuild on theme switch */
      const _origToggle=window.toggleTheme;
      if(typeof _origToggle==='function'){
        window.toggleTheme=function(){
          _origToggle();
          setTimeout(rebuildAllCharts,80);
        };
      }


      function updateLogoByTheme() {

  const logo = document.getElementById("themeLogo");

  const currentTheme =
    document.documentElement.getAttribute("data-theme");

  // DARK THEME
  if (currentTheme === "dark") {

    // dark theme par dark logo
    logo.src = "/users/icons/image2.png";

  } else {

    // white theme par white logo
    logo.src = "/users/icons/image1.png";
  }
}

(function () {
  var saved = localStorage.getItem('appTheme') || 'light';

  document.documentElement.setAttribute('data-theme', saved);

  // page load par logo update
  window.addEventListener("DOMContentLoaded", updateLogoByTheme);
})();

 function toggleTheme() {

  var current =
    document.documentElement.getAttribute('data-theme') || 'light';

  var next = current === 'dark' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', next);

  localStorage.setItem('appTheme', next);

  updateLogoByTheme();
}



function updateLogoByTheme() {
  const logos = document.querySelectorAll(".theme-logo");
  const currentTheme = document.documentElement.getAttribute("data-theme");

  logos.forEach((logo) => {
    logo.src = currentTheme === "dark"
      ? "/users/icons/image2.png"
      : "/users/icons/image1.png";
  });
}

// Apply saved theme and update logos on page load
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("appTheme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  updateLogoByTheme();
});

// Toggle between light and dark
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("appTheme", next);
  updateLogoByTheme();
}
      loadSheetData();
    });

