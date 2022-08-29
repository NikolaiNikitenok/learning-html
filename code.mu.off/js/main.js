
window.addEventListener('DOMContentLoaded', function() {
	// Разворот ифреймов
		(function() {
			let iframes = document.querySelectorAll('iframe[srcdoc]:not([style])');
		
			for (let iframe of iframes) {
				iframe.addEventListener('load', function() {
					setFullHeight(iframe);
				});
				
				if (iframe.height === '0') {
					setFullHeight(iframe); // если загрузка раньше случилась
				}
				
				// solution - там релоад ифреймов по нажатию сделан
			}
			
			let timeoutId;
			let pageWidth = document.documentElement.clientWidth;
			window.addEventListener('resize', function() {
				if (pageWidth !== document.documentElement.clientWidth) {
					clearInterval(timeoutId);
					
					timeoutId = setTimeout(() => {
						for (let iframe of iframes) {
							setFullHeight(iframe);
						}
					}, 1000);
				}
				
				pageWidth = document.documentElement.clientWidth;
			});
			
			function setFullHeight(iframe) {
				let inner = iframe.contentWindow.document;
				
				let scrollHeight = Math.max(
					inner.body.scrollHeight, inner.documentElement.scrollHeight,
					inner.body.offsetHeight, inner.documentElement.offsetHeight,
					inner.body.clientHeight, inner.documentElement.clientHeight
				);
				
				let style = window.getComputedStyle(iframe);
				let fullHeight;
				
				if (style.boxSizing === 'border-box') {
					fullHeight = scrollHeight + parseInt(style.paddingTop) + parseInt(style.paddingBottom) + parseInt(style.borderTopWidth) + parseInt(style.borderBottomWidth);
				} else {
					fullHeight = scrollHeight;
				}
				
				if (+iframe.height !== fullHeight) {
					iframe.height = fullHeight;
				}
				
				iframe.height = +iframe.height + 5; // 5 эмпирически, тк возникала небольшая полоса прокрутки. Может с кодом выше что-то не то?
			}
		})();
	//-
	
	// Нормализатор меню
	// для off версии - до главного меню
		(function() {
			let menu = document.querySelector('[data-module="menu"]');
			
			if (menu) {
				let elems = menu.querySelectorAll('a');
				
				for (let elem of elems) {
					let href = clearOffHref(elem.getAttribute('href'));
					elem.setAttribute('data-href', href);
				}
			}
		})();
	//-
	// Главное меню
		(function() {
			let module = document.querySelector('[data-module="mainmenu"]');
			let url = window.gLocation.path;
			
			if (module) {
				// Главное меню
					(function() {
						module.insertAdjacentHTML('afterbegin', '<div class="arrow"><span>&larr;</span></div>');
						module.insertAdjacentHTML('afterbegin', '<div class="header"></div>');
						
						let arrow  = module.querySelector('.arrow');
						let header = module.querySelector('.header');
						let main   = module.querySelector('.main');
						
						let openers = main.querySelectorAll('[data-open]');
						for (let opener of openers) {
							opener.addEventListener('click', function(event) {
								let targetName = opener.dataset.open;
								let target = module.querySelector('.sub[data-name="' + targetName + '"]');
								
								if (target) {
									main.classList.remove('active');
									
									header.innerHTML = opener.innerHTML + ':';
									
									target.classList.add('active');
									header.classList.add('active');
									arrow .classList.add('active');
									module.classList.add('sub-mode');
								}
							});
							
							event.preventDefault();
						}
						
						arrow.addEventListener('click', function(event) {
							module.querySelector('.sub.active').classList.remove('active');
							
							header.classList.remove('active');
							arrow .classList.remove('active');
							module.classList.remove('sub-mode');
							
							main.classList.add('active');
						});
					}());
				//-
			}
			
			if (module && url != '/') {
				// Активатор главного меню
					(function() {
						{
							let elems = module.querySelectorAll('section.main > span[data-href]');
							
							if (elems) {
								elems = Array.from(elems);
								elems.sort(function(a, b) {
									if (a.dataset.href.length < b.dataset.href.length) {
										return 1;
									} else {
										return -1;
									}
								});
								
								for (let elem of elems) {
									let href = elem.dataset.href;
									
									if (href != '' && url.startsWith(href)) {
										elem.classList.add('active');
										break;
									}
								}
							}
						}
						{
							let elems = module.querySelectorAll('section a');
							
							for (let elem of elems) {
								let href = elem.getAttribute('href'); // обязательно через getAttribute
								
								href = href.replace(/^(\.\.\/)+/g, '/').replace(/\.html$/, ''); // для off
								
								if (href != '' && url.startsWith(href)) {
									elem.classList.add('active');
								}
							}
						}
					}());
				//-
				// Ссылка на меню раздела
					(function() {
						module.insertAdjacentHTML('afterbegin', `<div class="sidebar"></div>`);
						let sidebar = module.querySelector('.sidebar');
						
						// Меню раздела
						if (sidebar) {
							sidebar.insertAdjacentHTML('afterbegin', '<div class="pointer"></div>');
							let pointer = sidebar.querySelector('.pointer');
							
							let menu = document.querySelector('[data-module="menu"]');
							
							if (pointer && menu) {
								let referrer = window.gLocation.ref;
								
								if (referrer) {
									let active = menu.querySelector('a[data-href="' + referrer + '"]');
									
									if (active) {
										active.classList.add('active');
										pointer.innerHTML = '<a href="' + createCommonHref(referrer) + '">' + _x('back-to-reading') + '</a>';
									}
								}
							}
							
							if (pointer && !menu) {
								let pages = document.querySelector('section.pages');
								
								if (pages) {
									let href = createCommonHref(pages.dataset.url) + '#r=' + window.gLocation.path;
									
									if (pages.dataset.hash !== '') {
										pointer.innerHTML = '<span class="hash">' + '⊗' + pages.dataset.hash + '</span>'; // ⋕
									}
									
									pointer.innerHTML += '<span class="num">' + pages.dataset.num + ' of ' + pages.dataset.quantity + '</span><a href="' + href + '" class="open-menu">menu</a>';
								
									let hashLink = pointer.querySelector('.hash');
									if (hashLink) {
										hashLink.addEventListener('click', function() {
											copyToClipBoard(this.textContent);
										});
									}
								}
							}
						}
					}());
				//-
			}
		}());
	//-
	// Меню
		(function() {
			let menu = document.querySelector('[data-module="menu"]');
			
			if (menu) {
				let url = window.gLocation.path;
				
				let mode = menu.dataset.mode;
				
				if (mode == 'tabs') {
					// Секция с алфавитом
						let elems = menu.querySelectorAll('a:not([data-header])');
						
						if (elems) {
							function clear(href) {
								let name = href.match(/\/([^/]+)\/$/)[1].toLowerCase();
								
								if (name.indexOf('.') == -1) {
									return name;
								} else {
									return name.match(/\.([^.]+)$/)[1];
								}
							}
							
							let result = {
								a: [], b: [], c: [], d: [], e: [], f: [], j: [], k: [],
								l: [], m: [], n: [], o: [], p: [], q: [], r: [], s: [],
								t: [], u: [], v: [], w: [], x: [], y: [], z: [],
							};
							for (let elem of elems) {
								let name = clear(elem.dataset.href);
								
								if (!result[ name[0] ]) {
									result[ name[0] ] = []; // на случай если начало не с буквы
								}
								
								result[ name[0] ].push({elem, name});
							}
							
							let section = document.createElement('section');
							section.dataset.name = 'a-z';
							section.classList.add('sorted');
							menu.insertAdjacentElement('afterbegin', section);
							
							for (let letter in result) {
								if (result[letter].length > 0) {
									let h2 = document.createElement('h2');
									h2.innerHTML = letter.toUpperCase();
									section.appendChild(h2);
									
									let div = document.createElement('div');
									section.appendChild(div);
									
									for (let item of result[letter]) {
										div.appendChild(item.elem.cloneNode(true));
									}
								}
							}
						}
					//-
					// Вкладки
						// todo: в офлайн версии не работает
						
						let sections = menu.querySelectorAll('section');
						
						let str = `<div class="tabulator"></div>`;
						menu.insertAdjacentHTML('beforebegin', str);
						let tabulator = document.querySelector('.tabulator');
						
						if (sections) {
							let hash = window.location.hash;
							let referrer = document.referrer;
							if (referrer) {
								referrer = referrer.replace(/http:\/\/[^/]+?\//, '/');
							}
							let openSectionMenu = referrer && hash && hash.endsWith('#open-section-menu');
							
							for (let section of sections) {
								let ref = document.createElement('span');
								ref.classList.add('ref');
								ref.innerHTML = section.dataset.name;
								tabulator.appendChild(ref);
								
								if (section.matches('.sorted')) {
									ref.classList.add('sorted');
								}
								
								if (openSectionMenu && !section.matches('.sorted') && section.querySelector('a[href="' + referrer + '"]')) {
									section.classList.add('active');
									ref.classList.add('active');
								}
							}
							
							if (!tabulator.querySelector('.ref.active')) {
								let tabSorted = tabulator.querySelector('.ref.sorted');
								if (tabSorted) {
									tabSorted.classList.add('active')
								}
								
								let sectionSorted = menu.querySelector('section.sorted');
								if (sectionSorted) {
									sectionSorted.classList.add('active')
								}
							}
							
							
							let refs = tabulator.querySelectorAll('.ref');
							
							for (let ref of refs) {
								ref.addEventListener('click', function() {
									let activeSection = menu.querySelector('section.active');
									if (activeSection) {
										activeSection.classList.remove('active');
									}
									
									let activeRef = tabulator.querySelector('.ref.active');
									if (activeRef) {
										activeRef.classList.remove('active');
									}
									
									this.classList.add('active');
									menu.querySelector('section[data-name="'+ this.innerHTML +'"]').classList.add('active');
								});
							}
						}
					//-
				}
				
				// TODO: рефакторинг
				if (mode == 'tags') {
					let tags = [];
					
					let elems = menu.querySelectorAll('.tags');
					for (let elem of elems) {
						let names = elem.innerHTML.split(', ');
						
						for (let name of names) {
							if (tags.indexOf(name) == - 1) {
								tags.push(name);
							}
						}
					}
					
					let str = `
						<div class="filter">
							<div class="header"><a href="#">${_x('categories-filter')}</a></div>
							<div class="field"></div>
						</div>
					`;
					menu.insertAdjacentHTML('beforebegin', str);
					let filter = document.querySelector('.filter');
					let field  = filter.querySelector('.field');
					let header = filter.querySelector('.header');
					
					header.addEventListener('click', function(event) {
						field.classList.toggle('active');
						event.preventDefault();
					});
					
					for (let tag of tags) {
						field.insertAdjacentHTML('beforeend', '<span class="ref">' + tag + '</label>');
					}
					
					let refs = field.querySelectorAll('.ref');
					for (let ref of refs) {
						ref.addEventListener('click', function() {
							if (this.matches('.active')) {
								this.classList.remove('active');
								
								let items = menu.querySelectorAll('a');
								for (let item of items) {
									item.classList.remove('hidden');
								}
							} else {
								let activeRef = field.querySelector('.ref.active');
								if (activeRef) {
									activeRef.classList.remove('active')
								}
								
								this.classList.add('active');
								
								let tag = this.innerHTML.replace('#', '');
								
								let items = menu.querySelectorAll('a');
								for (let item of items) {
									let tagsElem = item.querySelector('.tags');
									if (tagsElem) {
										let arr = tagsElem.innerHTML.split(', ');
										
										if (arr.indexOf(tag) != -1) {
											item.classList.remove('hidden');
										} else {
											item.classList.add('hidden');
										}
									}
								}
							}
						});
					}
				}
			}
		}());
	//-
	// Нумерация меню
		(function() {
			let menu = document.querySelector('[data-module="menu"]');
			
			if (menu) {
				let mode = menu.dataset.mode;
				
				let headersType = menu.dataset.headersType;
				if (!headersType) headersType = 'normal';
				
				if (mode == 'hash') {
					let bookName = menu.dataset.book;
					let sections = menu.querySelectorAll('[data-section]');
					
					for (let section of sections) {
						let sectionName = section.dataset.section;
						
						let elems = section.querySelectorAll('a');
						for (let elem of elems) {
							let lessonName = elem.dataset.lesson;
							let hash = bookName + sectionName + lessonName;
							
							elem.innerHTML = '<span class="text">' + elem.innerHTML + '</span><span class="hash">' + hash + '</span>'; // ⋕
							
							elem.insertAdjacentHTML('afterBegin', '<span class="counter"><span class="-asc-"></span></span>');
							
							let label = elem.querySelector('.__label__');
							if (label) {
								elem.append(label);
							}
							
							//elem.insertAdjacentHTML('afterBegin', '<span class="hash">' + hash + '</span>');
						}
					}
					
					
				} else {
					let elems = menu.querySelectorAll('a');
				
					if (elems) {
						for (let elem of elems) {
							if (mode == 'plain') {
								elem.innerHTML = '<span class="text">' + elem.innerHTML + '</span>';
								elem.insertAdjacentHTML('afterBegin', '<span class="counter"><span class="-asc-"></span></span>');
							}
							
							if (mode == 'tabs') {
								elem.innerHTML = '<span class="text">' + elem.innerHTML + '</span>';
								
								if (elem.dataset.header) {
									elem.insertAdjacentHTML('afterBegin', '<span class="header">' + elem.dataset.header + '</span>');
								} else {
									let match = elem.dataset.href.match(/\/([^\/]+?)\/?$/);
									
									if (match[1]) {
										if (headersType == 'normal') {
											let header = match[1];
											elem.insertAdjacentHTML('afterBegin', '<span class="header">' + header + '</span>');
										}
										
										if (headersType == 'sql') {
											let header = match[1].replace('-', ' ').toUpperCase();
											elem.insertAdjacentHTML('afterBegin', '<span class="header sql">' + header + '</span>');
										}
		
									}
								}
							}
							
							if (mode == 'tags') {
								elem.classList.add('retain');
								
								let tags = elem.querySelector('.tags');
								if (tags) {
									elem.removeChild(tags);
									elem.innerHTML = '<span class="link">' + elem.innerHTML + '</span>';
									elem.insertAdjacentHTML('afterBegin', '<span class="counter"><span class="-desc-"></span></span>');
									elem.insertAdjacentElement('beforeEnd', tags);
									
									let menu = document.querySelector('[data-module="menu"]');
									if (menu) {
										menu.style.counterIncrement = '-desc- ' + (elems.length + 1);
									}
									
								}
							}
						}
					}
				}
			}
			
			// Префиксы и постфиксы
			if (menu) {
				let elems = menu.querySelectorAll('a[data-prefix], a[data-postfix]');
				
				for (let elem of elems) {
					let header = elem.querySelector('.header');
					
					if (header) {
						let prefix  = elem.dataset.prefix ? elem.dataset.prefix: '';
						let postfix = elem.dataset.postfix ? elem.dataset.postfix: '';
						
						header.innerHTML = prefix + header.innerHTML + postfix;
					}
				}
			}
			if (menu) {
				let elems = menu.querySelectorAll('a[data-fix]');
				
				for (let elem of elems) {
					let header = elem.querySelector('.header');
					
					if (header) {
						header.innerHTML = '<span class="tag-bracket">&lt;</span>' + header.innerHTML + '<span class="tag-bracket">&gt;</span>';
					}
				}
			}
		}());
	//-
	// Ссылка с теста
		/*
			⋕
			?p=In:Sr,Nm;Cl;Lp;
			
			Lp - последний без уроков, после него все далее будут
		*/
		(function() {
			let paramsString= document.location.search;
			let searchParams = new URLSearchParams(paramsString);
			let plan = searchParams.get('p');
			let menu = document.querySelector('[data-module="menu"]');
			
			if (plan && menu) {
				let sections = plan.replace(/;$/, '').split(';');
				
				let i = 1;
				for (let section of sections) {
					let [sectionName, lessonsString] = section.split(':');
					let sectionBlock = menu.querySelector('[data-section="'+ sectionName +'"]');
					
					if (sectionBlock) {
						if (lessonsString) {
							let lessonsArray = lessonsString.split(',');
							
							for (let lessonName of lessonsArray) {
								let lessonLink = menu.querySelector('[data-lesson="'+ lessonName +'"]');
								
								if (lessonLink) {
									lessonLink.classList.add('study');
								}
							}
						} else {
							if (i === sections.length) {
								sectionBlock.classList.add('study');
								sectionBlock.classList.add('study-further');
							} else {
								sectionBlock.classList.add('study');
							}
						}
					}
					
					i++;
				}
				
				;(function() {
					let sections = menu.querySelectorAll('div[data-section]');
					
					for (let section of sections) {
						if (!section.matches('.study')) {
							let skipLinks = section.querySelectorAll('a:not(.study)');
							
							for (let skipLink of skipLinks) {
								skipLink.classList.add('skip');
							}
						}
						
						if (section.matches('.study-further')) {
							break;
						}
					}
				})();
			}
			
		}());
	// Подсветка кода
		(function() {
			let highlighter = new Highlighter();
			let elems = document.querySelectorAll('code[data-module="highlight"]');
			
			if (elems) {
				for (let elem of elems) {
					elem.innerHTML = highlighter.handle(elem.innerHTML, elem.dataset.lang);
				}
			}
		}());
	//-
	// Отключение автозаполнения
		(function() {
			let elems = document.querySelectorAll('input');
			
			if (elems) {
				for (let elem of elems) {
					let attr = elem.getAttribute('autocomplete');
					
					if(attr != 'on') {
						elem.setAttribute('autocomplete', 'off');
					}
				}
			}
		}());
	//-
	// Нумерация и id задач
		(function() {
			let elems = document.querySelectorAll('div.task:not(.puzzle)');
			
			if (elems) {
				let lessonNum;
				let lessonHash;
				
				let pages = document.querySelector('section.pages');
				if (pages) {
					lessonNum = pages.dataset.num;
					lessonHash = pages.dataset.hash;
				}
				
				let i = 1;
			
				for (let elem of elems) {
					
					elem.insertAdjacentHTML('afterBegin', '<p class="header">' + ' <span class="num">№' + i + '</span></p>'); // + _x('task')
					
					let numElem = elem.querySelector('.num');
					numElem.addEventListener('click', function() {
						copyToClipBoard(this.textContent);
					});
					
					
					if (lessonHash) {
						let header = elem.querySelector('.header');
						
						let hashBlock = document.createElement('span');
						hashBlock.classList.add('hash');
						header.append(hashBlock);
						
						let taskHash = '⊗' + lessonHash; // ⋕
						
						let hashLink = document.createElement('span');
						hashLink.textContent = taskHash;
						hashBlock.append(hashLink);
						
						hashLink.addEventListener('click', function() {
							copyToClipBoard(taskHash);
						});
						elem.id = i;
					}
					
					i++;
				}
			}
		}());
		(function() {
			let elems = document.querySelectorAll('div.task:not(.puzzle)');
			
			if (elems) {
				for (let elem of elems) {
					let pars = elem.querySelectorAll('p:not(.header)');
					
					for (let par of pars) {
						if (par.textContent.length <= 100) {
							par.classList.add('short');
						}
					}
				}
			}
		}());
	//-
	
	// Занимательные задачи
		(function() {
			/*
			let puzzle = document.querySelector('div.task.puzzle');
			if (puzzle) {
				//puzzle.insertAdjacentHTML('afterBegin', '<p class="header">' + _x('puzzle-task') + '</p>');
				
			}
			*/
			
			let solution = document.querySelector('[data-module="solution"]');
			if (solution) {
				solution.insertAdjacentHTML('afterBegin', `
					<div class="switcher">
						<a href="#solution">` + _x('open-puzzle-solution') + `</a>
					</div>
				`);
				
				let switcher = solution.querySelector('.switcher');
				switcher.addEventListener('click', function(event) {
					solution.classList.toggle('active');
					
					let iframes = solution.querySelectorAll('iframe[srcdoc]');
					for (let iframe of iframes) {
						console.log('reload');
						iframe.contentWindow.location.reload();
					}
				});
				
				let hash = window.location.hash;
				if (hash == '#solution') {
					solution.classList.add('active');
				}
			}
		}());
	//-
	// Блок .ref
		(function() {
			let elems = document.querySelectorAll('div.ref');
			
			if (elems) {
				for (let elem of elems) {
					let tmp = elem.innerHTML;
					elem.innerHTML = '';
					elem.insertAdjacentHTML('afterBegin', '<p>' + tmp + '</p>');
					
					elem.insertAdjacentHTML('afterBegin', '<p>' + _x('study-theory-on-those-links') + ':</p>');
				}
			}
		}());
	//-
	// Coder
		(function() {
			let img = document.querySelector('[data-module="coder"]');
			
			if (img) {
				function addZero(num) {
					if (num <= 9) {
						num = '0' + num;
					}
					
					return num;
				}

				let date = new Date();
				let time = addZero(date.getHours()) + ':' + addZero(date.getMinutes());
				let day = date.getDay();
				
				let action;
				if (day != 0 && day != 6) {
					if (time <= '09.00' || time >= '22.00') {
						action = 'sleep';
					} else if ((time >= '10.00' && time <= '11.00') || (time >= '14.00' && time <= '15.00')) {
						action = 'break';
					} else if (time >= '17.00' && time <= '22.00') {
						action = 'relax';
					} else {
						action = 'job';
					}
				} else {
					action = 'holiday';
				}
				
				img.src = '/images/coder/' + action + '.png';
				img.style.display = 'inline-block';
			}
		}());
	//-
	// Opener - просмотр кода в окнах
		(function() {
			let elems = document.querySelectorAll('[data-module="opener"][data-type="win"]');
			
			if (elems) {
				for (let elem of elems) {
					elem.addEventListener('click', function(event) {
						let winWidth = window.outerWidth; // outer свойства не меняют значения при масштабировании страницы
						let winHeight = window.outerHeight;
						
						let horShift = 100;
						let verShift = 130;
						
						let left = window.screenX + horShift;
						let top  = window.screenY + verShift;
						
						let width = winWidth  - 2 * horShift;
						let height = winHeight - 2 * verShift;
						
						let date = new Date();
						let newWin = window.open('about:blank', date.getTime(), 'left='+left+',top='+top+',width='+width+',height='+height+',location=no');
						
						let srcdoc = this.querySelector('div[srcdoc]').getAttribute('srcdoc');
						newWin.document.write(srcdoc);
						
						event.preventDefault();
					});
				}
			}
		}());
		(function() {
			let elems = document.querySelectorAll('[data-module="opener"][data-type="page"]');
			
			if (elems) {
				for (let elem of elems) {
					elem.addEventListener('click', function(event) {
						let winWidth = window.innerWidth;
						let winHeight = window.innerHeight;
						
						let left = 0;
						let top = 0;
						
						let width = screen.width;
						let height = screen.height;
						
						let date = new Date();
						let newWin = window.open('about:blank', date.getTime(), 'left='+left+',top='+top+',width='+width+',height='+height+',location=no,menubar=no');
						
						let srcdoc = this.querySelector('div[srcdoc]').getAttribute('srcdoc');
						newWin.document.write(srcdoc);
						
						event.preventDefault();
					});
				}
			}
		}());
	//-
	// Opener - маленький размер
		/*
		(function() {
			let elems = document.querySelectorAll('[data-module="opener"]');
			
			if (elems) {
				for (let elem of elems) {
					elem.addEventListener('click', function(event) {
						let winWidth = window.innerWidth;
						let winHeight = window.innerHeight;
						
						let horShift = 100;
						let verShift = 100;
						
						let left = horShift + (screen.width - window.innerWidth);
						let top = verShift / 2 + (screen.height - window.innerHeight); // подобрал эмпирически
						
						let width = winWidth - 2 * horShift;
						let height = winHeight - 2 * verShift;
						
						let date = new Date();
						let newWin = window.open('about:blank', date.getTime(), 'left='+left+',top='+top+',width='+width+',height='+height+',location=no');
						
						let srcdoc = this.querySelector('div[srcdoc]').getAttribute('srcdoc');
						newWin.document.write(srcdoc);
						
						event.preventDefault();
					});
				}
			}
		}());
		*/
	//-
	// localizer
		(function() {
			let elems = document.querySelectorAll('[data-x]');
			
			if (elems) {
				for (let elem of elems) {
					elem.innerHTML = _x(elem.dataset.x);
				}
			}
		}());
	//-
});
// Вспомогательные функции
	function copyToClipBoard(data) {
		let input = document.createElement('input');
		input.value = data;
		input.style.position = 'absolute';
		input.style.left = '-300px';
		document.body.append(input);
		input.select();
		document.execCommand('copy');
		input.remove();
	}
	
	function createCommonHref(href) {
		if (window.gLocation.place === 'off') {
			return window.gLocation.base + href.replace(/\/$/, '') + '.html';
		} else {
			return href;
		}
	}
	
	function clearOffHref(href) {
		if (window.gLocation.place === 'off') {
			return href.replace(/^(\.\.\/)+/, '/').replace(/\.html/, '/');
		} else {
			return href;
		}
	}
//-
	
window.addEventListener('load', function() {
	// Редактирование
		(function() {
			if (window.gLocation.place === 'local') {
				window.addEventListener('keydown', function(event) {
					if (event.ctrlKey && event.code === 'NumpadEnter') {
						let url = window.location.pathname;
						let host = window.location.hostname;
						
						let convertedUrl = url.replace(/^\/([a-z]{2})\/(.+)/, '$2$1.html');
						
						let path = '/var/www/' + host + '/content/' + convertedUrl;
						
						window.open('http://editor.local/file.php?path=' + path, '_blank');
					}
				});
			}
		}());
	//-
	// Метки меню
		(function() {
			if (window.gLocation.place === 'local') {
				let elems = document.querySelectorAll('.__label__, .__todo__');
				
				if (elems) {
					for (let elem of elems) {
						elem.style.display = 'block';
					}
				}
			}
		}());
	//-
	// Скриншоты - отладка
		(function() {
			let elems = document.querySelectorAll('.screenshot');
			
			if (elems && window.gLocation.place === 'local') {
				let info = document.createElement('span');
				info.style.position = 'absolute';
				info.style.zIndex = '1';
				info.style.background = '#F4F4F4';
				info.style.padding = '5px';
				info.style.display = 'none';
				
				document.body.appendChild(info);
				
				for (let elem of elems) {
					elem.onmousemove = function(event) {
						info.style.left = (event.pageX + 20) + 'px';
						info.style.top = event.pageY - 20 + 'px';
						info.innerHTML = event.offsetX + ' ' + event.offsetY;
					}
					
					elem.onmouseover = function(event) {
						info.style.display = 'inline';
					}
					elem.onmouseout = function(event) {
						info.style.display = 'none';
					}
				}
			}
		}());
	//-
	// Скриншоты
		(function() {
			let elems = document.querySelectorAll('.screenshot');
			
			if (elems) {
				window.addEventListener('resize', function() {
					for (let elem of elems) {
						let img = elem.querySelector('img');
						setInCenter(elem, img);
					}
				});
				
				for (let elem of elems) {
					let img = elem.querySelector('img');
					setInCenter(elem, img);
					cropImage(elem, img);
					
					let arrows = elem.querySelectorAll('.mark[data-type="arrow"]');
					for (let arrow of arrows) {
						let canvas = document.createElement('canvas');
					
						let height = 30;
						let width = +arrow.dataset.length;
						canvas.height = height;
						canvas.width = width;
						
						canvas.style.left = +arrow.dataset.x + 'px';
						canvas.style.top = +arrow.dataset.y - height / 2 + 'px'; 
						
						canvas.style.transform = 'rotate(' + arrow.dataset.angle + 'deg)';
						
						elem.appendChild(canvas);
						
						let ctx = canvas.getContext('2d');
						ctx.strokeStyle = 'red';
						ctx.fillStyle = 'red';
						ctx.lineWidth = 5;
						
						drawArrow(ctx, width, height);
					}
					
					let texts = elem.querySelectorAll('.mark[data-type="text"]');
					for (let text of texts) {
						text.style.left = text.dataset.x + 'px';
						text.style.top = text.dataset.y + 'px';
					}
					
					let rects = elem.querySelectorAll('.mark[data-type="rect"]');
					for (let rect of rects) {
						rect.style.width = rect.dataset.width + 'px';
						rect.style.height = rect.dataset.height + 'px';
						rect.style.left = rect.dataset.x + 'px';
						rect.style.top = rect.dataset.y + 'px'; 
					}
				}
				
				function drawArrow(ctx, width, height) {
					ctx.beginPath();
					ctx.moveTo(10, height / 2);
					ctx.lineTo(width, height / 2);
					ctx.stroke();
					
					ctx.beginPath();
					ctx.moveTo(0, height / 2);
					ctx.lineTo(40, 3);
					ctx.lineTo(30, height / 2);
					ctx.lineTo(40, height - 3);
					ctx.lineTo(0, height / 2);
					ctx.fill();
					
				}
				
				function setInCenter(elem, img) {
					let center;
					
					if (img.dataset.center) {
						center = +img.dataset.center
					} else {
						let arrows = elem.querySelectorAll('.mark[data-type="arrow"]');
						
						if (arrows.length == 1) {
							center = +arrows[0].dataset.x;
						} else {
							center = 0;
						}
					}
					
					let centerX = center - elem.offsetWidth / 2;
					if (centerX > 0) {
						elem.scrollLeft = centerX;
					}
				}
				
				function cropImage(elem, img) {
					if (img.dataset.crop) {
						let points = img.dataset.crop.split(':');
						
						if (points.length == 1) {
							points[1] = elem.scrollHeight;
							console.log(points[1]);
						}
						
						let scrollLineSize = 15;
						elem.style.height = (points[1] - points[0] + scrollLineSize) + 'px';
						elem.scrollTop = points[0];
						
						elem.classList.add('cropped');
					}
				}
			}
		}());
	//-
	
});

