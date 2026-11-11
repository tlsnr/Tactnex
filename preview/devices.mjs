const photos = {
  meter: {file:'meter.jpg', label:'Dräger-Messgerät'},
  thermal: {file:'thermal.png', label:'K85-Wärmebildkamera'},
  radio: {file:'radio.jpg', label:'Sepura-Funkmikrofon'}
};

export function createDevicePanel(){
  const panel=document.createElement('figure');
  panel.id='device-photo';
  panel.hidden=true;
  const photo=document.createElement('img');
  photo.draggable=false;
  const screen=document.createElement('div');
  screen.className='device-screen';
  const thermal=document.createElement('canvas');
  thermal.width=256;
  thermal.height=192;
  thermal.hidden=true;
  thermal.setAttribute('aria-label','Wärmebild der Szene');
  const readings=document.createElement('div');
  readings.className='meter-readings';
  screen.append(thermal,readings);
  const label=document.createElement('figcaption');
  panel.append(photo,screen,label);
  document.body.append(panel);

  let current=null;
  const images=Object.fromEntries(Object.entries(photos).map(([key,{file}])=>{
    const image=new Image();
    image.src=new URL('./devices/'+file,import.meta.url).href;
    return [key,image];
  }));
  function show(device){
    if(device===current) return;
    current=device;
    panel.hidden=!device;
    if(!device) return;
    panel.dataset.device=device;
    photo.src=images[device].src;
    photo.alt=photos[device].label;
    screen.hidden=device==='radio';
    readings.hidden=device!=='meter';
    thermal.hidden=true;
    if(device==='meter') updateMeter(null);
    label.textContent=device==='radio'?'Sprechmikrofon · PTT':device==='thermal'?'K85 · Standby':'Messgerät · Standby';
  }
  function setThermal(active){
    thermal.hidden=!active;
    label.textContent=active?'K85 · Wärmebild':'K85 · Standby';
  }
  function updateMeter(values){
    if(!values){
      readings.textContent='BEREIT';
      readings.dataset.alarm='false';
      label.textContent='Messgerät · Standby';
      return;
    }
    const {oxygen,co,smoke,alarm}=values;
    readings.textContent='SIMULATION\nO₂  '+oxygen.toFixed(1).replace('.',',')+' %\nCO  '+co+' ppm\nRAUCH  '+smoke+' %\n'+(alarm?'ALARM':'MESSUNG');
    readings.dataset.alarm=String(alarm);
    label.textContent=alarm?'Messgerät · Gasalarm':'Messgerät · Modellwerte';
  }
  function setRadio(active){
    if(current==='radio') label.textContent=active?'Funk · Sendet':'Sprechmikrofon · PTT';
  }
  return {show,thermal,setThermal,updateMeter,setRadio};
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
