const photos = {
  meter: {file:'meter.jpg', label:'Dräger-Messgerät'},
  thermal: {file:'thermal.png', label:'K85-Wärmebildkamera'},
  radio: {file:'radio.jpg', label:'Sepura-Funkmikrofon'}
};

export function createDevicePanel(onClose){
  const panel=document.createElement('section');
  panel.id='device-photo';
  panel.hidden=true;
  const bar=document.createElement('div');
  bar.className='device-bar';
  const title=document.createElement('strong');
  title.id='device-title';
  panel.setAttribute('aria-labelledby',title.id);
  const close=document.createElement('button');
  close.type='button';
  close.textContent='×';
  close.setAttribute('aria-label','Gerätefenster schließen');
  close.onclick=onClose;
  bar.append(title,close);
  const body=document.createElement('div');
  body.className='device-body';
  const photo=document.createElement('img');
  photo.draggable=false;
  const screen=document.createElement('div');
  screen.className='device-screen';
  const thermal=document.createElement('canvas');
  thermal.width=480;
  thermal.height=300;
  thermal.setAttribute('aria-label','Wärmebild der Szene');
  const readings=document.createElement('dl');
  readings.className='meter-readings';
  const fields=['Sauerstoff · O₂','Kohlenmonoxid · CO','Rauchindex'].map(name=>{
    const row=document.createElement('div'), term=document.createElement('dt'), value=document.createElement('dd');
    term.textContent=name;
    row.append(term,value);
    readings.append(row);
    return value;
  });
  const status=document.createElement('div');
  status.className='device-status';
  status.setAttribute('role','status');
  screen.append(thermal,readings,status);
  body.append(photo,screen);
  panel.append(bar,body);
  document.body.append(panel);

  let current=null;
  const images=Object.fromEntries(Object.entries(photos).map(([key,{file}])=>{
    const image=new Image();
    image.src=new URL('./devices/'+file,import.meta.url).href;
    return [key,image];
  }));
  function setStatus(message){
    if(status.textContent!==message) status.textContent=message;
  }
  function show(device){
    if(device===current) return;
    current=device;
    panel.hidden=!device;
    if(!device) return;
    panel.dataset.device=device;
    title.textContent=photos[device].label;
    photo.src=images[device].src;
    photo.alt=photos[device].label;
    readings.hidden=device!=='meter';
    thermal.hidden=device!=='thermal';
    if(device==='meter') updateMeter(null);
    else setStatus(device==='thermal'?'Relatives Wärmebild · Simulation':'PTT bereit');
  }
  function updateMeter(values){
    const readingsText=values?[values.oxygen.toFixed(1).replace('.',',')+' %',values.co+' ppm',values.smoke+' %']:['–','–','–'];
    for(const [i,field] of fields.entries()) if(field.textContent!==readingsText[i]) field.textContent=readingsText[i];
    readings.dataset.alarm=String(Boolean(values?.alarm));
    setStatus(values?.alarm?'Gasalarm · Simulation':values?'Messung läuft · Simulation':'Messung pausiert');
  }
  function setRadio(active){
    if(current==='radio') setStatus(active?'Funk · Sendet':'PTT bereit');
  }
  return {show,thermal,updateMeter,setRadio,current:()=>current};
}

// The alarm uses invented scenario values and has no real-device calibration.
export function meterValues(smoke,heat){
  const oxygen=Math.max(12,20.9-smoke*9-heat*1.8);
  const co=Math.round(smoke*510+heat*75);
  return {oxygen,co,smoke:Math.round(smoke*100),alarm:smoke>=.19||heat>=.35};
}

export function createAlarm(){
  let context=null, next=0;
  function unlock(){
    const Audio=window.AudioContext??window.webkitAudioContext;
    if(!Audio) return;
    try {
      context??=new Audio();
      if(context.state==='suspended') context.resume().catch(()=>{});
    } catch {}
  }
  function tone(frequency,start,duration){
    const oscillator=context.createOscillator(), gain=context.createGain();
    oscillator.type='sine';
    oscillator.frequency.value=frequency;
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(.12,start+.015);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start+duration);
  }
  function update(alarm){
    if(context?.state!=='running') return;
    if(!alarm){next=0;return;}
    const now=context.currentTime;
    if(now<next) return;
    tone(1150,now,.13);
    tone(1550,now+.2,.16);
    next=now+1.65;
  }
  function radio(){
    if(context?.state==='running') tone(860,context.currentTime,.11);
  }
  return {unlock,update,radio};
}
