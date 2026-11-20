/* Illustrated, selectable room decorating with persistent local choices. */
(function (root) {
  const ROOMS = [
    { id:'living', name:'Living Room', icon:'🛋️', unlockAt:0, slots:[['sofa','🛋️',['Blush sofa','Lavender sofa','Cream sofa']],['rug','🧶',['Heart rug','Lilac rug','Star rug']],['lamp','🪔',['Moon lamp','Bunny lamp','Crystal lamp']],['plant','🪴',['Tulip pot','Daisy pot','Lavender pot']]] },
    { id:'bedroom', name:'Bedroom', icon:'🛏️', unlockAt:12, slots:[['bed','🛏️',['Cloud bed','Ribbon bed','Moon bed']],['wall','🖼️',['Star wallpaper','Floral wallpaper','Heart wallpaper']],['curtain','🪟',['Pink curtains','Lilac curtains','Lace curtains']],['light','💡',['Moon light','Flower light','Pearl light']]] },
    { id:'kitchen', name:'Kitchen', icon:'🍓', unlockAt:28, slots:[['table','🍽️',['Round table','Tea table','Strawberry table']],['chair','🪑',['Heart chair','Bow chair','Cloud chair']],['shelf','🧁',['Cake shelf','Tea shelf','Flower shelf']],['window','🌷',['Garden view','Sunset view','Starry view']]] },
    { id:'memory', name:'Memory Corner', icon:'📷', unlockAt:48, slots:[['frame','🖼️',['Heart gallery','Polaroid wall','Ribbon frames']],['shelf','📚',['Book nook','Keepsake shelf','Plushie shelf']],['seat','🧸',['Bunny chair','Love seat','Cloud beanbag']],['light','✨',['Fairy lights','Star lights','Butterfly lights']]] }
  ];

  const $ = (sel, parent = document) => parent.querySelector(sel);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const add = (parent, ...children) => children.forEach(child => parent.appendChild(child));
  const totalDone = () => {
    const s = SaveStore.get();
    return Object.keys(s.levels).length + Object.keys(s.match.levels).length + Object.keys(s.paint.levels || {}).length;
  };
  const balance = () => Math.max(0, SaveStore.get().stars - SaveStore.get().home.spent);

  function render() {
    const host = $('#home-renovation'); if (!host) return;
    const s = SaveStore.get(), wallet = balance(), done = totalDone(); host.innerHTML = '';
    const head = el('div','renovation-head'), copy = el('div');
    add(copy,el('h2','','Our Little Home'),el('p','','Choose the furniture, colors and tiny details. Every room is yours to decorate.'));
    add(head,copy,el('span','renovation-wallet','★ '+wallet)); host.appendChild(head);
    ROOMS.forEach(room => {
      const unlocked = done >= room.unlockAt, card = el('article','room-card'+(unlocked?'':' room-locked'));
      const top=el('div','room-top'), title=el('div','room-title'); add(title,el('span','room-icon',room.icon));
      const label=el('div'); add(label,el('h3','',room.name),el('small','',unlocked?'Tap an item to choose its style':'Unlock after '+room.unlockAt+' completed levels'));
      title.appendChild(label); add(top,title,el('span','room-count',unlocked?'Decorate':'🔒 Locked')); card.appendChild(top);
      const scene=el('div','room-scene room-decor-scene scene-'+room.id);
      scene.setAttribute('aria-label', room.name+' preview');
      ['wall','window','wall-art','floor','rug','main-furniture','side-table','lamp','plant','shelf'].forEach(part=>{
        const piece=el('div','scene-object scene-'+part);
        const slotMap={ 'main-furniture':room.slots[0][0], 'rug':room.slots[1]&&room.slots[1][0], 'lamp':room.slots[2]&&room.slots[2][0], 'plant':room.slots[3]&&room.slots[3][0], 'window':room.slots[3]&&room.slots[3][0], 'wall-art':room.slots[1]&&room.slots[1][0], 'shelf':room.slots[2]&&room.slots[2][0] };
        const slot=slotMap[part], chosen=slot?s.home.decor[room.id+'-'+slot]:'';
        if(chosen){const index=room.slots.find(x=>x[0]===slot)[2].indexOf(chosen);piece.classList.add('style-'+(index+1));piece.title=chosen;}
        scene.appendChild(piece);
      });
      const caption=el('div','scene-caption',room.name+' · '+room.slots.filter(([slot])=>s.home.decor[room.id+'-'+slot]).length+'/'+room.slots.length+' details chosen');
      scene.appendChild(caption);card.appendChild(scene);
      if(unlocked){
        const grid=el('div','decor-choices');
        room.slots.forEach(([slot,emoji,choices])=>{
          const key=room.id+'-'+slot, selected=s.home.decor[key]||'';
          const group=el('div','decor-slot'); group.appendChild(el('strong','',slot[0].toUpperCase()+slot.slice(1)));
          const opts=el('div','decor-options');
          choices.forEach((choice,i)=>{const b=el('button','decor-option'+(selected===choice?' selected':''),emoji+' '+choice); b.type='button'; b.disabled=selected===choice;
            b.onclick=()=>{if(SaveStore.setHomeDecor(key,choice,2+i)){AppUI.toast(choice+' added to your '+room.name.toLowerCase());render();}else AppUI.toast('Earn a few more stars to decorate this room.');}; opts.appendChild(b);});
          group.appendChild(opts); grid.appendChild(group);
        }); card.appendChild(grid);
      } else card.appendChild(el('p','room-lock-note','Keep playing to unlock this room and its decorating choices.'));
      host.appendChild(card);
    });
  }

  root.Renovation = { render, rooms: ROOMS, balance, totalDone };
})(window);
