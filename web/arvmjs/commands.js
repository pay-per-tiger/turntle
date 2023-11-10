
var checklit = function(vml, fp, idx) {
	if(vml[fp + 2 + idx].kind != "lit") {
		vml[fp + 1] = err("argument " + idx + " must be a lit");
		return false;
	}
	return true;
};

var mkargchandler = function(argc, name, arg_predicates, handler) {
	return function(vml, fp) {
		var x;

		if(fp > vml.length) {
			vmlog(vml, "error: " + name + ": fp past end of tape");
			return false;
		}
		if(vml[fp].kind != "frame") {
			vmlog(vml, "error: " + name + ": fp does not point to a frame");
			return false;
		}
		if(vml[fp].size < 1) {
			vmlog(vml, "error: " + name + ": fp does not point to a frame");
			return false;
		}

		// once we have a frame, all other fatal errors can be returned as the return value

		if(vml[fp].size < (argc + 1)) {
			vml[fp + 1] = err(name + ": frame is too small. it is " + vml[fp].size + " should be at least " + (argc + 1));
			return false;
		}

		if(!arg_predicates)
			return handler(vml, fp);

		for(x = 0 ; x < arg_predicates.length ; x++) {
			if(!arg_predicates[x](vml, fp, x))
				return false;
		}

		return handler(vml, fp);
	};
};

getset_dict = {};

library_syms = {
	"add": {
		kind: "proc",
		args: 2,
		handler: mkargchandler(2, "add", [checklit, checklit], function(vml, fp) {

			vml[fp + 1] = {
				kind: "lit",
				val: vml[fp + 2].val + vml[fp + 3].val
			};

			return true;
		}),
	},
	"sub": {
		kind: "proc",
		args: 2,
		handler: mkargchandler(2, "sub", [checklit, checklit], function(vml, fp) {

			vml[fp + 1] = {
				kind: "lit",
				val: vml[fp + 2].val - vml[fp + 3].val
			};

			return true;
		}),
	},
	"div": {
		kind: "proc",
		args: 2,
		handler: mkargchandler(2, "div", [checklit, checklit], function(vml, fp) {

			vml[fp + 1] = {
				kind: "lit",
				val: vml[fp + 2].val / vml[fp + 3].val
			};

			return true;
		}),
	},
	"mul": {
		kind: "proc",
		args: 2,
		handler: mkargchandler(2, "mul", [checklit, checklit], function(vml, fp) {

			vml[fp + 1] = {
				kind: "lit",
				val: vml[fp + 2].val * vml[fp + 3].val
			};

			return true;
		}),
	},
	"pow": {
		kind: "proc",
		args: 2,
		handler: mkargchandler(2, "pow", [checklit, checklit], function(vml, fp) {

			vml[fp + 1] = {
				kind: "lit",
				val: Math.pow(vml[fp + 2].val, vml[fp + 3].val)
			};

			return true;
		}),
	},
	"gt": {
		kind: "proc",
		args: 2,
		handler: mkargchandler(2, "gt", [checklit, checklit], function(vml, fp) {
			var v;

			v = { kind: "lit" };
			if(vml[fp + 2].val > vml[fp + 3].val)
				v.val = 1;
			else
				v.val = 0;

			vml[fp + 1] = v;

			return true;
		}),
	},
	"_sync": {
		kind: "proc",
		args: 2,
		handler: mkargchandler(2, "_sync", [], function(vml, fp) {
			vml[fp + 1] = vml[fp + 3];
			return true;
		})
	},
	"ifnil": {
		kind: "proc",
		args: 3,
		handler: mkargchandler(3, "ifnil", [], function(vml, fp) {
			var v;

			v = vml[fp + 2];
			if(v.kind == "nil") {
				vml[fp + 1] = vml[fp + 3];
			} else {
				vml[fp + 1] = vml[fp + 4];
			}

			return true;
		}),
	},
	"ifzero": {
		kind: "proc",
		args: 3,
		handler: mkargchandler(3, "ifzero", [], function(vml, fp) {
			var v;

			v = vml[fp + 2];
			if(v.kind != "lit")
				vml[fp + 1] = vml[fp + 4];
			else if(v.val == 0) {
				vml[fp + 1] = vml[fp + 3];
			} else {
				vml[fp + 1] = vml[fp + 4];
			}

			return true;
		}),
	},
	"defer": {
		kind: "proc",
		args: 1,
		handler: mkargchandler(1, "defer", [], function(vml, fp) {

			var defer_spin = function() {

				// check
				if(isitme(vml, fp + 1)) {
					// then return
					vml[fp + 1] = vml[fp + 2];
				} else {
					setTimeout(defer_spin, 1000);
				}
			};

			defer_spin();

			return true;
		})
	},
	"display": {
		kind: "proc",
		args: 1,
		handler: mkargchandler(1, "display", [], function(vml, fp) {
			arlog(pp(vml[fp + 2]));
			vml[fp + 1] = {kind: "nil"};
		})
	},
	"_cons": {
		kind: "proc",
		args: 3,
		handler: mkargchandler(3, "cons", [], function(vml, fp) {
			vml[fp + 1] = {kind: "addr", val: fp};
		})
	},
	"isnil": {
		kind: "proc",
		args: 1,
		handler: mkargchandler(1, "iscons", [], function(vml, fp) {
			if(vml[fp + 2].kind != "nil") {
				vml[fp + 1] = {kind: "lit", val: 0};
				return true;
			}
			vml[fp + 1] = {kind: "lit", val: 1};
			return true;
		})
	},
	"iscons": {
		kind: "proc",
		args: 1,
		handler: mkargchandler(1, "iscons", [], function(vml, fp) {
			if(vml[fp + 2].kind != "addr") {
				vml[fp + 1] = {kind: "lit", val: 0};
				return true;
			}
			if(vml[vml[fp + 2].val].kind != "frame") {
				vml[fp + 1] = {kind: "lit", val: 0};
				return true;
			}
			if(vml[vml[fp + 2].val].size != 4) {
				vml[fp + 1] = {kind: "lit", val: 0};
				return true;
			}
			if(vml[vml[fp + 2].val + 1].kind != "addr") {
				vml[fp + 1] = {kind: "lit", val: 0};
				return true;
			}
			if(vml[vml[fp + 2].val + 1].val != vml[fp + 2].val) {
				vml[fp + 1] = {kind: "lit", val: 0};
				return true;
			}
			if(vml[vml[fp + 2].val + 2].kind != "lit") {
				vml[fp + 1] = {kind: "lit", val: 0};
				return true;
			}
			if(vml[vml[fp + 2].val + 2].val != "cons") {
				vml[fp + 1] = {kind: "lit", val: 0};
				return true;
			}

			vml[fp + 1] = {kind: "lit", val: 1};
			return true;
		})
	},
	"car": {
		kind: "proc",
		args: 1,
		handler: mkargchandler(1, "car", [], function(vml, fp) {
			var f = vml[fp + 2];
			if(f.kind != "addr")
				return false;
			var g = vml[f.val];
			if(g.kind != "frame")
				return false;
			if(g.size != 4)
				return false;

			vml[fp + 1] = vml[f.val + 3];
		})
	},
	"cdr": {
		kind: "proc",
		args: 1,
		handler: mkargchandler(1, "cdr", [], function(vml, fp) {
			var f = vml[fp + 2];
			if(f.kind != "addr")
				return false;
			var g = vml[f.val];
			if(g.kind != "frame")
				return false;
			if(g.size != 4)
				return false;

			vml[fp + 1] = vml[f.val + 4];
		})
	},
	"get": {
		kind: "proc",
		args: 1,
		handler: mkargchandler(1, "get", [checklit], function(vml, fp) {
			var v;

			arlog("GET: " + JSON.stringify(getset_dict));
			if((v = getset_dict[vml[fp + 2].val])) {
				vml[fp + 1] = v;
			} else {
				vml[fp + 1] = { kind: "nil" };
			}

			return true;
		}),
	},
	"set": {
		kind: "proc",
		args: 2,
		handler: mkargchandler(2, "set", [checklit, checklit], function(vml, fp) {
			var v;

			v = getset_dict[vml[fp + 2].val];
			getset_dict[vml[fp + 2].val] = vml[fp + 3];

			if(v) {
				vml[fp + 1] = v;
			} else {
				vml[fp + 1] = { kind: "nil" };
			}

			return true;
		}),
	},
	"rand": {
		kind: "proc",
		args: 1,
		handler: mkargchandler(1, "rand", [checklit], function(vml, fp) {
			var v;

			v = Math.floor(Math.random() * vml[fp + 2].val);

			vml[fp + 1] = { kind: "lit", val: v };

			return true;

		})
	},
	"sqrt": {
		kind: "proc",
		args: 1,
		handler: mkargchandler(1, "sqrt", [checklit], function(vml, fp) {
			var v;

			v = Math.sqrt(vml[fp + 2].val);

			vml[fp + 1] = { kind: "lit", val: v };

			return true;

		})
	},
	"sin": {
		kind: "proc",
		args: 1,
		handler: mkargchandler(1, "sin", [checklit], function(vml, fp) {
			var v;

			v = Math.sin(vml[fp + 2].val);

			vml[fp + 1] = { kind: "lit", val: v };

			return true;
		})
	},
	"cos": {
		kind: "proc",
		args: 1,
		handler: mkargchandler(1, "cos", [checklit], function(vml, fp) {
			var v;

			v = Math.cos(vml[fp + 2].val);

			vml[fp + 1] = { kind: "lit", val: v };

			return true;
		})
	},
	"tan": {
		kind: "proc",
		args: 1,
		handler: mkargchandler(1, "tan", [checklit], function(vml, fp) {
			var v;

			v = Math.tan(vml[fp + 2].val);

			vml[fp + 1] = { kind: "lit", val: v };

			return true;
		})
	},
	"atan": {
		kind: "proc",
		args: 1,
		handler: mkargchandler(1, "atan", [checklit], function(vml, fp) {
			var v;

			v = Math.atan(vml[fp + 2].val);

			vml[fp + 1] = { kind: "lit", val: v };

			return true;
		})
	},
	"acos": {
		kind: "proc",
		args: 1,
		handler: mkargchandler(1, "acos", [checklit], function(vml, fp) {
			var v;

			v = Math.acos(vml[fp + 2].val);

			vml[fp + 1] = { kind: "lit", val: v };

			return true;

		})
	},
	"asin": {
		kind: "proc",
		args: 1,
		handler: mkargchandler(1, "asin", [checklit], function(vml, fp) {
			var v;

			v = Math.asin(vml[fp + 2].val);

			vml[fp + 1] = { kind: "lit", val: v };

			return true;

		})
	},
	"floor": {
		kind: "proc",
		args: 1,
		handler: mkargchandler(1, "floor", [checklit], function(vml, fp) {
			vml[fp + 1] = { kind: "lit", val: Math.floor(vml[fp + 2].val) };
		})
	},
	"delay": {
		kind: "proc",
		args: 1,
		handler: mkargchandler(1, "delay", [checklit], function(vml, fp) {
			setTimeout(function() {
				vml[fp + 1] = { kind: "lit", val: 1};
			}, vml[fp + 2].val);

			return true;
		})
	}
};

var isitme = function(vml, addr) {
	var x;

	//vmlog(vml, "isitme?: " + addr);

	if(!vml.length)
		return false;

	for(x = vml.length - 1 ; x >= 0 ; x--) {
		if(vml[x].kind == "log") continue;
		if(vml[x].kind == "deferred") {
			//vmlog(vml, "aha! A deferred: " + JSON.stringify(vml[x]));
			if(vml[x].blocked == addr && !vml[x].completed) {
				//vmlog(vml, "and it is me.");
				return true;
			}
		}
		break;
	}

	return false;
};
