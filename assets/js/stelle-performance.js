/* Text-driven acting; no audio or phoneme synchronization is implied. */
((scope) => {
  'use strict';
  function reaction(text) {
    // Only unambiguous, directly addressed praise gets an immediate local reaction.
    const clauses=String(text).split(/[。！？!?\n]/);
    const praise=clauses.some(s=>/^(?:星[，,、\s]*)?你(?:真的?|好|太|也|很|超级|特别|非常|这么|那么|越来越|可真|实在|是|个|一个|的确|\s)*(?:可爱|漂亮|好看|美丽|萌)(?:[啊呀呢啦了哦诶！!~～\s]*)$/.test(s.trim())) ||
      /^(?:星[，,、\s]*)?(?:好|真|太|超级)可爱[啊呀呢啦了哦!！~～\s]*$/.test(text.trim());
    if(praise) return {expression:'Shy',motion:'tilt',lead:550};
    if(/^(?:谢谢你?|多谢|感谢你|辛苦了)[呀啊啦哦!！。\s]*$/.test(text.trim())) return {expression:'Smile',motion:'nod',lead:350};
    return {expression:'Thinking',motion:'none',lead:0};
  }
  function beats(text) {
    const units=String(text).match(/[A-Za-z0-9]+|\s+|[^\s]/gu)||[];
    const result=[];
    units.forEach((unit,i)=>{
      if(/^[，,、；;：:]$/.test(unit)) result.push({text:unit,level:0,ms:180});
      else if(/^[。.!！?？…]$/.test(unit)) result.push({text:unit,level:0,ms:320});
      else if(/[\p{L}\p{N}]/u.test(unit)) {
        const syllables=/^[a-z0-9]+$/i.test(unit)?Math.max(1,Math.ceil(unit.length/3)):1;
        for(let n=0;n<syllables;n++) {
          const part=unit.slice(Math.floor(n*unit.length/syllables),Math.floor((n+1)*unit.length/syllables));
          result.push({text:part,level:.38+((i+n)%4)*.13,ms:95});
          result.push({text:'',level:.06,ms:55});
        }
      } else result.push({text:unit,level:0,ms:/\n/.test(unit)?160:0});
    });
    const total=result.reduce((s,b)=>s+b.ms,0),scale=Math.min(1,16000/Math.max(total,1));
    return result.map(b=>({...b,ms:b.ms*scale}));
  }
  function create(root) {
    let cancelCurrent=()=>{};
    const emit=(name,detail)=>root.dispatchEvent(new CustomEvent(name,{detail}));
    function begin(text,signal) {
      cancelCurrent();
      const initial=reaction(text),started=performance.now();
      let cancelled=false,queue=Promise.resolve(),pending={expression:initial.expression,motion:'none'},first=true;
      const timers=new Map();
      const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
      function wait(ms) {
        if(cancelled || signal.aborted) return Promise.resolve();
        return new Promise(resolve=>{const id=setTimeout(()=>{timers.delete(id);resolve();},ms);timers.set(id,resolve);});
      }
      const talk=level=>emit('stelle:talk',{active:level>0,level});
      const pose=(expression,motion='none',duration=4500)=>{
        if(!cancelled && root.dataset.birthdayOpen!=='true') emit('stelle:perform',{expression,motion,duration});
      };
      function cancel() {
        if(cancelled)return;
        cancelled=true;signal.removeEventListener('abort',cancel);
        for(const [id,resolve] of timers){clearTimeout(id);resolve();}timers.clear();
        talk(0);root.dataset.performing='false';
        if(root.dataset.birthdayOpen!=='true')emit('stelle:perform',{expression:'Neutral',motion:'none',duration:500});
      }
      cancelCurrent=cancel;
      signal.addEventListener('abort',cancel,{once:true});
      root.dataset.performing='true';talk(0);pose(initial.expression,initial.motion);
      if(signal.aborted)cancel();
      return {
        ready:()=>wait(reduced()?0:Math.max(0,initial.lead-(performance.now()-started))),
        expression(intent){pending=intent;},
        text(text,append=()=>{}) {
          let intent=pending;
          if(first && initial.expression==='Shy' && ['Neutral','Smile','Happy','Thinking'].includes(intent.expression)) intent={expression:'Shy',motion:'none'};
          first=false;
          const rhythm=beats(text);
          queue=queue.then(async()=>{
            if(cancelled)return;
            await wait(reduced()?0:Math.max(0,initial.lead-(performance.now()-started)));
            if(cancelled)return;
            pose(intent.expression,intent.motion,Math.max(1800,rhythm.reduce((n,b)=>n+b.ms,0)+1200));
            for(let i=0;i<rhythm.length;i++) {
              if(cancelled)break;
              if(reduced()) {talk(0);append(rhythm.slice(i).map(b=>b.text).join(''));break;}
              const beat=rhythm[i];
              talk(root.dataset.birthdayOpen==='true'?0:beat.level);
              if(beat.text)append(beat.text);
              if(beat.ms)await wait(beat.ms);
            }
            if(!cancelled)talk(0);
          });
          return queue;
        },
        async finish(){
          await queue;
          if(!cancelled){talk(0);await wait(reduced()?0:1100);}
          cancel();
        },
        cancel
      };
    }
    return {begin,cancel:()=>cancelCurrent()};
  }
  const api={reaction,beats,create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.StellePerformance=api;
})(globalThis);
