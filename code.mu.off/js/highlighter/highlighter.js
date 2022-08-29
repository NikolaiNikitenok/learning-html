class Highlighter {
	constructor() {
		this._totalCommands = this._getCommands();
	}
	
	handle(str, mode) {
		
		if (this._totalCommands[mode]) {
			let commands = this._totalCommands[mode];
			
			str = this._decodeHtmlSpecialChars(str);
			
			let clefts = this._getClefts(str);
			
			// костыль
			str = str.replace(/<\?php/g, '%?php');
			str = str.replace(/<\?=/g, '%?=');
			str = str.replace(/\?>/g, '?%');
			
			str = this._merge(this._tokenize({str, commands, mode}));
			str = this._handleClefts(str, clefts);
			str = this._addLineNumbers(str);
			
			// костыль
			str = str.replace(/%\?=/g, '&lt;?=');
			str = str.replace(/%\?php/g, '&lt;?php');
			str = str.replace(/\?%/g, '?&gt;');
			
			// костыль
			str = str.replace(/\/\/!!/g, '//');
		}
		
		return str;
	}
	
	/*
		clefts = [
			{type: "break", shift: 25, order: 1, total: 2, tabs: ""},
		];
		
		console.log(Object.assign([], clefts));
	*/
	_handleClefts(str, clefts) {
		function getFlatChildren(elems) {
			let result = [];
			
			for (let elem of elems) {
				let children = elem.children;
				
				if (children.length !== 0) {
					result = result.concat(getFlatChildren(children));
				} else {
					result.push(elem);
				}
			}
			
			return result;
		}
		
		let div = document.createElement('div');
		div.innerHTML = str;
		
		let children = getFlatChildren(div.children)
		
		let curCleft = clefts.shift();
		let counter = 0;
		
		let i = 0;
		while (curCleft !== undefined && i < children.length) {
			let elem = children[i];
			
			let text = elem.textContent;
			let length = text.length;
			
			if (counter + length >= curCleft.shift) {
				// первый найденный разрыв в токене
					let points = [];
					points.push({...curCleft, indent: curCleft.shift - counter});
				//-
				// проверяем, попадают ли в данный токен еще разрывы
					let j = 0;
					for (let cleft of clefts) {
						if (counter + length >= cleft.shift) {
							points.push({...cleft, indent: cleft.shift - counter});
							j++;
						}
					}
					clefts.splice(0, j);
				//-
				// добавляем спены с разрывами в текст
					let newText = '';
					for (let k = 0; k < points.length; k++) {
						let curr = points[k];
						let prevIndent = points[k - 1] ? points[k - 1].indent : 0;
						
						newText += this._encodeHtmlSpecialChars(text.substring(prevIndent, curr.indent));
						
						if (curr.type === 'break') {
							newText += '<span class="break break-' + curr.order + '-of-' + curr.total + '"><br><span>' + curr.tabs + '&#9;</span></span>';
						}
						if (curr.type === 'gap') {
							newText += '<span class="break break-gap-of-' + curr.total + '">&nbsp;</span>';
						}
					}
					newText += this._encodeHtmlSpecialChars(text.substring(points[points.length - 1].indent)); // добавляем хвост строки
					elem.innerHTML = newText;
				//-
				
				curCleft = clefts.shift();
			}
			
			counter += length;
			i++;
		}
		
		return div.innerHTML;
	}
	
	/*
		cleft - разрыв всей строки, - объект с позицией и типом,
		shift - отступ от начала строки
		
		старое
		let singleChunkSize = 32;
		let zeroChunkSize = 25;
		let chunkSize = 15;
		let tailSize = 6;
		let zeroTailSize = 10;
	*/
	_getClefts(str) {
		let points = [
			{
				value: '[^/][^/] ',
				priority: 0
			},
			{
				value: ' = ', 
				priority: 1
			},
			{
				value: ' \\. ',
				priority: 1
			},
			{
				value: ', ',
				priority: 1
			},
			{
				value: ' \\+ ',
				priority: 1
			},
			{
				value: ' - ',
				priority: 1
			},
			{
				value: ' \\* ',
				priority: 1
			},
			{
				value: ' [^<]\\/ ',
				priority: 1
			},
			{
				value: ' % ',
				priority: 1
			},
			{
				value: ' ?? ',
				priority: 1
			},
			{
				value: ' ? ',
				priority: 1
			},
			{
				value: ' && ',
				priority: 1
			},
			{
				value: ' or ',
				priority: 1
			},
			{
				value: ' and ',
				priority: 1
			},
			{
				value: ' \\|\\| ',
				priority: 1
			},
			{
				value: ' >= ',
				priority: 1
			},
			{
				value: ' <= ',
				priority: 1
			},
			{
				value: ' != ',
				priority: 1
			},
			{
				value: '>',
				priority: 1
			},
			{
				value: ' == ',
				priority: 1
			},
			{
				value: ' === ',
				priority: 1
			},
			{
				value: '\s=\s',
				priority: 1
			},
			{
				value: '\\(\\)',
				priority: 2
			},
			
			/*
			 {
				value: '\\]',
				priority: 2
			},
			{
				value: '\\)',
				priority: 2
			},
			{
				value: '"',
				priority: 3
			},
			{
				value: "'",
				priority: 3
			},
			*/
		];
		
		let hoarder = '';
		let result = [];
		
		let lines = str.split('\n');
		
		for (let i = 0; i < lines.length; i++) {
			let line = lines[i];
			let tabs = this._getTabs(line);
			
			let singleChunkSize = 32;
			let zeroChunkSize = 25;
			let chunkSize = 15;
			
			if (getRealLength(line) > singleChunkSize) {
				let counter = 0;
				let clefts = [];
				
				whileLoop:
				while (getRealLength(line) > chunkSize) {
					let cutLength = counter === 0 ? zeroChunkSize : chunkSize;
					
					let optimum;
					
					for (let point of points) {
						let regExp = new RegExp('^(.{' + (cutLength - 9) + '}.+?' + point.value + ')(.{2,})$', 'i');
						let match = line.match(regExp);
						
						if (match) {
							let length = match[1].length;
							let diff = cutLength - length;
							let mdiff = Math.abs(diff);
							
							if (!optimum || Math.abs(optimum.diff) > mdiff) {
								optimum = {diff: diff, chunck: match[1], rest: match[2]};
							}
							
							if (point.priority === 0 && diff >= -8 && diff <= 5 || point.priority === 1 && diff >= -8 && diff <= 5 || point.priority === 2 && mdiff <= 4) {
								break;
							}
						}
						
					}
					
					if (optimum) {
						counter++;
						hoarder += optimum.chunck;
						line = optimum.rest;
						
						clefts.push({type: 'break', shift: hoarder.length, order: counter, total: '?', tabs: tabs});
						
						continue whileLoop;
					}
					
					break;
					
				}
				
				if (line.length > 0) {
					hoarder += line; // хвост забираем
				}
				
				if (clefts.length > 0) {
					for (let cleft of clefts) {
						cleft.total = counter;
					}
				
					clefts.push({type: 'gap', shift: hoarder.length, total: counter});
				}
				hoarder += '\n'; // добавляем один символ на \n
				result = result.concat(clefts);
			} else {
				hoarder += line + '\n';
			}
		}
		
		return result;
		
		function getRealLength(line) {
			return line.length + line.match(/\t*/)[0].length;
		}
	}
	
	_addLineNumbers(str) {
		let lines = str.split('\n');
		let result = [];
		
		for (let i = 0; i < lines.length; i++) {
			let num = i + 1;
			if (num >= 1 && num <= 9) {
				result.push('<span class="line-number line-number-level-1"></span>' + lines[i]);
			} else if (num >= 10 && num <= 99) {
				result.push('<span class="line-number line-number-level-2"></span>' + lines[i]);
			} else if (num >= 100 && num <= 999) {
				result.push('<span class="line-number line-number-level-3"></span>' + lines[i]);
			} else if (num >= 1000 && num <= 9999) {
				result.push('<span class="line-number line-number-level-4"></span>' + lines[i]);
			}
		}
		str = result.join('\n');
		
		return str;
	}
	
	_getTabs(str) {
		let tabs;
		let match = str.match(/\t*/);
		
		if (match[0].length > 0) {
			tabs = '&#9;'.repeat(match[0].length);
		} else {
			tabs = '';
		}
		
		return tabs;
	}

	_merge(tokens) {
		let result = '';
		
		for (let token of tokens) {
			if (token.inside) {
				
				result += '<span class="token token-' + token.mode + ' token-' + token.type + '">' + this._merge(token.inside) + '</span>';
			} else {
				let match = this._encodeHtmlSpecialChars(token.match);
				
				if (token.type != '~' && token.type != 'ignore') {
					result += '<span class="token token-' + token.mode + ' token-' + token.type + '">' + match + '</span>';
				} else {
					result += match;
				}
			}
		};
		
		return result;
	}
	
	_decodeHtmlSpecialChars(str) {
		str = str.replace(/&amp;/g, '&');
		str = str.replace(/&lt;/g, '<');
		str = str.replace(/&gt;/g, '>');
		
		return str;
	}
	
	_encodeHtmlSpecialChars(str) {
		str = str.replace(/&/g, '&amp;');
		str = str.replace(/</g, '&lt;');
		str = str.replace(/>/g, '&gt;');
		
		return str;
	}
	
	_tokenize(options) {
		let {commands, str, mode} = options;
		
		let lastIndex = 0;
		let tokens = [];
		
		if (commands.length === 0 || commands[commands.length - 1].type != 'plain') {
			commands.push({
				type: 'plain',
				match: /[\s\S]/,
			});
		}
		
		while (lastIndex < str.length) {
			for (let command of commands) {
				
				let regExp = new RegExp(command.match, command.match.flags + 'y');
				regExp.lastIndex = lastIndex;	
				let pockets = regExp.exec(str);
				
				if (pockets) {
					let match = pockets[0];
					
					if (this._checkVicinity(command, str, match, lastIndex)) {
						
						let token = {type: command.type, match, mode};
						
						if (command.explode) {
							token.inside = this._tokenizeExplode(command.explode, pockets, mode);
							
						} else if (command.inside || command.mode) {
							token.inside = this._tokenizeInside(command, match, mode);
						}
						
						let last = tokens[tokens.length - 1];
						if (last && last.mode === token.mode && last.type === token.type) {
							tokens[tokens.length - 1].match += token.match;
						} else {
							tokens.push(token);
						}
						
						lastIndex += match.length - 1;
						break;
					}
				}
			}
			
			lastIndex++;
		}
		
		return tokens;
	}
	
	// Нельзя уносить в основную функцию, тк ее использует _tokenizeExplode
	_tokenizeInside(command, str, mode) {
		if (command.inside) {
			return this._tokenize({str, commands: command.inside, mode});
		} else if (command.mode) {
			return this._tokenizeMode(command, str);
		}
	}
	
	_tokenizeMode(command, str) {
		if (this._totalCommands[command.mode]) {
			let modeCommands = this._totalCommands[command.mode];
			return this._tokenize({str, commands: modeCommands, mode: command.mode});
		} else {
			// неверно указан язык
		}
	}
	
	_tokenizeExplode(commands, pockets, mode) {
		let result = [];
		
		for (let command of commands) {
			let match = pockets[command.pocket];
			
			if (match) {
				let token = {type: command.type, match, mode};
				token.inside = this._tokenizeInside(command, match, mode);
				
				result.push(token);
			} else {
				// неверное имя кармана
			}
		};
		
		return result;
	}
	
	_checkVicinity(command, str, match, lastIndex) {
		if (this._checkBehind(str, lastIndex, command.behind)) {
			if (this._checkNehind(str, lastIndex, command.nehind)) {
				if (this._checkForward(str, lastIndex + match.length, command.forward)) {
					if (this._checkNorward(str, lastIndex + match.length, command.norward)) {
						return true;
					}
				}
			}
		}
		
		return false;
	}
	
	_checkBehind(str, lastIndex, regExp) {
		if (regExp) {
			let behindStr = str.slice(0, lastIndex);
			return (new RegExp('(?:' + regExp.source + ')$', regExp.flags)).test(behindStr);
		} else {
			return true;
		}
	}
	
	_checkNehind(str, lastIndex, regExp) {
		if (regExp) {
			return !this._checkBehind(str, lastIndex, regExp);
		} else {
			return true;
		}
	}
	
	_checkForward(str, lastIndex, regExp) {
		if (regExp) {
			let forwardStr = str.slice(lastIndex);
			return (new RegExp('^(?:' + regExp.source + ')', regExp.flags)).test(forwardStr);
		} else {
			return true;
		}
	}
	
	_checkNorward(str, lastIndex, regExp) {
		if (regExp) {
			return !this._checkForward(str, lastIndex, regExp);
		} else {
			return true;
		}
	}
	
	_getCommands() {
		let сommands = {};
		let inject = {};

		inject.html = [
			{
				type: 'html-tag',
				match: /<[^\/$][^>\s]*?>/,
			},
			{
				type: 'html-tag',
				match: /<[^\/$][^>\s]*/,
			},
			{
				type: 'html-tag',
				match: /<\/[^>\s$]*?>/,
			},
			
			{
				type: 'html-attribute',
				match: /\b[^\s]+?=/,
			},
		];

		inject.sql = [
			{
				type: 'sql-keyword',
				match: /\b(?:TIME_TO_SEC|SEC_TO_TIME|LEAST|MOD|ABS|ROUND|CEILING|FLOOR|LCASE|LOWER|UCASE|UPPER|SPACE|SUBSTRING|LENGTH|SEPARATOR|INTERVAL|TO_DAYS|DATE_FORMAT|MINUTE_SECOND|HOUR_MINUTE|DAY_HOUR|YEAR_MONTH|HOUR_SECOND|DAY_MINUTE|DAY_SECOND|EXTRACT|DAYOFYEAR|DAYNAME|YEARNAME|YEARWEEK|DAYOFWEEK|WEEKDAY|WEEK|YEAR|MONTH|DAY|DAYOFMONTH|HOUR|MINUTE|SECOND|LTRIM|RTRIM|TRIM|ELT|INSTR|LOCATE|POSITION|REPEAT|REVERSE|SUBSTRING_INDEX|REPLACE|LPAD|RPAD|CONCAT_WS|GROUP_CONCAT|CONCAT|SQRT|SIGN|ACTION|ADD|AFTER|ALGORITHM|ALL|ALTER|ANALYZE|ANY|APPLY|ASC|AS|as|AUTHORIZATION|BACKUP|BDB|BEGIN|BERKELEYDB|BIGINT|BINARY|BIT|BLOB|BOOL|BOOLEAN|BREAK|BROWSE|BTREE|BULK|BY|CALL|CASCADED?|CASE|CHAIN|CHAR VARYING|CHARACTER (?:SET|VARYING)|CHARSET|CHECK|CHECKPOINT|CLOSE|CLUSTERED|COALESCE|COLLATE|COLUMN|COLUMNS|COMMENT|COMMIT|COMMITTED|COMPUTE|CONNECT|CONSISTENT|CONSTRAINT|CONTAINS|CONTAINSTABLE|CONTINUE|CONVERT|CREATE|CROSS|CURRENT(?:_DATE|_TIME|_TIMESTAMP|_USER)?|CURSOR|DATA(?:BASES?)?|DATETIME|DBCC|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFINER|DELAYED|DELETE|DENY|DESC|DESCRIBE|DETERMINISTIC|DISABLE|DISCARD|DISK|DISTINCT|DISTINCTROW|DISTRIBUTED|DO|DOUBLE(?: PRECISION)?|DROP|DUMMY|DUMP(?:FILE)?|DUPLICATE KEY|ELSE|ENABLE|ENCLOSED BY|END|ENGINE|ENUM|ERRLVL|ERRORS|ESCAPE(?:D BY)?|EXCEPT|EXEC(?:UTE)?|EXISTS|EXIT|EXPLAIN|EXTENDED|FETCH|FIELDS|FIELD|FILE|FILLFACTOR|FIRST|FIXED|FLOAT|FOLLOWING|FOR(?: EACH ROW)?|FORCE|FOREIGN|FREETEXT(?:TABLE)?|FROM|FULL|FUNCTION|GEOMETRY(?:COLLECTION)?|GLOBAL|GOTO|GRANT|GROUP|HANDLER|HASH|HAVING|HOLDLOCK|IDENTITY(?:_INSERT|COL)?|IF|IGNORE|IMPORT|INDEX|INFILE|INNER|INNODB|INOUT|INSERT|INT|INTEGER|INTERSECT|INTO|INVOKER|ISOLATION LEVEL|JOIN|KEYS?|KILL|LANGUAGE SQL|LAST|LEFT|LIMIT|LINENO|LINES|LINESTRING|LOAD|LOCAL|LOCK|LONG(?:BLOB|TEXT)|MATCH(?:ED)?|MEDIUM(?:BLOB|INT|TEXT)|MERGE|MIDDLEINT|MODIFIES SQL DATA|MODIFY|MULTI(?:LINESTRING|POINT|POLYGON)|NATIONAL(?: CHAR VARYING| CHARACTER(?: VARYING)?| VARCHAR)?|NATURAL|NCHAR(?: VARCHAR)?|NEXT|NO(?: SQL|CHECK|CYCLE)?|NONCLUSTERED|NULLIF|NUMERIC|OFF?|OFFSETS?|ON|OPEN(?:DATASOURCE|QUERY|ROWSET)?|OPTIMIZE|OPTION(?:ALLY)?|ORDER|OUT(?:ER|FILE)?|OVER|PARTIAL|PARTITION|PERCENT|PIVOT|PLAN|POINT|POLYGON|PRECEDING|PRECISION|PREV|PRIMARY|PRINT|PRIVILEGES|PROC(?:EDURE)?|PUBLIC|PURGE|QUICK|RAISERROR|READ(?:S SQL DATA|TEXT)?|REAL|RECONFIGURE|REFERENCES|RELEASE|RENAME|REPEATABLE|REPLICATION|REQUIRE|RESTORE|RESTRICT|RETURNS?|REVOKE|RIGHT|ROLLBACK|ROUTINE|ROW(?:COUNT|GUIDCOL|S)?|RTREE|RULE|SAVE(?:POINT)?|SCHEMA|SELECT|SERIAL(?:IZABLE)?|SESSION(?:_USER)?|SET(?:USER)?|SHARE MODE|SHOW|SHUTDOWN|SIMPLE|SMALLINT|SNAPSHOT|SOME|SONAME|START(?:ING BY)?|STATISTICS|STATUS|STRIPED|SYSTEM_USER|TABLES?|TABLESPACE|TEMP(?:ORARY|TABLE)?|TERMINATED BY|TEXT(?:SIZE)?|THEN|TIMESTAMP|TINY(?:BLOB|INT|TEXT)|TOP?|TRAN(?:SACTIONS?)?|TRIGGER|TRUNCATE|TSEQUAL|TYPES?|UNBOUNDED|UNCOMMITTED|UNDEFINED|UNION|UNIQUE|UNPIVOT|UPDATE(?:TEXT)?|USAGE|USE|USER|USING|VALUES?|VAR(?:BINARY|CHAR|CHARACTER|YING)|VIEW|WAITFOR|WARNINGS|WHEN|WHERE|WHILE|WITH(?: ROLLUP|IN)?|WORK|WRITE(?:TEXT)?|AND|BETWEEN|IN|LIKE|NOT|OR|IS|DIV|REGEXP|RLIKE|SOUNDS LIKE|XOR|SUM|AVG|MIN|MAX|COUNT|SIGN|MID|DATE|NOW)\b/,
				
			},
		];
		
		сommands.sql = [
			{
				type: 'string',
				match: /('|"|`)\1/,
			},
			{
				type: 'string',
				match: /('|").*?[^\\]\1/,
			},
			{
				type: 'escape',
				match: /`.*?`/,
			},
			{
				type: 'as',
				match: /as/,
			},
			{
				type: 'function',
				match: /[A-Z_]+/,
				forward: /\(/,
			},
			{
				type: 'keyword',
				match: /[A-Z_]+/,
			},
		];

		сommands.html = [
			{
				type: 'php',
				match: /(%\?=|%\?php)([\s\S]*?)(\?%)/,
				explode: [
					{
						type: 'php-open',
						pocket: 1,
					},
					{
						type: 'php',
						pocket: 2,
						mode: 'php',
					},
					{
						type: 'php-close',
						pocket: 3,
					},
				],
			},
			{
				type: 'php',
				match: /(%\?php)([\s\S]*)/,
				explode: [
					{
						type: 'php-open',
						pocket: 1,
					},
					{
						type: 'php',
						pocket: 2,
						mode: 'php',
					},
				],
			},
			
			{
				type: 'comment',
				match: /<!--[\s\S]*?-->/,
			},
			{
				type: 'tag',
				match: /(<style.*?>)([\s\S]*?)(<\/style>)/,
				explode: [
					{
						type: 'tag-name',
						pocket: 1,
					},
					{
						type: '~',
						pocket: 2,
						mode: 'css',
					},
					{
						type: 'tag-name',
						pocket: 3,
					},
				],
			},
			
			{
				type: 'tag',
				match: /(<script.*?>)([\s\S]*?)(<\/script>)/,
				explode: [
					{
						type: 'tag-name',
						pocket: 1,
					},
					{
						type: '~',
						pocket: 2,
						mode: 'javascript',
					},
					{
						type: 'tag-name',
						pocket: 3,
					},
				],
			},
			{
				type: 'tag-name',
				match: /<[^\/][^>\s]*?>/,
			},
			{
				type: 'tag-name',
				match: /<\/[^>\s]*?>/,
			},
			{
				type: 'tag',
				match: /(<[^\/][^>]*?)(\s+)([^>]*?)(\s*)(>)/,
				explode: [
					{
						type: 'tag-name',
						pocket: 1,
					},
					{
						type: 'gap',
						pocket: 2,
					},
					{
						type: 'attributes',
						pocket: 3,
						inside: [
							{
								type: 'attribute',
								nehind: /</,
								match: /(on[^\s]+?)(\s*)(=)(\s*)("|')([\s\S]*?)(\5)/,
								explode: [
									{
										type: 'name',
										pocket: 1,
									},
									{
										type: 'gap',
										pocket: 2,
									},
									{
										type: 'equal',
										pocket: 3,
									},
									{
										type: 'gap',
										pocket: 4,
									},
									{
										type: 'quote',
										pocket: 5,
									},
									{
										type: 'javascript',
										pocket: 6,
										mode: 'javascript',
									},
									{
										type: 'quote',
										pocket: 7,
									},
								],
							},
							{
								type: 'attribute',
								nehind: /</,
								match: /([^\s]+?)(\s*)(=)(\s*)("|')([\s\S]*?)(\5)/,
								explode: [
									{
										type: 'name',
										pocket: 1,
									},
									{
										type: 'gap',
										pocket: 2,
									},
									{
										type: 'equal',
										pocket: 3,
									},
									{
										type: 'gap',
										pocket: 4,
									},
									{
										type: 'quote',
										pocket: 5,
									},
									{
										type: 'value',
										pocket: 6,
										inside: [
											{
												type: 'php',
												match: /(%\?=|%\?php)([\s\S]*?)(\?%)/,
												explode: [
													{
														type: 'php-open',
														pocket: 1,
													},
													{
														type: 'php',
														pocket: 2,
														mode: 'php',
													},
													{
														type: 'php-close',
														pocket: 3,
													},
												],
											},
										],
									},
									{
										type: 'quote',
										pocket: 7,
									},
								],
							},
							{
								type: 'php',
								match: /(%\?=|%\?php)([\s\S]*?)(\?%)/,
								explode: [
									{
										type: 'php-open',
										pocket: 1,
									},
									{
										type: 'php',
										pocket: 2,
										mode: 'php',
									},
									{
										type: 'php-close',
										pocket: 3,
									},
								],
							},
							
							{
								type: 'property',
								nehind: /</,
								match: /\b[^\s<>"']+?\b/,
							},
						],
					},
					{
						type: 'gap',
						pocket: 4,
					},
					{
						type: 'tag-name',
						pocket: 5,
					},
				],
			},
		];
		
		сommands.blade = [
			...сommands.html,
			{
				type: 'command',
				match: /@(foreach|endforeach|for|endfor|if|endif|elseif|forelse|endforelse|empty|break|continue|php|endphp)\b/,
			},
			
		];
		
		сommands.css = [
			{
				type: 'comment',
				match: /\/\*[\s\S]*?\*\//,
			},
			{
				type: 'command',
				match: /@(?:(?:-webkit-|-moz-|-o-)?keyframes|support)/,
			},
			{
				type: 'property',
				match: /([a-zA-Z-]+?|@\{[a-zA-Z0-9_-]+?\})(\s*)(:)(\s*)(.+?)(;)/,  // todo: не светит переменные в именах свойств
				explode: [
					{
						type: 'name',
						pocket: 1,
					},
					{
						type: 'gap',
						pocket: 2,
					},
					{
						type: 'punctuation',
						pocket: 3,
					},
					{
						type: 'gap',
						pocket: 4,
					},
					{
						type: 'value',
						pocket: 5,
						inside: [
							{
								type: 'string',
								match: /('|").*?\1/,
							},
							{
								type: 'function',
								match: /[a-zA-Z0-9_-]+/,
								forward: /\(/,
							},
						],
					},
					{
						type: 'punctuation',
						pocket: 6,
					},
				],
			},
			{
				type: 'media',
				match: /(@media)(\s+)((?:\(.+?\)(?:\s+(?:and)\s)?)+)(\s*)/,
				behind: /[\t ]*/,
				forward: /\{/,
				explode: [
					{
						type: 'name',
						pocket: 1,
					},
					{
						type: 'gap',
						pocket: 2,
					},
					{
						type: '~',
						pocket: 3,
						inside: [
							{
								type: 'bracket',
								match: /[\(\)]/,
							},
							{
								type: 'punctuation',
								match: /:/,
							},
							{
								type: 'command',
								match: /max-width|min-width/,
							},
							{
								type: 'condition',
								match: /and/,
							},
						],
					},
					{
						type: 'gap',
						pocket: 4,
					},
				],
			},
			{
				type: 'selector',
				behind: /[\t ]*/,
				match: /[^{}\n\/]+/,
				forward: /\s*\{/,
				inside: [
					{
						type: 'punctuation',
						match: /[,+>~]/,
					},
					{
						type: 'bracket',
						match: /[()]/,
					},
					{
						type: 'attribute',
						match: /(\[)([a-z-]+)(\])/,
						explode: [
							{
								type: 'bracket',
								pocket: 1,
							},
							{
								type: 'name',
								pocket: 2,
							},
							{
								type: 'bracket',
								pocket: 3,
							},
						],
					},
					{
						type: 'attribute',
						match: /(\[)([a-z-]+)(\s*)([|$*~|^]?=)(\s*)(["'])([a-z-]+)(\6)(\])/,
						explode: [
							{
								type: 'bracket',
								pocket: 1,
							},
							{
								type: 'name',
								pocket: 2,
							},
							{
								type: 'gap',
								pocket: 3,
							},
							{
								type: 'operator',
								pocket: 4,
							},
							{
								type: 'gap',
								pocket: 5,
							},
							{
								type: 'quote',
								pocket: 6,
							},
							{
								type: 'value',
								pocket: 7,
							},
							{
								type: 'quote',
								pocket: 8,
							},
							{
								type: 'bracket',
								pocket: 9,
							},
						],
					},
					{
						type: 'function',
						match: /::?[a-z-]+/,
						forward: /\(/,
					},
					{
						type: 'pseudo',
						match: /::?[a-z-]+/,
						norward: /\(/,
					},
					{
						type: 'id',
						match: /#[a-z0-9_-]+/i,
					},
					{
						type: 'class',
						match: /\.[a-z0-9_-]+/i,
					},
				]
			},
			{
				type: 'bracket',
				match: /\{\}/,
			},
			
		];
		
		сommands.less = [
			{
				type: 'comment',
				match: /\/\/.*/,
			},
			{
				type: 'comment',
				match: /\/\*[\s\S]*?\*\//,
			},
			{
				type: 'command',
				match: /@(?:(?:-webkit-|-moz-|-o-)?keyframes|support)/,
			},
			{
				type: 'media',
				match: /(@media)(\s+)((?:\(.+?\)(?:\s+(?:and)\s)?)+)(\s*)/,
				behind: /[\t ]*/,
				forward: /\{/,
				explode: [
					{
						type: 'name',
						pocket: 1,
					},
					{
						type: 'gap',
						pocket: 2,
					},
					{
						type: '~',
						pocket: 3,
						inside: [
							{
								type: 'bracket',
								match: /[\(\)]/,
							},
							{
								type: 'punctuation',
								match: /:/,
							},
							{
								type: 'command',
								match: /max-width|min-width/,
							},
							{
								type: 'condition',
								match: /and/,
							},
						],
					},
					{
						type: 'gap',
						pocket: 4,
					},
				],
			},
			{
				type: 'mixin',
				behind: /[\t ]*/,
				match: /(\.[a-zA-Z0-9_-]+)(\()(.+?)(\))(\s*)(\{)/, // в селекторе
				forward: /\n/,
				explode: [
					{
						type: 'mixin',
						pocket: 1,
					},
					{
						type: 'punctuation',
						pocket: 2,
					},
					{
						type: 'paramters',
						pocket: 3,
						inside: [
							{
								type: 'variable',
								match: /@[a-zA-Z0-9_-]+/,
							},
							{
								type: 'default-value',
								match: /(:)(\s*)([a-zA-Z0-9_-]+)/,
								explode: [
									{
										type: 'punctuation',
										pocket: 1,
									},
									{
										type: '~',
										pocket: 2,
									},
									{
										type: '~',
										pocket: 3,
									},
								],
							},
							{
								type: 'punctuation',
								match: /,/,
							},
						],
					},
					{
						type: 'punctuation',
						pocket: 4,
					},
					{
						type: '~',
						pocket: 5,
					},
					{
						type: 'punctuation',
						pocket: 6,
					},
				]
			},
			/* пока оставим
			{
				type: 'namespace',
				match: /[#.][a-zA-Z0-9_-]+ >/,
				forward: /\s*\./,
			},
			*/
			
			
			{
				type: 'extend',
				match: /(&:extend)(\()(.+?)(\))/,
				forward: /;/,
				explode: [
					{
						type: 'command',
						pocket: 1,
					},
					{
						type: 'punctuation',
						pocket: 2,
					},
					{
						type: 'name',
						pocket: 3,
					},
					{
						type: 'punctuation',
						pocket: 4,
					},
				],
			},
			{
				type: 'mixin',
				match: /\.[a-zA-Z0-9_-]+/, // вставка
				forward: /[;(]/,
			},
			{
				type: 'variable',
				match: /@[a-zA-Z0-9_-]+/,
			},
			{
				type: 'property',
				match: /([a-zA-Z-]+?)(\s*)(\+?_?:)(\s*)(.+?)(;)/,
				explode: [
					{
						type: 'name',
						pocket: 1,
					},
					{
						type: 'gap',
						pocket: 2,
					},
					{
						type: 'punctuation',
						pocket: 3,
					},
					{
						type: 'gap',
						pocket: 4,
					},
					{
						type: 'value',
						pocket: 5,
						inside: [
							{
								type: 'string',
								match: /('|").*?\1/,
							},
							{
								type: 'function',
								match: /[a-zA-Z0-9_-]+/,
								forward: /\(/,
							},
							{
								type: 'variable',
								match: /@[a-zA-Z0-9_-]+/,
							},
						],
					},
					{
						type: 'punctuation',
						pocket: 6,
					},
				],
			},
			{
				type: 'selector',
				behind: /[\t ]*/,
				match: /.+\{/,
				forward: /\n/,
				inside: [
					{
						type: 'punctuation',
						match: /\{$/,
					},
					{
						type: 'merge',
						match: /[&]/,
					},
					{
						type: 'variable',
						match: /@\{[a-zA-Z0-9_-]+\}/,
					},
					{
						type: 'punctuation',
						match: /[,+>~]/,
					},
					{
						type: 'bracket',
						match: /[()]/,
					},
					{
						type: 'attribute',
						match: /(\[)([a-z-]+)(\])/,
						explode: [
							{
								type: 'bracket',
								pocket: 1,
							},
							{
								type: 'name',
								pocket: 2,
							},
							{
								type: 'bracket',
								pocket: 3,
							},
						],
					},
					{
						type: 'attribute',
						match: /(\[)([a-z-]+)(\s*)([|$*~|^]?=)(\s*)(["'])([a-z-]+)(\6)(\])/,
						explode: [
							{
								type: 'bracket',
								pocket: 1,
							},
							{
								type: 'name',
								pocket: 2,
							},
							{
								type: 'gap',
								pocket: 3,
							},
							{
								type: 'operator',
								pocket: 4,
							},
							{
								type: 'gap',
								pocket: 5,
							},
							{
								type: 'quote',
								pocket: 6,
							},
							{
								type: 'value',
								pocket: 7,
							},
							{
								type: 'quote',
								pocket: 8,
							},
							{
								type: 'bracket',
								pocket: 9,
							},
						],
					},
					{
						type: 'function',
						match: /::?[a-z-]+/,
						forward: /\(/,
					},
					{
						type: 'pseudo',
						match: /::?[a-z-]+/,
						norward: /\(/,
					},
					{
						type: 'id',
						match: /#[a-z0-9_-]+/i,
					},
					{
						type: 'class',
						match: /\.[a-z0-9_-]+/i,
					},
				]
			},
			{
				type: 'bracket',
				match: /\{\}/,
			},
			
		];

		сommands.javascript = [
			{
				type: 'marked',
				match: /\/\/!!.*/,
			},
			{
				type: 'comment',
				match: /\/\*[\s\S]*?\*\//,
			},
			{
				type: 'comment',
				match: /\/\/.*/,
			},
			{
				type: 'string',
				match: /('|"|`)\1/,
			},
			{
				type: 'string',
				match: /('|").*?[^\\]\1/,
				inside: [
					...inject.html,
				],
			},
			
			// Косые кавычки
				{
					type: 'string',
					match: /(`)([\s\S]*?[^\\])(`)/,
					
					explode: [
						{
							type: '~',
							pocket: 1,
						},
						{
							type: '~',
							pocket: 2,
							inside: [
								{
									type: 'insert',
									match: /(\$\{)([\s\S]*?)(\})/,
									explode: [
										{
											type: '~',
											pocket: 1,
										},
										{
											type: 'javascript',
											pocket: 2,
											mode: 'self',
										},
										{
											type: '~',
											pocket: 3,
										},
									],
								},
								...inject.html,
							],
							
						},
						{
							type: '~',
							pocket: 3,
						},
					]
					
				},
			//-
			// регулярки
				{
					type: 'regexp',
					match: /(\/)([^ ]*?)(\/)([a-z]*)/,
				
					explode: [
						{
							type: 'limiter',
							pocket: 1,
						},
						{
							type: 'regexp',
							pocket: 2,
						},
						{
							type: 'limiter',
							pocket: 3,
						},
						{
							type: 'modifier',
							pocket: 4,
						},
					]
				},
			//-
				
			{
				type: 'module-export',
				match: /\b(export)\b/,
			},
			{
				type: 'module-import',
				match: /\b(import)\b/,
			},
			{
				type: 'module-from',
				match: /\b(from)\b/,
			},
			{
				type: 'module-default',
				behind: /export\s/,
				match: /\b(default)\b/,
			},
			
			{
				type: 'async',
				match: /\b(async)\b/,
			},
			{
				type: 'await',
				match: /\b(await)\b/,
			},
			{
				type: 'keyword',
				match: /\b(if|else|switch|case|default|while|for|break|continue|return|in|of|class|instanceof|function|try|throw|catch|finally|typeof)\b/,
			},
			{
				type: 'definition',
				match: /\b(var|let|const|new)\b/,
			},
			
			{
				type: 'window',
				match: /\b(window)\b/,
			},
			{
				type: 'document',
				match: /\b(document)\b/,
			},
			{
				type: 'console',
				match: /\b(console)\b/,
			},
			{
				type: 'this',
				match: /\b(this)\b/,
			},
			{
				type: 'value',
				match: /\b(true|false|null|undefined|Infinity|NaN)\b/,
			},
			{
				type: 'punctuation',
				match: /[,.:;]/,
			},
			{
				type: 'operator',
				match: /=|--?|\+\+?|\*|\/|!=?=?|<=?|>=?|===?|&&?|\|\|?|\?|~|\^|%/,
			},
			{
				type: 'bracket',
				match: /[\(\)\[\]\{\}]/,
			},
			{
				type: 'number',
				match: /\d+(\.\d+)?/,
			},
			{
				type: 'variable',
				nehind: /\./,
				match: /[_$a-zA-Z0-9]+/,
				norward: /[(.:]/,
			},
			{
				type: 'key',
				match: /[_$a-zA-Z0-9]+/,
				forward: / *:/,
			},
			{
				type: 'property',
				behind: /[^.]\./,
				match: /[_$a-zA-Z0-9]+/,
				norward: /\(/,
			},
			{
				type: 'object',
				match: /[_$a-zA-Z][_$a-zA-Z0-9]*/,
				forward: /\./,
			},
			{
				type: 'method',
				behind: /\./,
				match: /[_$a-zA-Z][_$a-zA-Z0-9]*/,
				forward: /\(/,
			},
			{
				type: 'function',
				nehind: /\./,
				match: /[_$a-zA-Z][_$a-zA-Z0-9]*/,
				forward: /\(/,
			},
			
		];
		
		сommands.jsx = [
			{
				type: 'tag',
				match: /<>|<\/>/,
			},
			{
				type: 'tag',
				match: /<\/?[a-zA-Z0-9-_]+/,
			},
			{
				type: 'tag',
				match: /\/>/,
			},
			{
				type: 'tag',
				nehind: /\s|=/,
				match: />/,
			},
			{
				type: 'attribute',
				//behind: /<[^>]*/,
				match: /[a-zA-Z0-9_-]+/,
				forward: /\s*=["'{]/,
			},
			
			...сommands.javascript,
		];
		
		сommands.typescript = [
			{
				type: 'keyword',
				match: /\b(interface|namespace|implements)\b/,
			},
			{
				type: 'variable',
				match: /[a-zA-Z][a-zA-Z0-9_]*/,
				forward: /: [a-zA-Z][a-zA-Z0-9_]*/,
			},
			{
				type: 'type',
				behind: /: /,
				match: /[a-zA-Z][a-zA-Z0-9_]*/,
			},
			{
				type: 'modifier',
				match: /\b(public|protected|private|static)\b/,
			},
			{
				type: 'abstract',
				match: /\b(abstract)\b/,
			},
			...сommands.javascript,
			
		];

		сommands.php = [
			{
				type: 'php-open',
				match: /%\?=|%\?php/,
			},
			{
				type: 'php-close',
				match: /\?%/,
			},
			
			{
				type: 'marked',
				match: /\/\/!!.*/,
			},
			{
				type: 'comment',
				match: /\/\*[\s\S]*?\*\//,
			},
			{
				type: 'comment',
				match: /(\/\/)(.*)/,
				
				explode: [
					{
						type: 'command',
						pocket: 1,
					},
					{
						type: 'text',
						pocket: 2,
					},
				]
			},
			
			/*
			{
				type: 'key',
				match: /'[_$a-zA-Z0-9]+'/,
				forward: /\s*=> /,
			},
			{
				type: 'key',
				match: /"[_$a-zA-Z0-9]+"/,
				forward: /\s*=> /,
			},
			{
				type: 'key',
				match: /[0-9]+/,
				forward: /\s*=> /,
			},
			{
				type: 'key',
				match: /'.+?'/,
				behind: /\[/,
				forward: /\]/,
			},
			*/
			
			// Строки
				{
					type: 'string',
					match: /''|""/,
				},
				{
					type: 'string',
					match: /'\\\\'/, // todo: более универсально сделать
				},
				{
					type: 'string',
					match: /'[\s\S]*?[^\\]'/,
					
					inside: [
						...inject.html,
						...inject.sql,
					],
				},
				{
					type: 'string',
					match: /"[\s\S]*?[^\\]"/,
					
					inside: [
						{
							type: 'variable',
							match: /\$[_a-zA-Z0-9]+/,
						},
						
						...inject.html,
						...inject.sql,
					],
				},
			//-
			
			{
				type: 'keyword',
				match: /\b(require_once|require|include_once|include|new|and|or|xor|array|echo|if|else|elseif|endif|switch|case|default|while|endwhile|for|endfor|foreach|endforeach|as|break|continue|return|class|interface|trait|namespace|use|extends|implements|instanceof|insteadof|function|try|throw|catch|finally)\b/,
			},
			{
				type: 'instance',
				match: /\b(\$this|parent|self)/,
			},
			{
				type: 'special',
				match: /\$_GET|\$_POST|\$_REQUEST|\$_SERVER|\$_SESSION|\$_COOKIE|\$GLOBALS/,
			},
			{
				type: 'modifier',
				match: /\b(public|protected|private|static)\b/,
			},
			{
				type: 'definition',
				match: /\b(const)\b/,
			},
			{
				type: 'abstract',
				match: /\b(abstract)\b/,
			},
			{
				type: 'value',
				match: /\b(true|false|null)\b/,
			},
			{
				type: 'punctuation',
				match: /[,.:;]/,
			},
			{
				type: 'operator',
				match: /=>|->|=|--?|\+\+?|\*|\/|!=?=?|<=?|>=?|===?|&&?|\|\|?|\?|~|\^|%/,
			},
			{
				type: 'bracket',
				match: /[\(\)\[\]\{\}]/,
			},
			{
				type: 'variable',
				match: /\$[_a-zA-Z0-9]+/,
				norward: /->/,
			},
			{
				type: 'object',
				match: /\$[_a-zA-Z][_a-zA-Z0-9]*/,
				forward: /->/,
			},
			{
				type: 'property',
				behind: /->/,
				match: /[_a-zA-Z0-9-]+/,
				norward: /\(/,
			},
			{
				type: 'method',
				behind: /->/,
				match: /[_a-zA-Z-][_a-zA-Z0-9-]*/,
				forward: /\(/,
			},
			{
				type: 'function',
				nehind: /->/,
				match: /[_a-zA-Z-][_a-zA-Z0-9-]*/,
				forward: /\(/,
			},
			{
				type: 'number',
				match: /\d+(\.\d+)?/,
			},
		];
		
		
		сommands.hbs = [
			{
				type: 'comment',
				match: /{\*[\s\S]*?\*}/,
			},
			{
				type: 'comment',
				match: /<!--[\s\S]*?-->/,
			},
			{
				type: 'tag',
				match: /(<style.*?>)([\s\S]*?)(<\/style>)/,
				explode: [
					{
						type: 'tag-name',
						pocket: 1,
					},
					{
						type: '~',
						pocket: 2,
						mode: 'css',
					},
					{
						type: 'tag-name',
						pocket: 3,
					},
				],
			},
			
			{
				type: 'tag',
				match: /(<script.*?>)([\s\S]*?)(<\/script>)/,
				explode: [
					{
						type: 'tag-name',
						pocket: 1,
					},
					{
						type: '~',
						pocket: 2,
						mode: 'javascript',
					},
					{
						type: 'tag-name',
						pocket: 3,
					},
				],
			},
			{
				type: 'tag-name',
				match: /<[^\/][^>\s]*?>/,
			},
			{
				type: 'tag-name',
				match: /<\/[^>\s]*?>/,
			},
			{
				type: 'tag',
				match: /(<[^\/][^>]*?)(\s+)([^>]*?)(\s*)(>)/,
				explode: [
					{
						type: 'tag-name',
						pocket: 1,
					},
					{
						type: 'gap',
						pocket: 2,
					},
					{
						type: 'attributes',
						pocket: 3,
						inside: [
							{
								type: 'attribute',
								nehind: /</,
								match: /(on[^\s]+?)(\s*)(=)(\s*)("|')([\s\S]*?)(\5)/,
								explode: [
									{
										type: 'name',
										pocket: 1,
									},
									{
										type: 'gap',
										pocket: 2,
									},
									{
										type: 'equal',
										pocket: 3,
									},
									{
										type: 'gap',
										pocket: 4,
									},
									{
										type: 'quote',
										pocket: 5,
									},
									{
										type: 'javascript',
										pocket: 6,
										mode: 'javascript',
									},
									{
										type: 'quote',
										pocket: 7,
									},
								],
							},
							{
								type: 'attribute',
								nehind: /</,
								match: /([^\s]+?)(\s*)(=)(\s*)("|')([\s\S]*?)(\5)/,
								explode: [
									{
										type: 'name',
										pocket: 1,
									},
									{
										type: 'gap',
										pocket: 2,
									},
									{
										type: 'equal',
										pocket: 3,
									},
									{
										type: 'gap',
										pocket: 4,
									},
									{
										type: 'quote',
										pocket: 5,
									},
									{
										type: 'value',
										pocket: 6,
										inside: [
											{
												type: 'command',
												match: /(\{\{)(.*?)(\}\})/,
												explode: [
													{
														type: 'bracket',
														pocket: 1,
													},
													{
														type: '~',
														pocket: 2,
														inside: [
															{
																type: 'variable',
																nehind: /\./,
																match: /[a-zA-Z0-9_]+/,
															},
															{
																type: 'property',
																behind: /\./,
																match: /[a-zA-Z0-9_]+/,
															},
														],
													},
													{
														type: 'bracket',
														pocket: 3,
													},
												],
											},
										],
									},
									{
										type: 'quote',
										pocket: 7,
									},
								],
							},
							{
								type: 'property',
								nehind: /</,
								match: /\b[^\s<>"']+?\b/,
							},
						],
					},
					{
						type: 'gap',
						pocket: 4,
					},
					{
						type: 'tag-name',
						pocket: 5,
					},
				],
			},
			{
				type: 'command',
				match: /(\{\{\}?)(.*?)(\}\}\}?)/,
				explode: [
					{
						type: 'bracket',
						pocket: 1,
					},
					{
						type: '~',
						pocket: 2,
				
						inside: [
							{
								type: 'keyword',
								match: /[#\/](?:each|if|with)/,
							},
							{
								type: 'variable',
								nehind: /\./,
								match: /[a-zA-Z0-9_]+/,
							},
							{
								type: 'property',
								behind: /\./,
								match: /[a-zA-Z0-9_]+/,
							},
							
						],
				
					},
					{
						type: 'bracket',
						pocket: 3,
					},
				],
			},
		];
		
		сommands.terminal = [
			{
				type: 'keyword',
				match: /\b(sudo|php|npm|composer)\b/,
			},
			{
				type: 'module',
				match: /\b(artisan)\b/,
			},
			{
				type: 'command',
				match: /\b(install|require)\b/,
			},
			{
				type: 'modifier',
				match: /--(.+?)(\s|$)/,
			},
		];
		сommands.htaccess = [
			
		];
		
		return сommands;
	}

}


