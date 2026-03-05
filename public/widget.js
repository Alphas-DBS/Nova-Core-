// NovaAgent Enterprise Widget Loader
(function() {
    const config = window.novaConfig || { primaryColor: '#00f3ff' };
    
    const container = document.createElement('div');
    container.id = 'nova-agent-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    
    const iframe = document.createElement('iframe');
    iframe.src = `https://ais-dev-normu3u73kj7isxxbz6qlz-130849784325.us-east1.run.app/agent?apiKey=${config.apiKey}`;
    iframe.style.width = '400px';
    iframe.style.height = '600px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '20px';
    iframe.style.boxShadow = '0 20px 50px rgba(0,0,0,0.3)';
    iframe.style.display = 'none';
    
    const toggle = document.createElement('button');
    toggle.innerHTML = '🤖';
    toggle.style.width = '60px';
    toggle.style.height = '60px';
    toggle.style.borderRadius = '50%';
    toggle.style.backgroundColor = config.primaryColor;
    toggle.style.border = 'none';
    toggle.style.cursor = 'pointer';
    toggle.style.fontSize = '30px';
    toggle.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
    
    toggle.onclick = () => {
        iframe.style.display = iframe.style.display === 'none' ? 'block' : 'none';
    };
    
    container.appendChild(iframe);
    container.appendChild(toggle);
    document.body.appendChild(container);
})();
