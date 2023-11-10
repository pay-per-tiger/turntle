
pp = function(expr) {
	var acc = "";
	var l;

	if(!expr || !expr.kind) {
		return false;
	} else if(expr.kind == "symbol") {
		return expr.val;
	} else if(expr.kind == "string") {
		return "'" + expr.val + "'";
	} else if(expr.kind == "list") {
		acc = "( ";
		for(l = 0 ; l < expr.val.length ; l++) {
			acc += pp(expr.val[l]);
			acc += " ";
		}
		acc += ")";
		return acc;
	} else if(expr.kind == "string") {
		return expr.val;	
	} else if(expr.kind == "raddr") {
		// these are only used in the compiler
		acc = "*" + expr.seg + "[" + expr.val + "]" + ":";
		return acc;
	} else if(expr.kind == "lit") {
		acc = expr.val;
		return acc;
	} else if(expr.kind == "number") {
		acc = "" + expr.val;
		return acc;
	} else if(expr.kind == "nil") {
		acc = "()";
		return acc;
	} else if(expr.kind == "lambda") {
		acc = "(lambda " + expr.var + " " + pp(expr.body) + ")";
		return acc;
	} else {
		acc = JSON.stringify(expr);
		return acc;
	}
};

iscons = function(expr, vml) {
	if(expr.kind != "addr")
		return false;

	if(expr.val >= vml.length)
		return false;

	if(vml[expr.val].kind != "frame")
		return false;

	if(vml[expr.val].size != 4)
		return false;

	if(vml[expr.val + 1].kind != "addr")
		return false;

	if(vml[expr.val + 1].val != expr.val)
		return false;

	if(vml[expr.val + 2].kind != "lit")
		return false;

	if(vml[expr.val + 2].val != "cons")
		return false;

	return true;
};

vmlpp = function(expr, vml) {
	var acc;

	if(expr.kind == "addr") {
		if(iscons(expr, vml)) {
			if(vml[expr.val + 4].kind == "nil") {
				acc = "(";
				acc += vmlpp(vml[expr.val + 3], vml);
				acc += ")";
			} else {
				acc = "(";
				acc += vmlpp(vml[expr.val + 3], vml);
				acc += " . ";
				acc += vmlpp(vml[expr.val + 4], vml);
				acc += ")";
			}
			return acc;
		} else {
			acc = "addr:" + expr.val;
			return acc;
		}

	} else {
		return pp(expr);
	}
};

showrange = function(vml, begin, end, labels, dosummary) {

	var x;
	var s;
	var num_def = 0;
	var num_def_completed = 0;
	var reg_r1 = false;

	// inline labels mess with our pretty-printing
	var countpc = function(pc, disp) {
		var c, x;
		if(disp > 0) {
			c = 0;
			for(x = pc + 1 ; x < vml.length ; x++) {
				if(vml[x].kind != "label") {
					c++;
					if(c == disp)
						return x;
				}
			}
		} else if(disp < 0) {
			c = 0;
			for(x = pc; x > 0 ; x--) {
				if(vml[x - 1].kind != "label") {
					c--;
					if(c == disp)
						return x - 1;
				}
			}
		}
		return 0;
	}

	var markup = function(seg, val, pos) {
		var s = '';

		var green = '\x1b[32m';
		var red = '\x1b[31m';
		var plain = '\x1b[39;49m';

		if(seg == "abs") {
			if(vml[val] && (vml[val].kind != "blank")) {
				s += green + seg + '[' + val + ']' + plain;
			} else {
				s += red + seg + '[' + val + ']' + plain;
			}
		} else if((seg == "r1") && reg_r1) {
			if(vml[reg_r1 + 1 + val] && (vml[reg_r1 + 1 + val].kind != "blank")) {
				s += green + seg + '[' + val + ']' + plain;
			} else {
				s += red + seg + '[' + val + ']' + plain;
			}
		} else if((seg == "pc")) {
			var c;

			c = countpc(pos, val);
			if(vml[c] && (vml[c].kind != "blank")) {
				s += green + seg + '[' + val + ']' + plain + ' /* abs[' + c + '] */';
			} else {
				s += red + seg + '[' + val + ']' + plain + ' /* abs[' + c + '] */';
			}
		} else if(typeof(seg) == "number") {
			s += "ssa[" + seg + "]" + '[' + val + ']';
		} else {
			s += seg + '[' + val + ']';
		}

		return s;
	}

	var show_single = function(prefix, x) {

		if(vml[x].kind == 'frame') {
			var y;

			if(typeof(vml[x].size) == "number") {
				s = 'pos ' + x + ': ' + prefix + 'frame(' + vml[x].size + ')-------------';
				arlog(s);
				for(y = x + 1 ; y < x + 1 + vml[x].size ; y++) {
					show_single(prefix + '  ', y);
				}
			} else {
				s = 'pos ' + x + ': ' + prefix + 'frame(' + JSON.stringify(vml[x].size) + ')-------------';
				arlog(s);
				y = x + 1;
				do {
					show_single(prefix + '  ', y);
					y++;
				} while((y < vml.length) && !(vml[y].kind == "label" && vml[y].val != vml[x].size.val));
			}


			return y;
		} else if(vml[x].kind == 'deferred') {
			s = 'pos ' + x + ': ' + prefix + 'deferred:' + JSON.stringify(vml[x]);
			if(vml[x].blocked && vml[vml[x].blocked] && (vml[vml[x].blocked].kind != "blank")) {
				arlog('\x1b[32m' + s + '\x1b[39;49m');
			} else {
				arlog('\x1b[31m' + s + '\x1b[39;49m');
			}

			num_def++;
			if(vml[x].completed)
				num_def_completed++;
		} else if(vml[x].kind == "lit") {
			s = 'pos ' + x + ': ' + prefix + 'lit:' + vml[x].val;
			if(vml[x].comment) {
				s += ' // ' + vml[x].comment;
			}
			arlog(s);
		} else if(vml[x].kind == "nil") {
			arlog('pos ' + x + ': ' + prefix + 'nil');
		} else if(vml[x].kind == "sz") {
			s = 'pos ' + x + ': ' + prefix + 'sz:' + vml[x].val;
			if(vml[x].comment) {
				s += ' // ' + vml[x].comment;
			}
			arlog(s);
		} else if(vml[x].kind == "addr") {
			s = 'pos ' + x + ': ' + prefix + 'addr:' + vml[x].val;
			if(vml[x].comment) {
				s += ' // ' + vml[x].comment;
			}
			arlog(s);
		} else if(vml[x].kind == "debug") {
			s = 'pos ' + x + ': ' + prefix + 'debug:' + vml[x].msg;
			arlog(s);
		} else if(vml[x].kind == "op") {
			if(vml[x].val == "call") {
				s = 'pos ' + x + ': ' + prefix + vml[x].val + '(' + vml[x].target + ', ';
				s += markup(vml[x].arg1_seg, vml[x].arg1, x);
				s += ')';
			} else {
				if(vml[x].val == "set") {
					if(vml[x].arg1_seg == "reg") {
						if(vml[x].arg1 == "r1") {
							reg_r1 = false;
							if(vml[x].arg2_seg == "abs") {
								var t = vml[vml[x].arg2];
								if(t && t.kind == "addr") {
									reg_r1 = t.val;
								}
							}
						}

					}
				} else if(vml[x].val == "alice") {
					reg_r1 = false;
				}
				if(vml[x].val == "set") {
					s = 'pos ' + x + ': ' + prefix;
					s += markup(vml[x].arg1_seg, vml[x].arg1, x);
					s += " = ";
					s += markup(vml[x].arg2_seg, vml[x].arg2, x);
				} else {
					s = 'pos ' + x + ': ' + prefix + vml[x].val + '(';
					s += markup(vml[x].arg1_seg, vml[x].arg1, x);
					s += ", ";
					s += markup(vml[x].arg2_seg, vml[x].arg2, x);
					s += ')';
				}
			}
			arlog(s);
		} else if(vml[x].kind == "log") {
			arlog('pos ' + x + ': ' + prefix + 'log: ' + vml[x].val);
		} else if(vml[x].kind == "blank") {
			arlog('pos ' + x + ': ' + prefix + 'blank');
		} else if(vml[x].kind == "label") {
			arlog('pos ' + x + ': ' + prefix + 'label: ' + vml[x].val);
		} else {
			arlog('pos ' + x + ': ' + prefix + 'foo: ' + JSON.stringify(vml[x]));
		}
		return x + 1;
	};

	x = begin;
	while(x < end) {
		x = show_single('', x);
	}

	if(dosummary) {
		arlog('completed ' + num_def_completed + ' of ' + num_def + ' deferred.');
	}
};

show = function(vml, labels) {
	showrange(vml, 0, vml.length, labels);
}
