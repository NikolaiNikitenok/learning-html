(function() {
	
	window.gLocation = {
		path: '',
		domain: '',
		lang: '',
		place: '',
		base: '',
		ref: '',
	};
	
	let pathname = normalizePathname(window.location.pathname);
	
	if (window.location.hash.startsWith('#r=')) {
		let matchi = window.location.hash.match(/#r=(.+)/);
		
		if (matchi && matchi[1]) {
			window.gLocation.ref = matchi[1];
		}
	}
	
	if (window.location.origin === 'file://') {
		window.gLocation.domain = 'code.mu.off';
		window.gLocation.place = 'off';
		
		let matchi = pathname.match(/(.+?\/code\.mu\.off)(\/.+)\.html$/);
		
		if (matchi && matchi[1] && matchi[2]) {
			window.gLocation.base = matchi[1];
			window.gLocation.path = matchi[2] + '/';
		} else {
			alert('don\'t change the name of the folder "code.mu.off"');
			
			if(window.stop !== undefined) {
				window.stop();
			} else if (document.execCommand !== undefined) { // для IE
				document.execCommand("Stop", false);
			}
			return;
		}
		
	} else {
		window.gLocation.base = '';
		window.gLocation.path = window.location.pathname;
		window.gLocation.domain = window.location.hostname;
		
		if (window.location.origin.endsWith('.local')) {
			window.gLocation.place = 'local';
		} else {
			window.gLocation.place = 'online';
		}
	}
	
	let matchi = window.gLocation.path.match(/^\/(\w\w)\//);
	if (matchi && matchi[1]) {
		window.gLocation.lang = matchi[1];
	}
	
	function normalizePathname(pathname) {
		return pathname.replace(/\\/g, '/');
	}
})();
