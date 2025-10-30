(function(){function e(){let e=Array.from(document.querySelectorAll(`video`)).filter(e=>e.readyState!==0).filter(e=>e.disablePictureInPicture===!1).sort((e,t)=>{let n=e.getClientRects()[0]||{width:0,height:0},r=t.getClientRects()[0]||{width:0,height:0};return r.width*r.height-n.width*n.height});if(e.length!==0)return e[0]}var t=class{subscribers={};subscribe(e,t,n={}){let{once:r=!1}=n;this.subscribers[e]||(this.subscribers[e]=[]),this.subscribers[e].push({callback:t,once:r})}unsubscribe(e,t){this.subscribers[e]&&(this.subscribers[e]=this.subscribers[e].filter(e=>e.callback!==t))}emit(e,t){this.subscribers[e]&&(this.subscribers[e].forEach(e=>{e.callback(t)}),this.subscribers[e]=this.subscribers[e].filter(e=>!e.once))}},n=class e{command=``;prefix={};tags={};rawTags={};params=[];static _unescapeIRC(e){let t={"\\:":`;`,"\\s":` `,"\\\\":`\\`,"\\r":`\r`,"\\n":`
`};return e.replace(/\\[snr\:\\]/g,e=>t[e])}static _parseTag(t,n=``){let r=e._unescapeIRC(t),i=e._unescapeIRC(n);return{unescapedKey:r,unescapedValue:i}}static parse(t){let n=new e,r=0,i=(e,n=r)=>t[n]===e,a=()=>{let e=t.indexOf(` `,r);return e===-1?t.length:e};if(i(`@`)){let i=a();t.slice(r+1,i).split(`;`).forEach(t=>{let[r,i=``]=t.split(`=`),{unescapedKey:a,unescapedValue:o}=e._parseTag(r,i);n.rawTags[r]=i,n.tags[a]=o}),r=i+1}if(i(`:`)){let e=a(),i=t.slice(r+1,e),o,s,c;if(i.includes(`!`)){let e;[o,e]=i.split(`!`),[s,c]=e.includes(`@`)?e.split(`@`):[e,void 0]}else i.includes(`@`)?[s,c]=i.split(`@`):c=i;n.prefix.nickname=o,n.prefix.user=s,n.prefix.host=c,r=e+1}let o=a();for(n.command=t.slice(r,o),r=o+1;r<t.length;){if(i(`:`)){n.params.push(t.slice(r+1));break}let e=a();n.params.push(t.slice(r,e)),r=e+1}return n}toJSON(){return{command:this.command,prefix:this.prefix,tags:this.tags,rawTags:this.rawTags,params:this.params}}static fromJSON(t){let n=new e;return n.command=t.command,n.prefix=t.prefix||{},n.tags=t.tags||{},n.rawTags=t.rawTags||{},n.params=t.params||[],n}},r=class extends t{mediaSession=navigator.mediaSession;pipWindow=null;videoElement=null;originalParent=null;wrapper=null;container=null;chat=null;options={width:480,height:300,preferInitialWindowPlacement:!0};MIN_SPACE=200;constructor(){super(),this.mediaSession.setActionHandler(`enterpictureinpicture`,this.onEnterPIP.bind(this))}async onEnterPIP(){this.videoElement=e()??null,this.videoElement&&(this.originalParent=this.videoElement.parentElement,this.pipWindow=await documentPictureInPicture.requestWindow(this.options),this.pipWindow.document.body.insertAdjacentHTML(`afterbegin`,i),this.wrapper=this.pipWindow.document.querySelector(`.dpip__wrapper`),this.container=this.pipWindow.document.getElementById(`dpip__container`),this.chat=this.pipWindow.document.getElementById(`dpip__chat`),this.wrapper.querySelector(`.dpip__video_container`)?.prepend(this.videoElement),this.copyAllStylesheets(),this.videoElement.addEventListener(`loadedmetadata`,this.updateLayout.bind(this)),this.pipWindow.addEventListener(`resize`,this.updateLayout.bind(this)),this.emit(`enterpictureinpicture`,void 0))}copyAllStylesheets(){[...document.styleSheets].forEach(e=>{try{let t=[...e.cssRules].map(e=>e.cssText).join(``),n=document.createElement(`style`);n.textContent=t,this.pipWindow.document.head.appendChild(n)}catch{let t=document.createElement(`link`);t.rel=`stylesheet`,t.type=e.type,t.media=String(e.media),t.href=e.href||``,this.pipWindow.document.head.appendChild(t)}})}updateLayout(){let e=this.pipWindow.innerWidth,t=this.pipWindow.innerHeight,n=this.videoElement.videoWidth/this.videoElement.videoHeight,r=e/t,i,a;r>n?(a=t,i=a*n,this.wrapper.style.flexDirection=`row`,e-i<this.MIN_SPACE?this.container&&(this.container.style.display=`none`):this.container&&(this.container.style.display=`flex`)):(i=e,a=i/n,this.wrapper.style.flexDirection=`column`,t-a<this.MIN_SPACE?this.container&&(this.container.style.display=`none`):this.container&&(this.container.style.display=`flex`))}addMessage(e){let t=this.pipWindow.document.getElementById(`dpip__message_template`).content.cloneNode(!0);t.querySelector(`.dpip__message_username`).textContent=e.tags[`display-name`],t.querySelector(`.dpip__message_body`).textContent=e.params[1],t.querySelector(`.dpip__message_username`).style.color=e.tags.color,this.chat.appendChild(t),this.chat&&(this.chat.scrollTop=this.chat.scrollHeight)}},i=`
    <style>
        @media all and (display-mode: picture-in-picture) {
            /* Reset and Base */
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            html {
                font-size: 62.5%;
                font-weight: var(--font-weight-normal);
                text-size-adjust: 100%;
                line-height: var(--line-height-body);
            }

            body {
                margin: 0;
                padding: 0;
                height: 100%;
                width: 100%;
                background: var(--color-background-body);
                color: var(--color-text-base);
                font-family: var(--font-base);
                overflow: hidden;
                line-height: var(--line-height-body);
            }

            /* Wrapper */
            .dpip__wrapper {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                width: 100%;
                flex-direction: row;
            }

            .dpip__video_container {
                aspect-ratio: 16 / 9;
                max-width: 100%;
                max-height: 100%;
                width: 100%;
            }

            .dpip__video_container video {
                width: 100%;
                height: 100%;
                background: inherit;
                flex-shrink: 0;
                border: var(--border-width-default) solid var(--color-border-base);
                border-radius: var(--border-radius-medium);
            }

            /* Container */
            .dpip__container {
                background: var(--color-background-body-alt);
                color: inherit;
                display: flex;
                overflow: auto;
                flex-grow: 1;
                min-width: 0;
                min-height: 0;
                width: 100%;
                height: 100%;
                padding: var(--space-05);
                border-left: var(--border-width-default) solid var(--color-border-base);
                border-radius: var(--border-radius-small);
                flex-direction: column;
            }

            /* Chat */
            .dpip__chat {
                flex: 1;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                background: var(--color-background-chat);
                color: var(--color-text-base);
                scrollbar-width: thin;
                scrollbar-color: var(--color-background-scrollbar) transparent;
                border-radius: var(--border-radius-small) var(--border-radius-small) 0 0;
            }

            .dpip__chat::-webkit-scrollbar {
                width: 8px;
                opacity: 0;
                transition: opacity var(--timing-medium);
            }

            .dpip__chat:hover::-webkit-scrollbar {
                opacity: 1;
            }

            .dpip__chat::-webkit-scrollbar-thumb {
                background-color: var(--color-background-scrollbar);
                border-radius: var(--border-radius-small);
                border: 2px solid transparent;
                background-clip: content-box;
            }

            .dpip__chat::-webkit-scrollbar-track {
                background: transparent;
            }

            /* Input Section */
            #dpip__input {
                display: flex;
                gap: var(--space-05);
                padding: var(--space-1);
                background: var(--color-background-input);
                border-top: var(--border-width-default) solid var(--color-border-base);
            }

            #dpip__textinput {
                flex-grow: 1;
                resize: none;
                padding: var(--button-padding-y) var(--button-padding-x);
                background: var(--color-background-input);
                border: var(--input-border-width-small) solid var(--color-border-input);
                border-radius: var(--input-border-radius-small);
                font-size: var(--input-text-small);
                font-family: var(--font-size-7);
                color: var(--color-text-input);
                outline: none;
                height: var(--input-size-default);
                min-height: var(--input-size-default);
                max-height: calc(var(--input-size-default) * 4);
                overflow-y: auto;
                line-height: var(--line-height-body);
                transition: border-color var(--timing-medium);
            }

            #dpip__textinput:focus {
                border-color: var(--color-border-input-focus);
            }

            #dpip__textinput::-webkit-scrollbar {
                width: 6px;
            }

            #dpip__textinput::-webkit-scrollbar-thumb {
                background-color: var(--color-background-scrollbar);
                border-radius: var(--border-radius-small);
            }

            #dpip__textinput::-webkit-scrollbar-track {
                background: transparent;
            }

            #dpip__sendbutton {
                padding: var(--button-padding-y) var(--button-padding-x);
                background: var(--color-background-button-brand);
                color: var(--color-text-button-brand);
                border: none;
                border-radius: var(--button-border-radius-small);
                font-size: var(--button-text-small);
                font-family: var(--font-size-7);
                font-weight: var(--font-weight-semibold);
                cursor: pointer;
                transition: background var(--timing-medium);
                height: var(--button-size-default);
                line-height: var(--button-size-small);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            #dpip__sendbutton:hover {
                background: var(--color-background-button-brand-hover);
            }
            /* Message */
            .dpip__message {
                overflow-wrap: anywhere;
                padding: var(--space-05);
                font-size: var(--font-size-8);
                vertical-align: baseline;
                display: inline-block;
                min-width: 0;
                border-radius: var(--border-radius-small);
                transition: background var(--timing-medium);
            }

            .dpip__message:hover,
            .dpip__message:focus {
                background: var(--color-background-interactable-hover);
            }

            /* Timestamp */
            .dpip__message_timestamp {
                color: var(--color-hinted-grey-9);
                margin-inline-end: var(--space-05);
                font-size: var(--font-size-7);
            }

            /* Username */
            .dpip__message_username {
                font-weight: var(--font-weight-bold);
                color: var(--color-text-link);
                transition: color var(--timing-medium);
            }

            .dpip__message_username:hover,
            .dpip__message_username:focus {
                color: var(--color-text-link-hover);
                text-decoration: underline;
            }

            /* Media Queries */
            @media (max-width: var(--break-sm)) {
                .dpip__wrapper {
                    flex-direction: column;
                }
            }
        }
    </style>
    <template id="dpip__message_template">
        <div class="dpip__message">
            <span class="dpip__message_timestamp"></span><span class="dpip__message_username"></span><span aria-hidden>:
            </span><span class="dpip__message_body"></span>
        </div>
    </template>
    <div class="dpip__wrapper">
        <!-- Video goes here -->
        <div id="dpip__video_container" class="dpip__video_container"></div>
        <div id="dpip__container" class="dpip__container">
            <!-- Your content here -->
            <div id="dpip__chat" class="dpip__chat"></div>
        </div>
    </div>
`,a=class{logs=[];colors={LOG:`background: gray; color: white; padding: 2px 4px; border-radius: 4px;`,INFO:`background: blue; color: white; padding: 2px 4px; border-radius: 4px;`,WARN:`background: orange; color: white; padding: 2px 4px; border-radius: 4px;`,ERROR:`background: red; color: white; padding: 2px 4px; border-radius: 4px;`};log(e){this.add(`LOG`,e)}info(e){this.add(`INFO`,e)}warn(e){this.add(`WARN`,e)}error(e){this.add(`ERROR`,e)}getLogs(e){return e?this.logs.filter(t=>t.type===e):[...this.logs]}clearLogs(){this.logs=[]}add(e,t){let n=new Date().toISOString(),r={timestamp:n,type:e,message:t};this.logs.push(r);let i=this.colors[e],a=this.stringify(t);console.log(`%c[${n}] [%c${e}%c] ${a}`,`color: inherit;`,i,`color: inherit;`)}stringify(e){if(typeof e==`string`)return e;try{return JSON.stringify(e)}catch{return String(e)}}},o=class extends t{logger=new a;isChromeConnected=!1;isTwitchConnected=!1;pipWindowManager;chromePort;constructor(){super(),this.pipWindowManager=new r,this.pipWindowManager.subscribe(`enterpictureinpicture`,this.onEnterPIP.bind(this))}onEnterPIP(){this.pipWindowManager.pipWindow.addEventListener(`pagehide`,e=>{this.logger.info(`Closing PIP Window, closing connection with worker and twitch`),this.postChromeMessage(`TFIN`),this.pipWindowManager.originalParent.prepend(this.pipWindowManager.videoElement)}),this.logger.info(`Entering picture in picture mode`),this.connect()}connect(){this.logger.info(`Connecting to worker`),this.chromePort=chrome.runtime.connect({name:`content-client`}),this.chromePort.onMessage.addListener(this.onMessage.bind(this)),this.chromePort.onDisconnect.addListener(this.onDisconnect.bind(this));let e=window.location.pathname.replace(/^\/|\/$/g,``);this.logger.info(`Sending Chrome SYN to connect to twitch channel: ${e}`),this.postChromeMessage(`CSYN`,{channel:e})}postChromeMessage(e,t={}){this.chromePort.postMessage({command:e,payload:t})}onDisconnect(e){this.isChromeConnected=!1,chrome.runtime.lastError?this.logger.error(`Chrome port disconnected due to error: ${chrome.runtime.lastError.message}`):this.logger.info(`Chrome port disconnected`)}onMessage(e){switch(this.logger.log(`Received command: ${e.command}`),this.emit(e.command,e),e.command){case`CACK`:return this.handleCACK(e);case`CFIN`:return this.handleCFIN(e);case`TIRC`:return this.handleTIRC(e);case`TCON`:return this.handleTCON(e);case`TFIN`:return this.handleTFIN(e);case`TERR`:break;default:this.logger.error(`Unknown command: ${e.command}`);break}}handleTCON(e){this.isTwitchConnected=!0,this.logger.info(`Twitch connected!`)}handleTFIN(e){this.isTwitchConnected=!1,this.logger.info(`Twitch disconnected`),this.postChromeMessage(`CFIN`)}handleTIRC(e){console.assert(this.isTwitchConnected===!0,`received a IRC message but isTwitchConnected is set to false`);let t=n.fromJSON(e.payload);this.logger.info(`Adding a new message to PIP Window`),this.pipWindowManager.addMessage(t)}handleCACK(e){this.isChromeConnected=!0,this.logger.info(`Chrome port connected!`),this.logger.log(`Worker is establishing twitch connection now`)}handleCFIN(e){this.chromePort.disconnect(),this.onDisconnect(null)}};`pictureInPictureEnabled`in document?document.pictureInPictureEnabled?(console.log(`Content script bootup!`),new o):alert(`The Picture-in-Picture Web API is disabled.`):alert(`The Picture-in-Picture Web API is not available.`)})();