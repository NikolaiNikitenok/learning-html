window.addEventListener('DOMContentLoaded', function() {
	let messages = {
		'code-result': {
			ru: 'Результат выполнения кода',
			en: '',
		},
		'open-window': {
			ru: 'открыть в дочернем окне',
			en: 'open in a new child window',
		},
		'categories-filter': {
			ru: 'фильтр категорий',
			en: '',
		},
		'task': {
			ru: 'Задача',
			en: '',
		},
		'puzzle-task': {
			ru: 'Занимательная задача',
			en: '',
		},
		'open-puzzle-solution': {
			ru: 'открыть решение задачи',
			en: '',
		},
		'study-theory-on-those-links': {
			ru: 'Изучите теорию по следующим ссылкам',
			en: 'Learn the theory at the following links',
		},
		
		'authenticate' : {
			ru: 'авторизуйтесь',
			en: 'authenticate',
		},
		'error' : {
			ru: 'ошибка',
			en: 'error',
		},
		'use-another-browser' : {
			ru: 'используйте браузер Chrome или Mozilla последней версии',
			en: 'use the latest Chrome or Mozilla browser',
		},
		'back-to-reading' : {
			ru: 'вернутся к чтению страницы',
			en: 'back to reading the page',
		},
		'lesson' : {
			ru: 'урок',
			en: 'lesson',
		},
		'of' : {
			ru: 'из',
			en: 'of',
		},
	}
	
	let lang = window.gLocation.lang;
	
	window._x = function(key) {
		if (key !== null && key != undefined) {
			if (lang && messages[key] && messages[key][lang]) {
				return messages[key][lang];
			} else {
				return key;
			}
		} else {
			return '';
		}
	}
});

