'use strict';
// autocruise.js //
// Written by Sanshiro Enomoto on 5 February 2023 //


const autocruise_usage = `
This is a single-file JavaScript library without any external dependencies.
Create an HTML file that includes a list of <a>'s to cruise, with this script in <script>,
then the <body> will be replaced with autocruise contents.


Example making an autocruise page:

- - - - - - - - - - 8< - - - - - - - - - - 8< - - - - - - - - - -
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="content-type" content="text/html; charset=UTF-8">
    <title>Autocruise</title>
    <script type="text/javascript" src="autocruise.js"></script>
  </head>

  <body autocruise-interval="10">
    <a href="page1.url">page 1
    <a href="page2.url">page 2
    <a href="page3.url">page 3
    ...
  </body>
</html>
- - - - - - - - - - 8< - - - - - - - - - - 8< - - - - - - - - - -
            
Alternatively, pages can be defined in an external configuration file, which is specified in URL
   https://.../autocruise.html?config=URL_TO_CONFIG_JSON
In this case, the HTML body can be empty.

The JSON file should look like:

- - - - - - - - - - 8< - - - - - - - - - - 8< - - - - - - - - - -
{
    "title": "My Autocruise",
    "interval": 60,
    "pages": [
        "page1.url",
        "page2.url"
    ]
}
- - - - - - - - - - 8< - - - - - - - - - - 8< - - - - - - - - - -

Autocruise has several parameters, such as "interval". 
Parameter values can be specified by:
- config file
- "autocruise-NAME" attribute to the <body> element
- URL parameter, NAME=VALUE

Currently defined parameters are:
- interval: cycle view switch intervals, in seconds
- view: initial view mode, "cycle" (default) or "tile"
`


;(function() {

    function time() {
        return Math.floor((new Date()).getTime()/1000.0);
    }

    
    function loadConfig(then) {
        let config = {
            titie: null,
            view: 'cycle',
            interval: 60,
            pauseLength: 180,
            backgroundColor: "#303030",
            pages: []
        };
        let options = {
            configbase: '',
            interval: 0,
            view: null,
        };
        // take options from body attributes (start with autocruise-)
        let body = document.querySelector('body');
        for (const attr of body.attributes) {
            if (attr.name.substr(0, 11) == 'autocruise-') {
                options[attr.name.substr(11)] = attr.value;
            }
        }
        // take options from URL
        let search = window.location.search.split('?')[1];
        if (search) {
            for(let kv of search.split('&')) {
                let [key, value] = kv.split('=');
                options[key] = decodeURIComponent(value);
            }
        }

        let done = () => {
            if (parseFloat(options.interval) > 0) {
                config.interval = parseFloat(options.interval);
            }
            if (options.view) {
                config.view = options.view;
            }
            then(config);
        }

        if (options.config) {
            fetch(options.configbase + options.config)
                .then(response => {
                    if (! response.ok) {
                        throw new Error(response.status + " " + response.statusText);
                    }
                    return response.json();
                })
                .catch(e => {
                    document.write(`
                        <h3>Autocruise Configuration Error</h3>
                         URL: ${options.config}<br>
                         Error: ${e.message}
                    `);
                    return null;
                })
                .then(doc => {
                    if (doc) {
                        if (doc.interval > 0) {
                            config.interval = doc.interval;
                        }
                        if (doc.view) {
                            config.view = doc.view;
                        }
                        config.title = doc.title ?? doc.meta?.title;
                        config.pages = doc.pages ?? [];
                    }
                    done();
                });
        }
        else {
            const list = body.querySelectorAll('a');
            if (! (list.length > 0)) {
                let message = autocruise_usage.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                document.write(`<h3>autocruise.js</h3><pre>${message}<pre>`);
            }
            for (let i = 0; i < list.length; i++) {
                const href = list[i].getAttribute('href');
                config.pages.push(href);
            }
            done();
        }
    }

    
    function build(config) {
        let context = {
            nextUpdate: 0,
            currentPage: -1,
            isInCycleViewMode: true
        }

        let body = document.querySelector('body');
        body.style=`margin:0;padding:0;background-color:${config.backgroundColor};overflow:hidden`;
        body.innerHTML = (`
            <div id="header" style="height:1.2em;width:100%;background:black;color:gray">
              <div style="display:flex">
                <div id="status" style="flex:1 0 auto;color:gray"></div>
                <div id="pauseBtn" style="flex:0 0  auto;margin-left:0.5em;border:thin solid;border-radius:5px">Pause</div>
                <div id="reloadBtn" style="flex:0 0  auto;margin-left:0.5em;border:thin solid;border-radius:5px">Reload</div>
                <div id="popoutBtn" style="flex:0 0  auto;margin-left:0.5em;border:thin solid;border-radius:5px">Pop out</div>
              </div>
            </div>
        `);
        context.headerDiv = document.querySelector('#header');
        context.statusDiv = document.querySelector('#status');
        let pauseBtn = document.querySelector('#pauseBtn');
        let reloadBtn = document.querySelector('#reloadBtn');
        let popoutBtn = document.querySelector('#popoutBtn');
        
        if (config.title) {
            document.title = config.title;
        }
        
        for (let i = 0; i < config.pages.length; i++) {
            let iframe = document.createElement('iframe');
            iframe.style.width = '100%';
            iframe.style.height = (window.innerHeight-20) + 'px';
            iframe.style.border = 'none';
            iframe.style.margin = '0';
            iframe.style.padding = '0';
            iframe.style.background = 'white';
            
            let cover = document.createElement('div');
            cover.style.position = 'absolute';
            cover.style['z-index'] = '10';
            cover.style.left = 0;
            cover.style.top = 0;
            cover.style.border = 'none';
            cover.style.margin = '0';
            cover.style.padding = '0';
            cover.style.opacity = '0';
            cover.style.display = 'none';
            cover.style.cursor = 'pointer';
            
            let div = document.createElement('div');
            div.classList.add('cruise-page');
            div.style.position = 'absolute';
            div.style.left = '0';
            div.style.top = '20px';
            div.style.width = '100%';
            div.style.margin = '0';
            div.style.padding = '0';
            div.style.border = 'none';
            div.style['background-color'] = config.backgroundColor;
            div.style['z-index'] = '0';
            
            div.appendChild(iframe);            
            div.appendChild(cover);
            body.appendChild(div);

            cover.setAttribute('cruise-page', i);
            cover.addEventListener('click', e=>{
                context.currentPage = e.target.getAttribute('cruise-page');
                context.nextUpdate = time() + config.interval;
                switchToCycleView(config, context);
            });
            
            // this works only for same-origin pages
            iframe.contentWindow.addEventListener('click', e => {
                holdCycleView(config, context);
            });
        }
        
        for (let div of [ context.statusDiv, pauseBtn, reloadBtn, popoutBtn ]) {
            div.addEventListener('mouseenter', e=>{
                div.style.background = 'gray';
                div.style.color = 'white';
            });
            div.addEventListener('mouseleave', e=>{
                div.style.background = 'black';
                div.style.color = 'gray';
            });
            div.style.cursor = 'pointer';
        }
        context.statusDiv.addEventListener('click', e=>{
            context.statusDiv.style.color = 'gray';
            if (context.isInCycleViewMode) {
                switchToTileView(config, context);
            }
        });
        pauseBtn.addEventListener('click', e=>{
            holdCycleView(config, context);
        });
        reloadBtn.addEventListener('click', e=>{
            let divs = document.querySelectorAll('.cruise-page');
            let iframe = divs[context.currentPage].querySelector('iframe');
            iframe.setAttribute('src', config.pages[context.currentPage]);
        });
        popoutBtn.addEventListener('click', e=>{
            window.open(config.pages[context.currentPage]);
        });

        loadPages(config,document.querySelectorAll('.cruise-page'));
        
        return context;
    }


    function loadPages(config, pageDivs, start=0) {
        if (start >= config.pages.length) {
            return;
        }
        
        let loadNextPage = e => {
            e.target.removeEventListener('load', loadNextPage);
            loadPages(config, pageDivs, start+1);
        };

        let iframe = pageDivs[start].querySelector('iframe');
        iframe.addEventListener('load', loadNextPage);  // this will be called even if the loading failed
        iframe.setAttribute('src', config.pages[start]);
    }

    
    function updateCycleView(config, context) {
        if (! context.isInCycleViewMode) {
            return;
        }

        let now = time();
        let togo = context.nextUpdate - now;
        if ((context.currentPage < 0) || (togo <= 0)) {
            context.currentPage++;
            if (context.currentPage >= config.pages.length) {
                context.currentPage = 0;
            }
            togo = config.interval;
            context.nextUpdate = now + togo;
            
            let divs = document.querySelectorAll('.cruise-page');
            divs[context.currentPage].style['z-index'] = '2';
            for (let i = 0; i < divs.length; i++) {
                if (i != context.currentPage) {
                    divs[i].style['z-index'] = '0';
                }
            }
            divs[context.currentPage].style['z-index'] = '1';            
        }

        if (context.statusDiv?.style?.color == 'gray') {
            context.statusDiv.textContent = (
                `${context.currentPage}/${config.pages.length}, ${togo}: ${config.pages[context.currentPage]}`
            );
        }

        setTimeout(()=>{
            updateCycleView(config, context)
        }, 1000*Math.min(config.interval/5.0, 5));
    }

        
    function holdCycleView(config, context) {
        if (! context.isInCycleViewMode) {
            return;
        }
        context.nextUpdate = time() + config.pauseLength;
            
        context.statusDiv.style.color = 'red';
        context.statusDiv.textContent = (
            `Cycle view is paused for ${config.pauseLength} sec;  click here to switch to the tile view`
        );
            
        setTimeout(()=>{
            context.statusDiv.style.color = 'gray';
        },10000);
    }

    
    function switchToCycleView(config, context) {
        let divs = document.querySelectorAll('.cruise-page');
        context.headerDiv.style.display = 'block';
        for (let i = 0; i < divs.length; i++) {
            let div = divs[i];
            let iframe = div.querySelector('iframe');
            let cover = div.querySelector('div');
            
            iframe.style.width = '100%';
            iframe.style.height = (window.innerHeight-25) + 'px';
            iframe.style.transform = '';

            cover.style.display = 'none';
            
            div.style.left = '0';
            div.style.top = '20px';
            div.style.width = '100%';
            div.style.height = '';
            div.style.margin = '0';

            if (i == context.currentPage) {
                div.style['z-index'] = '1';
            }
            else {
                divs[i].style['z-index'] = '0';
            }

            iframe.contentWindow.postMessage('resize', '*');
        }
        
        context.isInCycleViewMode = true;
        updateCycleView(config, context);
    }


    function switchToTileView(config, context) {
        context.isInCycleViewMode = false;
        context.headerDiv.style.display = 'none';
        
        let divs = document.querySelectorAll('.cruise-page');
        const n = divs.length;
        const [ncols, nrows] = n > 6 ? [3, 3] : n > 4 ? [3, 2] : n > 2 ? [ 2, 2 ] : [2, 1];

        const margin = 5;
        const winWidth = window.innerWidth - margin;
        const winHeight = window.innerHeight - margin;
        const outerWidth = Math.floor(winWidth / ncols);
        const outerHeight = Math.floor(winHeight / nrows);
        const width = outerWidth - margin;
        const height = outerHeight - margin;
        const scale = Math.min(width/winWidth, height/winHeight);
        for (let i = 0; i < n; i++) {
            let div = divs[i];
            let iframe = div.querySelector('iframe');
            let cover = div.querySelector('div');
                
            div.style.margin = "0";
            div.style.width = width + "px";
            div.style.height = height + "px";
            div.style.left = (outerWidth * (i % ncols) + margin) + "px";
            div.style.top = (outerHeight * Math.floor(i / ncols) + margin) + "px";
            div.style.overflow = "hidden";
            div.style['z-index'] = '1';
            
            iframe.style.width = width / scale + "px";
            iframe.style.height = height / scale + "px";
            iframe.style.transform = 'scale(' + scale + ')';
            iframe.style['transform-origin'] = '0 0';

            cover.style.width = width / scale + "px";
            cover.style.height = height / scale + "px";
            cover.style.display = 'block';

            iframe.contentWindow.postMessage('resize', '*');
        }
    }

    
    window.addEventListener('DOMContentLoaded', e => {
        loadConfig((config) => {
            if (config.pages.length == 0) {
                return;
            }
            
            let context = build(config);
            if (config.view == 'tile') {
                switchToTileView(config, context);
            }
            else {
                switchToCycleView(config, context);
            }

            let resize = () => {
                if (context.isInCycleViewMode) {
                    switchToCycleView(config, context);
                }
                else {
                    switchToTileView(config, context);
                }

                // send the resize message to the page iframes, in case an autocruise is nested in the iframe
                let pageDivs = document.querySelectorAll('.cruise-page');
                const n = pageDivs.length;
                for (let i = 0; i < n; i++) {
                    let iframe = pageDivs[i].querySelector('iframe');
                    iframe.contentWindow.postMessage('resize', '*');
                }
            });
            
            window.addEventListener('resize', e => {  // top-level autocruise: window event
                resize();
            });
            window.addEventListener('message', e => { // nested autocruise: message from parent
                if (e.data === 'resize') {
                    resize();
                }
            });
        });
    });

})();
