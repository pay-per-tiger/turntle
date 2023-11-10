'use strict';
// commands that define the language

var stxlen = function(stx, start) {
	switch(stx[start].kind) {
		case 'list': return 1;
		case 'string': return 1;
		case 'num': return 1;
		case 'sym':
			//logo.error('aha! sym!');
			var v;
			v = logo.variables["var_" + stx[start].val];
			switch(v.val.kind) {
				case 'proc':
					var x, s, r;
					s = start + 1;
					for(x = 0; x < v.val.args.length ; x++) {
						r = stxlen(stx, s);
						if(!r) {
							logo.error('could not find len');
							return false;
						}
						s += r;
					}
					return s - start;
				case 'stx':
					if(v.val.args) {
						var x, s, r;
						s = start + 1;
						for(x = 0; x < v.val.args.length ; x++) {
							r = stxlen(stx, s);
							if(!r) {
								logo.error('could not find len');
								return false;
							}
							s += r;
						}
						return s - start;
					} else {
						logo.error('cannot determine length of stx ' + stx[start].val);
					}	
				default:
					return 1;
			}
		default:
			logo.error('unknown');
			return false;
	}
	logo.error('checking length of ' + JSON.stringify(stx));
};

logo.variables["var_incr"] = logo.mkvar({ kind: "stx", val: function(stx, start, locals, next) {
	var label;
	var r;

	if(start + 1 >= stx.length) {
		r = logo.mkerr(logo.mkstr('incr needs a variable'));
		r.stack = [ [ stx, start ], r.stack ];
		return next(r);
	}
	label = stx[start + 1];

	if(label.kind != "sym") {
		r = logo.mkerr(logo.mkstr('incr needs a variable'));
		r.stack = [ [ stx, start ], r.stack ];
		return next(r);
	}
	
	r = logo.ref(label.val, locals);
	if(!r) {
		r = logo.mkerr(logo.mkstr('no such variable: ' + label.val));
		r.stack = [ [ stx, start ], r.stack ];
		return next(r);
	}

	if(r.val.kind != "num") {
		r = logo.mkerr(logo.mkstr('increment needs a number, not a ' + r.val.kind));
		r.stack = [ [ stx, start ], r.stack ];
		return next(r);
	}

	//logo.error('assigning to ' + JSON.stringify(r.val));
	logo.setvar(r, logo.mknum(r.val.val + 1));
	//logo.error('done assigning. new val: ' + JSON.stringify(r.val));

	return next(logo.mklist([ r.val, logo.mknum(start + 2)]));
}, args: ["var"]});

logo.variables["var_decr"] = logo.mkvar({ kind: "stx", val: function(stx, start, locals, next) {
	var label;

	if(start + 1 >= stx.length) {
		r = logo.mkerr(logo.mkstr('decr needs a variable'));
		r.stack = [ [ stx, start], r.stack ];
		return next(r);
	}
	label = stx[start + 1];

	if(label.kind != "sym") {
		r = logo.mkerr(logo.mkstr('decr needs a variable'));
		r.stack = [ [ stx, start], r.stack ];
		return next(r);
	}

	var r;
	r = logo.ref(label.val, locals);
	if(!r) {
		r = logo.mkerr(logo.mkstr('no such variable: ' + label.val));
		r.stack = [ [ stx, start ], r.stack ];
		return next(r);
	}

	if(r.val.kind != "num") {
		r = logo.mkerr(logo.mkstr('decr needs a number, not a ' + r.val.kind));
		r.stack = [ [ stx, start ], r.stack ];
		return next(r);
	}

	return next(logo.mklist([ r.val , logo.mknum(start + 2)]));
}, args: ["var"]});

logo.bind_global("let", logo.mkvar({kind: "stx", val: function(stx, start, locals, next) {
	var label, val, r;

	if(start + 1 >= stx.length) {
		logo.error("let needs a variable!");
		return next(false);
	}
	label = stx[start + 1];

	if(label.kind != "sym") {
		logo.error("let needs a variable!");	
		return next(false);
	}

	//logo.error('let binding ' + logo.ppstx(label));

	if(start + 2 >= stx.length) {
		logo.error("let needs a value!");
		return next(false);
	}

	return logo.eval(stx, start+2, locals, function(r) {
		var v;

		if(!r) {
			logo.error("command fails: " + logo.ppstx(logo.mklist(stx.slice(start + 2, stx.length))));
			return next(false);
		}

		if(r.kind == "error")
			return r;

		v = locals[0]["var_" + label.val] = logo.mkvar(r.val[0]);
		return next(logo.mklist([v.val, r.val[1]]));
	});

}, args: [ "var", "val" ]}));

// update the binding or publish a new toplevel binding
logo.bind_global("set", logo.mkvar({kind: "stx", val: function(stx, start, locals, next) {
	var label, val, r;

	if(start + 1 >= stx.length) {
		logo.error("set needs a variable name!");
		return next(false);
	}

	label = stx[start + 1];

	if(label.kind != "sym") {
		logo.error("set: " + logo.ppstx(label) + " is not a variable name");
		return next(false);
	}

	if(start + 2 >= stx.length) {
		logo.error("set needs a value!");
		return next(false);
	}

	return logo.eval(stx, start+2, locals, function(r) {
		var v;

		if(!r) {
			logo.error("command fails: " + logo.ppstx(logo.mklist(stx.slice(start + 2, stx.length))));
			return next(false);
		}

		v = logo.ref(label.val, locals);
		if(!v) {
			logo.bind_global(label.val, logo.mkvar(logo.mknum(0)));
			v = logo.ref(label.val, locals);
		}

		if(r.kind == "error")
			return next(r);

		logo.setvar(v, r.val[0]);
		return next(r);
	});
}, args: [ "var", "val"] }));

// this is stx until we have varargs
logo.bind_global("list", logo.mkvar({ kind: "stx", val: function(stx, start, locals, next) {
	var r;
	r = { kind: "list", val: [] };

	var s;
	s = start + 1;

	var foo;
	foo = function(s) {
		if(s < stx.length) {
			return logo.eval(stx, s, locals, function(nr) {
				r.val.push(nr.val[0]);
				return foo(nr.val[1].val);
			});
		}
		return next(logo.mklist([ r, logo.mknum(s) ]));
	};
	return foo(s);

}}));

logo.variables["var_err"] = logo.mkvar({
	kind: "proc",
	handler: function(next, msg) {
		return next(logo.mkerr(msg));
	},
	args: ["msg"]
});

logo.variables["var_quot"] = logo.mkvar({
	kind: "proc",
	handler: function(next, a, b) {
		if(a.kind != "num")
			return next(logo.mkerr(logo.mkstr('quot takes two numbers!')));
		if(b.kind != "num")
			return next(logo.mkerr(logo.mkstr('quot takes two numbers!')));

		return next(logo.mknum(Math.floor(a.val / b.val)));
	},
	args: ["a", "b"]
});

logo.variables["var_less"] = logo.mkvar({
	kind: "proc",
	handler: function(next, a, b) {
		if(a.kind != "num")
			return next(logo.mkerr(logo.mkstr('less takes two numbers!')));
		if(b.kind != "num")
			return next(logo.mkerr(logo.mkstr('less takes two numbers!')));

		if(a.val < b.val)
			return next(logo.mknum(1));
		else
			return next(logo.mknum(0));
	},
	args: ["a", "b"]
});

logo.variables["var_and"] = logo.mkvar({
	kind: "proc",
	handler: function(next, a, b) {
		if(a.kind != "num")
			return next(logo.mkerr(logo.mkstr('and takes two numbers!')));
		if(b.kind != "num")
			return next(logo.mkerr(logo.mkstr('and takes two numbers!')));

		if(a.val && b.val)
			return next(logo.mknum(1));
		else
			return next(logo.mknum(0));
	},
	args: ["a", "b"]
});


logo.variables["var_equal"] = logo.mkvar({
	kind: "proc",
	handler: function(next, a, b) {
		if( (a.kind == "num") && (b.kind == "num") ) {
			if(a.val == b.val)
				return next(logo.mknum(1));
			else
				return next(logo.mknum(0));
		} else if( (a.kind == "str") && (b.kind == "str") ) {
			if(a.val == b.val)
				return next(logo.mknum(1));
			else
				return next(logo.mknum(0));
		} else {
			return next(logo.mkerr(logo.mkstr('arguments to equal must be of the same type')));
		}	
	},
	args: ["a", "b"]
});

logo.variables["var_setref"] = logo.mkvar({
	kind: "proc",
	handler: function(next, l, i, v) {
		if(l.kind != "list")
			return next(logo.mkerr(logo.mkstr("setref LIST INDEX VALUE: LIST must be a list")));
		if(i.kind != "num")
			return next(logo.mkerr(logo.mkstr("setref LIST INDEX VALUE: INDEX must be a number")));
		if(i.val >= l.val.length)
			return next(logo.mkerr(logo.mkstr('setref: i (' + i.val + ') is greater than the length of of l (' + l.val.length + ')')));
		if(i.val < 0)
			return next(logo.mkerr(logo.mkstr('i is less than 0')));

		l.val[i.val] = v;
		return next(v);
	},
	args: ["l", "i", "v"]
});

logo.variables["var_ref"] = logo.mkvar({
	kind: "proc",
	handler: function(next, l, i) {
		if(l.kind != "list")
			return next(logo.mkerr(logo.mkstr("ref LIST INDEX: LIST must be a list")));
		if(i.kind != "num")
			return next(logo.mkerr(logo.mkstr("ref LIST INDEX: INDEX must be a number")));
		if(i.val >= l.val.length)
			return next(logo.mkerr(logo.mkstr('ref: i (' + i.val + ') is greater than the length of of l (' + l.val.length + ')')));
		if(i.val < 0)
			return next(logo.mkerr(logo.mkstr('i is less than 0')));
				
		return next(l.val[i.val]);
	},
	args: ["l", "i"]
});

logo.variables["var_strref"] = logo.mkvar({
	kind: "proc",
	handler: function(next, s, i) {
		if(s.kind != "str")
			return next(logo.mkerr(logo.mkstr("strref STR INDEX: STR must be a list")));
		if(i.kind != "num")
			return next(logo.mkerr(logo.mkstr("strref STR INDEX: INDEX must be a number")));
		if(i.val >= s.val.length)
			return next(logo.mkerr(logo.mkstr('strref: i (' + i.val + ') is greater than the length of s (' + s.val.length + ')')));
		if(i.val < 0)
			return next(logo.mkerr(logo.mkstr('i is less than 0')));
				
		return next(logo.mkstr(s.val[i.val]));
	},
	args: ["s", "i"]
});

logo.variables["var_length"] = logo.mkvar({
	kind: "proc",
	handler: function(next, list) {
		if(list.kind != "list")
			return logo.mkerr(logo.mkstr("length LIST: LIST must be a list"));

		return next(logo.mknum(list.val.length));
	},
	args: ["list"]
});

logo.variables["var_strlength"] = logo.mkvar({
	kind: "proc",
	handler: function(next, str) {
		if(str.kind != "str")
			return next(logo.mkerr(logo.mkstr("strlength STR: STR must be a string")));

		return next(logo.mknum(str.val.length));
	},
	args: ["str"]
});


logo.variables["var_islist"] = logo.mkvar({
	kind: "proc",
	handler: function(next, val) {
		if(val.kind == "list") {
			return next(logo.mknum(1));
		} else {
			return next(logo.mknum(0));
		}
	},
	args: ["val"]
});

logo.variables["var_isnum"] = logo.mkvar({
	kind: "proc",
	handler: function(next, val) {
		if(val.kind == "num") {
			return next(logo.mknum(1));
		} else {
			return next(logo.mknum(0));
		}
	},
	args: ["val"]
});

logo.variables["var_isfalse"] = logo.mkvar({
	kind: "proc",
	handler: function(next, val) {
		if(val.kind == "false") {
			return next(logo.mknum(1));
		} else {
			return next(logo.mknum(0));
		}
	},
	args: ["val"]
});

logo.variables["var_mklist"] = logo.mkvar({
	kind: "proc",
	handler: function(next, n) {
		var x;
		var a = [];
		for(x = 0 ; x < n.val ; x++) {
			a.push(logo.mknum(0));
		}
		return next(logo.mklist(a));
	},
	args: ["n"]
});
