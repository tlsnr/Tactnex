// This exercise models selected decisions from FwDV 7 §§ 7.1, 7.2 and 7.4.
// Timings, pressure consumption and NPC readiness are scenario parameters.
export function createIncident(){
  const state={};
  function reset(){
    Object.assign(state,{phase:'check',air:[300,290],elapsed:0,entryAir:[],inbound:0,
      reserveReached:false,aborted:false,reminders:0});
  }
  reset();
  function check(){
    if(state.phase!=='check') return '';
    state.phase='register';
    return 'Truppkontrolle und Einsatzkurzprüfung simuliert. Sicherheitstrupp bereit. Jetzt bei der Atemschutzüberwachung anmelden.';
  }
  function radio({outside,atGoal,extinguished}){
    switch(state.phase){
      case 'check': return 'Zuerst die Truppkontrolle am Vorplatz durchführen.';
      case 'register':
        if(!outside) return 'Anmeldung am Vorplatz.';
        state.phase='advance';
        state.entryAir=[...state.air];
        return 'Atemschutzüberwachung: Angriffstrupp registriert. Vorgehen zum Technikraum.';
      case 'advance':
        if(state.reserveReached) return beginReturn(false,outside);
        if(!atGoal) return 'Einsatzziel noch nicht erreicht. Am Technikraum erneut melden.';
        state.phase='attack';
        return 'Atemschutzüberwachung: Einsatzziel erreicht, Meldung registriert.';
      case 'attack':
        if(state.reserveReached || extinguished) return beginReturn(extinguished,outside);
        return 'Atemschutzüberwachung: Trupp am Einsatzziel. Rückwegreserve beachten.';
      case 'return':
        if(!outside) return 'Gemeinsam zum Vorplatz zurückkehren und dort abmelden.';
        state.phase='complete';
        return state.aborted?'Atemschutzüberwachung: Trupp abgemeldet. Einsatz abgebrochen.':'Atemschutzüberwachung: Trupp abgemeldet. Einsatz abgeschlossen.';
      default: return 'Atemschutzüberwachung: Übung beendet.';
    }
  }
  function beginReturn(extinguished,outside){
    state.phase='return';
    state.aborted=!extinguished||outside;
    if(outside) return 'Rückwegmeldung verspätet. Jetzt am Vorplatz abmelden.';
    return 'Atemschutzüberwachung: Beginn des Rückwegs registriert. Trupp gemeinsam zurück zum Vorplatz.';
  }
  function step(dt,{outside,moving,working}){
    if(!['advance','attack','return'].includes(state.phase)) return '';
    state.elapsed+=dt;
    const demand=(moving?.95:.65)+(working?.53:0);
    for(let i=0;i<state.air.length;i++) state.air[i]=Math.max(0,state.air[i]-dt*demand*(1+i*.14));
    if(state.phase==='advance'){
      state.inbound=Math.max(state.inbound,...state.air.map((bar,i)=>state.entryAir[i]-bar));
    }
    if(state.phase==='return' && outside) return '';
    if(Math.min(...state.air)<=0){
      state.phase='failed';
      return 'Übung abgebrochen: Atemluft aufgebraucht. Rückweg früher antreten.';
    }
    if(state.phase!=='return' && !state.reserveReached && Math.min(...state.air)<=2*state.inbound){
      state.reserveReached=true;
      return 'Rückwegreserve erreicht. Brandbekämpfung beenden und Rückweg über Funk melden.';
    }
    if(state.reminders<2 && state.elapsed>=(state.reminders+1)*60){
      state.reminders++;
      return 'Atemschutzüberwachung: Behälterdrücke beider Truppmitglieder kontrollieren.';
    }
    return '';
  }
  return {state,reset,check,radio,step};
}
