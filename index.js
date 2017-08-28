const format = require('./format.js');

module.exports = function AutoCleric(dispatch) {
    
    let playerCid;
    let clericNpc = undefined;
    let enabled = true; // auto-buy heals?    
    
    const HealthTrigger = 0.95; // auto-buy heal when HP falls below this percent
    const AutoBuyDelay = 200; // ms ping        
    
    const chatHook = event => {
        let command = format.stripTags(event.message).split(' ');
        
        if (['!cleric'].includes(command[0].toLowerCase())) {
            toggleModule();
            return false;
        } 
        else if (['!cleric.hp'].includes(command[0].toLowerCase()))
        {
            buyHeal();
            return false;
        }
    }
    dispatch.hook('C_CHAT', 1, chatHook)
    dispatch.hook('C_WHISPER', 1, chatHook)
    
    // slash support
    try {
        const Slash = require('slash')
        const slash = new Slash(dispatch)
        slash.on('cleric', args => toggleModule())
        slash.on('cleric.hp', args => buyHeal())
    } catch (e) {
        // do nothing because slash is optional
    }
    
    function toggleModule() {
        enabled = !enabled;
        systemMessage((enabled ? 'enabled' : 'disabled'));
    }
    
    function buyHeal() {        
        if (clericNpc) {
            setTimeout(() => {            
                dispatch.toServer('C_BUY_VILLAGER_BUFF', 1, {
                    cid: clericNpc.cid,
                    buff: 37 // 37 = HP, 38 = MP, 39 = HP+MP
                });
            }, AutoBuyDelay);
        }
    }  
    
    dispatch.hook('S_CREATURE_CHANGE_HP', 2, (event) => {
        if (!enabled) return;
        
        if ((playerCid) && playerCid - event.target == 0)
        {   
            if (event.curHp / event.maxHp < HealthTrigger)
            {
                buyHeal();
            }            
        }
    })               
    
    dispatch.hook('S_DESPAWN_NPC', 1, (event) => {
        if ((clericNpc) && clericNpc.cid - event.target == 0)
        {
            clericNpc = undefined;
        }    
    })                
      
    dispatch.hook('C_BUY_VILLAGER_BUFF', 1, (event) => {
        clericNpc = event;
    })
  
    dispatch.hook('S_LOGIN', 2, (event) => {
        playerCid = event.cid;
    })
        
    function systemMessage(msg) {
        dispatch.toClient('S_CHAT', 1, {
            channel: 24, //system
            authorName: '',
            message: ' (cleric) ' + msg
        });
    }
}