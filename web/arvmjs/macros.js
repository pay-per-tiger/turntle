/* define from toplevel.
		if((exp.val[0].kind == "symbol") && symeq(exp.val[0], "define")) {
			//arlog('got a top-level define');
			if(exp.val[1].kind != "symbol") {
				arlog("define takes a symbol");
				return false;
			}

			var v;
			v = macro_expand(exp.val[2], syms);
			if(!v || (v.kind == "error")) {
				return v;
			}

			var rewrite = function(e) {
				//arlog('rewriting: ' + pp(e));
				if((e.kind == "symbol") && (e.val == exp.val[1].val)) {
					return {kind: "list", val: [ e, e ]};
				} else if(e.kind != "list") {
					return e;
				} else if(e.val.length == 0) {
					return e;
				} else if((e.val[0].kind == "symbol") && (e.val[0].val == "lambda") && (e.val[1].kind == "symbol") && (e.val[1].val == exp.val[1].val)) {
					// lambda that aliases us
					return e;
				} else {
					var acc = [];
					var x;
					for(x = 0 ; x < e.val.length ; x++) {
						acc.push(rewrite(e.val[x]));
					}
					return {kind:"list", val: acc};
				}
			}

			// there is no need to do this rewriting
			// unless the body references the name.

			v = rewrite(v);
			v = {kind:"list", val: [
				{kind: "list", val: [
					{kind: "symbol", val: "lambda"},
					{kind: "symbol", val: "v"},
					{kind: "list", val: [
						{kind: "symbol", val: "v"},
						{kind: "symbol", val: "v"}
					]}
				]},
				{kind: "list", val: [
					{kind: "symbol", val: "lambda"},
					exp.val[1],
					v
				]}
			]}

			tl.push([exp.val[1].val, v]);

			return {kind: "list", val: []};
		} else {
			return wrap_toplevel(tl, exp);
		}
*/

var ml = function(v) {
	return {kind: "list", val: v };
};

var mnil = {kind: "list", val: [] };

var mksym = function(name) {
	return { kind: "symbol", val: name };
};

var mknum = function(val) {
	return { kind: "number", val: val };
};

var mkstr = function(val) {
	return { kind: "string", val: val };
};

var symeq = function(val, name) {
	//arlog("checking: " + JSON.stringify(val) + " against " + name);
	if((val.kind == "symbol") && (val.val == name)) {
		//arlog("matched " + name);
		return true;
	} else {
		return false;
	}
};

macro_table = {};

macro_table["begin"] = function(exp, syms) {

	if(exp.val.length == 1) {
			return ml([]);
	} else if(exp.val.length == 2) {
		var v;
		v = macro_expand(exp.val[1], syms);
		return v;
	} else {
		var acc, x, v;

		acc = ml([mksym("lambda"), mksym("z"), mksym("z")]);

		for(x = 2; x < exp.val.length ; x++) {
			acc = ml([mksym("lambda"), mksym("ZZZ"), acc ]);
		}

		for(x = 1 ; x < exp.val.length ; x++) {
			v = macro_expand(exp.val[x], syms);
			if(!v || (v.kind == "error")) {
				return v;
			}
			acc = ml([acc, v]);
		}

		return acc;
	}
};

macro_table["quote"] = function(exp, syms) {
	var acc = ml([]);

	for(x = 1 ; x < exp.val.length ; x++) {
		acc = ml([ mksym("_cons"), mkstr("cons"), exp.val[exp.val.length - x], acc]); 
	}

	return acc;
};

macro_table["sync"] = function(exp, syms) {
	if(exp.val.length == 1) {
		return ml([]);
	} else if(exp.val.length == 2) {
		var v;
		v = macro_expand(exp.val[1], syms);
		return v;
	} else {
		var acc, x, v;

		v = macro_expand(exp.val[exp.val.length - 1], syms);
		if(!v || (v.kind == "error")) {
			return v;
		}

		// acc is always a lambda that wants to be called with nil
		acc = ml([
			mksym("lambda"),
			mksym("ZZZ"),
			v
		]);

		for(x = 2 ; x < exp.val.length ; x++) {
			v = macro_expand(exp.val[exp.val.length - x], syms);
			if(!v || (v.kind == "error")) {
				return v;
			}
			acc = ml([
				mksym("lambda"),
				mksym("ZZZ"),
				ml([ml([
					mksym("_sync"),
					v,
					acc
				]), mnil])
			])
		}

		acc = ml([
			acc,
			mnil
		]);

		return acc;
	}
}

macro_table["do"] = function(exp, syms) {
	var v1, v2;

	if(exp.val.length < 3) {
		return {
			kind: "error",
			msg: "do requires 2 arguments",
			exp: exp
		}
	}

	v1 = macro_expand(exp.val[1], syms);
	v2 = macro_expand(exp.val[2], syms);

	if(v1.kind == "number") {
		var v, x;
		if(v1.val == 0)
			return mnil;

		//v = ml([mksym("begin")]);
		v = ml([mksym("sync")]);
		for(x = 0 ; x < v1.val ; x++) {
			v.val.push(v2);
		}
		return macro_expand(v, syms);
	} else {
		var comb = ml([
			ml([mksym("lambda"), mksym("p"),
				ml([ ml([ mksym("p"), mksym("p") ]), v1])
			]),
			ml([mksym("lambda"), mksym("p"), ml([mksym("lambda"), mksym("NNN"),
				ml([ ml([mksym("ifzero"),
					mksym("NNN"),
					ml([mksym("lambda"), mksym("ZZZ"),
						mnil
					]),
					ml([
						mksym("lambda"),
						mksym("ZZZ"),
						ml([
							ml([mksym("_sync"), v2, ml([mksym("p"), mksym("p")])]),
							ml([mksym("sub"), mksym("NNN"), mknum(1)])
						])
						/* ml([
							ml([
								mksym("lambda"),
								mksym("ZZ_effect_capture"),
								ml([
									ml([mksym("p"), mksym("p")]),
									ml([mksym("sub"),
										mksym("NNN"),
										mknum(1)
									])
								])
							]),
							v2
						]) */
					])
				]), mnil])
			]) ])
		]);
		return comb;
	}
	return macro_expand(exp, syms);
};

macro_table["if"] = function(exp, syms) {
	var v1, v2, v3;

	if(exp.val.length < 4) {
		return {
			kind: "error",
			msg: "if requires 3 arguments, given " + (exp.val.length - 1),
			exp: exp
		};
	}
	if(exp.val.length > 4) {
		return {
			kind: "error",
			msg: "if requires 3 arguments, given " + (exp.val.length - 1),
			exp: exp
		};
	}

	v1 = macro_expand(exp.val[1], syms);
	if(!v1 || (v1.kind == "error")) {
		return v1;
	}
	v2 = macro_expand(exp.val[3], syms);
	if(!v2 || (v2.kind == "error")) {
		return v2;
	}
	v3 = macro_expand(exp.val[2], syms);
	if(!v3 || (v3.kind == "error")) {
		return v3;
	}
	return ml([
		ml([mksym("ifzero"),
			v1,
			ml([
				mksym("lambda"),
				mksym("ZZZ"),
				v2
			]),
			ml([
				mksym("lambda"),
				mksym("ZZZ"),
				v3
			])
		]),
		ml([])
	]);
}

lambda_macro_expand = function(exp, idx, syms) {
	if(idx >= exp.val.length) {
		return {
			kind: "error",
			msg: "gone off the edge",
			exp: exp
		};
	}

	if(	(exp.val[idx].kind == "list") &&
		(exp.val[idx].val.length == 3) &&
		(exp.val[idx].val[0].kind == "symbol") &&
		(exp.val[idx].val[0].val == "define")) {

		if((idx + 1) == exp.val.length) {
			return [
				{ kind: "error", msg: "define without statement", exp: exp },
				idx
			];
		}

		// expand the rest of the block
		var v2;
		v2 = lambda_macro_expand(exp, idx + 1, syms);
		if(!v2 || (v2[0].kind == "error")) {
			return v2;
		}

		// and the body of the define
		var v3;
		v3 = lambda_macro_expand(exp.val[idx], 2, syms);
		if(!v3 || (v3[0].kind == "error")) {
			return v3;
		}

		v = ml([
			ml([
				mksym("lambda"),
				exp.val[idx].val[1],
				v2[0]
			]),
			v3[0]
		]);

		//arlog("expanded into: " + pp(v));

		return [
			v,
			v2[1]
		];
	} else {

		var v;
		v = macro_expand(exp.val[idx], syms);

		return [
			v,
			idx + 1
		];
	}
};

macro_table["define"] = function(exp, syms) {
	return {
		kind: "error",
		msg: "cannot use define here",
		exp: exp
	};
};

macro_table["lambda"] = function(exp, syms) {
	var v;

	//arlog("expanding a lambda");

	if(exp.val.length < 3) {
		return {
			kind: "error",
			msg: "lambda requires 2 arguments",
			exp: exp
		};
	}

	//arlog("macro_expand: got a lambda: " + pp(exp));

	if(exp.val[1].kind == "symbol") {
		v = lambda_macro_expand(exp, 2, syms);
		if(!v || (v[0].kind == "error")) {
			return v[0];
		}

		return ml([ exp.val[0], exp.val[1], v[0] ]);
	} else if(exp.val[1].kind != "list") {
		return {
			kind: "error",
			msg: "lambda unknown prototype",
			exp: exp
		};
	} else if(exp.val[1].val.length == 0) {
		//arlog("thunk");
		v = lambda_macro_expand(exp, 2, syms);
		if(!v || (v[0].kind == "error")) {
			return v[0];
		}

		return ml([ exp.val[0], mksym("ZZZ"), v[0] ]);
	} else if(exp.val[1].val.length == 1) {
		//arlog("1-list");
		v = lambda_macro_expand(exp, 2, syms);
		if(!v || (v[0].kind == "error")) {
			return v[0];
		}

		return ml([ mksym("lambda"), exp.val[1].val[0], v[0] ]);
	} else {
		//arlog("macro_expand: curry!");
		var new_args = ml([]), x;

		for(x = 1 ; x < exp.val[1].val.length ; x++) {
			new_args.val.push(exp.val[1].val[x]);
		}

		var v2;

		v2 = lambda_macro_expand(exp, 2, syms);
		if(!v2 || v2[0].kind == "error") {
			return v2[0];
		}

		v = macro_expand(ml([
			mksym("lambda"),
			new_args,
			v2[0],
		]), syms);

		if(!v || (v.kind == "error")) {
			return v;
		}

		return ml([
			exp.val[0],
			exp.val[1].val[0],
			v
		]);
	}
}

macro_expand = function(exp, syms) {
	if(!syms) {
		arlog('macro_expand requires a list of symbols');
		return false;
	}

	//arlog("macro_expand: expanding: " + pp(exp));

	if(exp.kind && (exp.kind != "list")) {
		return exp;
	} else if(exp.kind == "list") {
		if(exp.val.length > 0) {
			//arlog("going to check: " + pp(exp.val[0]));
		}

		if(exp.val.length == 0) {
			return exp;
		} else if((exp.val[0].kind == "symbol") && macro_table[exp.val[0].val]) {
			return macro_table[exp.val[0].val](exp, syms);
		} else {

			if(syms[exp.val[0].val]) {
				//arlog("macro_expand: symbol");
				var acc = ml([]);
				acc.start_idx = exp.start_idx;
				acc.end_idx = exp.end_idx;
				var v;
				for(x = 0 ; x < exp.val.length ; x++) {
					v = macro_expand(exp.val[x], syms);
					if(!v || (v.kind == "error")) {
						return v;
					}
					acc.val.push(v);
				}

				return acc;
			} else {
				//arlog("macro_expand: apply");
				if(exp.val.length == 1) {
					//arlog('macro_expand: thunk call');
					v = macro_expand(exp.val[0], syms);
					if(!v || (v.kind == "error")) {
						return v;
					}
					var acc = ml([exp.val[0], ml([])]);
					acc.start_idx = exp.start_idx;
					acc.end_idx = exp.end_idx;
					return acc;
				} else if(exp.val.length == 2) {
					//arlog("macro_expand: apply");
					var acc = ml([]), v;
					acc.start_idx = exp.start_idx;
					acc.end_idx = exp.end_idx;
					for(x = 0 ; x < exp.val.length ; x++) {
						v = macro_expand(exp.val[x], syms);
						if(!v || (v.kind == "error")) {
							return v;
						}
						acc.val.push(v);
					}

					return acc;
				} else {
					var acc, v, x;

					//arlog('macro_expand: multi-apply: ' + pp(exp));

					v = macro_expand(exp.val[0], syms);
					if(!v || (v.kind == "error")) {
						return v;
					}
					acc = v;

					for(x = 1 ; x < exp.val.length ; x++) {
						v = macro_expand(exp.val[x], syms);
						if(!v || (v.kind == "error")) {
							return v;
						}
						acc = ml([ acc, v ]);
						acc.start_idx = exp.start_idx;
						acc.end_idx = exp.end_idx;
					}

					return acc;
				}
			}
		}
		return exp;
	} else {
		return exp;
	}
};
