'use strict';

var logo = new Object;

logo.parse = function(str) {
	'use strict';
	var l = str.length;
	var stack = [[]];
	var state = 0;
	var start = 0;
	var i = 0;
	var c;
	var acc;

	acc = '';
	for(i=0;i<=l;i++) {
		if(i==l) c='EOF'; else c=str[i];
		switch(state) {
		case 0:
			if([ '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'].indexOf(c) != -1) {
				start=i;
				acc=c;
				state=1;
			} else if([ ' ', '\n', '\t' ].indexOf(c) != -1) {
				// eat white space
			} else if([ '[' ].indexOf(c) != -1) {
				stack=[ [], [i, stack ]];
			} else if([ ']' ].indexOf(c) != -1) {
				if(stack.length == 1) {
					debug('close bracket without open');
				} else {
					stack[1][1][0].push({
						kind: "list",
						val: stack[0],
						src: str,
						colstart: stack[1][0],
						colend: i
					});
					stack=stack[1][1];
				}
			} else if([ '\'' ].indexOf(c) != -1) {
				start=i;
				acc='';
				state=3;
			} else if([';'].indexOf(c) != -1) {
				start=i;
				acc=c;
				state=4;
			} else if(c == 'EOF') {
			} else {
				start=i;
				acc=c;
				state=2;
			}
			break;
		case 1: // number
			if([ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.' ].indexOf(c) != -1) {
				// still num
				acc += c;
			} else if(c == 'EOF') {
				stack[0].push({
					kind: "num",
					val: Number(acc),
					src: str,
					colstart: start,
					colend: i
				});
				acc='';
			} else {
				stack[0].push({
					kind: "num",
					val: Number(acc),
					src: str,
					colstart: start,
					colend: i
				});
				acc='';
				i--;
				state=0;
			}
			break;
		case 2: // tok
			if([ ' ', ']', '\'', '\n' ].indexOf(c) != -1) {
				stack[0].push({
					kind: "sym",
					val: (acc),
					src: str,
					colstart: start,
					colend: i
				});
				acc='';
				i--;
				state=0;
			} else if(c == 'EOF') {
				stack[0].push({
					kind: "sym",
					val: (acc),
					src: str,
					colstart: start,
					colend: i
				});
				acc='';
			} else {
				acc+=str[i];
			}
			break;
		case 3: // quote
			if( [ '\'' ].indexOf(c) != -1) {
				stack[0].push({
					kind: "str",
					val: (acc),
					src: str,
					colstart: start,
					colend: i
				});
				acc='';
				state=0;
			} else {
				acc+=c;
			}
			break;	
		case 4: // comment
			if(c == 'EOF') {
				i--;
				state=0;
			} else if(c == '\n') {
				state=0;
			}
			break;
		}
	}
	if(stack.length > 1) {
		debug('missing close: ' + JSON.stringify(stack));
	}
	return [ {
		kind: "list",
		val: stack[0],
		src: str,
		colstart: start,
		colend: i
	} ];
};
